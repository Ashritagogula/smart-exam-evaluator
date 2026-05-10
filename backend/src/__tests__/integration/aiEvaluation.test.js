import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import AIEvaluation from "../../models/AIEvaluation.js";
import AnswerBooklet from "../../models/AnswerBooklet.js";
import { BOOKLET_STATUS } from "../../config/constants.js";
import {
  createUser, tokenFor, createFaculty, createStudent,
  createSubject, createExamEvent, createAnswerBooklet,
} from "../helpers.js";

// Mock the OCR/PDF pipeline — avoids real file I/O and Gemini API calls
vi.mock("../../services/ocr.service.js", () => ({
  convertPDFToImages: vi.fn().mockResolvedValue([]),
  filterUsefulImages: vi.fn().mockReturnValue([]),
  evaluateWithGemini: vi.fn().mockResolvedValue({
    totalMarks: 36,
    maxMarks: 50,
    questionWise: [
      { question: "Q1", maxMarks: 10, marksAwarded: 8, status: "answered", feedback: "Good" },
      { question: "Q2", maxMarks: 10, marksAwarded: 7, status: "answered", feedback: "Adequate" },
    ],
    strengths: ["Clear explanation"],
    weaknesses: ["Lacks depth in Q3"],
    suggestions: ["Elaborate on key concepts"],
    mistakes: [],
  }),
  cleanupFiles: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/internal-eval/booklet/:id/ai-evaluate", () => {
  let token, booklet;

  beforeEach(async () => {
    const faculty = await createFaculty();
    const user = await createUser("faculty", { roleRef: faculty._id });
    token = tokenFor(user);

    const student = await createStudent();
    const subject = await createSubject();
    const examEvent = await createExamEvent();
    booklet = await createAnswerBooklet(student._id, subject._id, examEvent._id, {
      status: BOOKLET_STATUS.PENDING,
      fileUrl: "/uploads/test.pdf",
    });
  });

  it("creates an AIEvaluation record and returns it", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalMarks", 36);
    expect(res.body).toHaveProperty("maxMarks", 50);
    expect(Array.isArray(res.body.questionWiseMarks)).toBe(true);
    expect(res.body.questionWiseMarks).toHaveLength(2);
  });

  it("persists the AI evaluation to the database", async () => {
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const saved = await AIEvaluation.findOne({ booklet: booklet._id });
    expect(saved).not.toBeNull();
    expect(saved.totalMarks).toBe(36);
    expect(saved.strengths).toEqual(["Clear explanation"]);
  });

  it("updates the booklet status to ai_evaluated", async () => {
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const updated = await AnswerBooklet.findById(booklet._id);
    expect(updated.status).toBe(BOOKLET_STATUS.AI_EVALUATED);
  });

  it("upserts — re-running AI evaluate overwrites the previous result", async () => {
    const { evaluateWithGemini } = await import("../../services/ocr.service.js");

    // First pass
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // Second pass with different mocked total
    evaluateWithGemini.mockResolvedValueOnce({ totalMarks: 42, maxMarks: 50, questionWise: [], strengths: [], weaknesses: [], suggestions: [], mistakes: [] });

    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const count = await AIEvaluation.countDocuments({ booklet: booklet._id });
    expect(count).toBe(1); // exactly one record — upserted, not duplicated

    const saved = await AIEvaluation.findOne({ booklet: booklet._id });
    expect(saved.totalMarks).toBe(42);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/ai-evaluate`)
      .send({});

    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent booklet ID", async () => {
    const fakeId = new (await import("mongoose")).default.Types.ObjectId();
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${fakeId}/ai-evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);
  });
});
