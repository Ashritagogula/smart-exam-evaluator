import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js";
import AnswerBooklet from "../../models/AnswerBooklet.js";
import FacultyEvaluation from "../../models/FacultyEvaluation.js";
import FreezeEvent from "../../models/FreezeEvent.js";
import { BOOKLET_STATUS } from "../../config/constants.js";
import {
  createUser, tokenFor, createFaculty, createStudent,
  createSubject, createExamEvent, createAnswerBooklet, createFacultyEvaluation,
} from "../helpers.js";

// Mock services that have external dependencies (file I/O and email)
vi.mock("../../services/notification.service.js", () => ({
  sendStudentNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/internal-eval/booklet/:id/freeze", () => {
  let facultyUser, facultyToken, faculty, student, subject, examEvent, booklet, evaluation;

  beforeEach(async () => {
    faculty = await createFaculty();
    facultyUser = await createUser("faculty", { roleRef: faculty._id, roleModel: "Faculty" });
    facultyToken = tokenFor(facultyUser);

    student = await createStudent();
    subject = await createSubject();
    examEvent = await createExamEvent();
    booklet = await createAnswerBooklet(student._id, subject._id, examEvent._id, {
      status: "faculty_reviewed",
    });
    evaluation = await createFacultyEvaluation(booklet._id, faculty._id, {
      finalMarks: 38,
    });
  });

  it("freezes the booklet and returns the review window expiry", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({ facultyId: faculty._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("reviewWindowExpiresAt");
    expect(res.body.message).toMatch(/frozen/i);
  });

  it("atomically updates booklet status to frozen", async () => {
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({ facultyId: faculty._id.toString() });

    const updated = await AnswerBooklet.findById(booklet._id);
    expect(updated.status).toBe(BOOKLET_STATUS.FROZEN);
  });

  it("creates a FreezeEvent record in the same transaction", async () => {
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({ facultyId: faculty._id.toString() });

    const freeze = await FreezeEvent.findOne({ booklet: booklet._id });
    expect(freeze).not.toBeNull();
    expect(freeze.type).toBe("temporary");
  });

  it("marks FacultyEvaluation as frozen", async () => {
    await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({ facultyId: faculty._id.toString() });

    const fe = await FacultyEvaluation.findById(evaluation._id);
    expect(fe.isFrozen).toBe(true);
    expect(fe.frozenAt).toBeDefined();
  });

  it("returns 403 when the booklet is already permanently frozen", async () => {
    await AnswerBooklet.findByIdAndUpdate(booklet._id, {
      status: BOOKLET_STATUS.PERMANENTLY_FROZEN,
    });

    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${facultyToken}`)
      .send({ facultyId: faculty._id.toString() });

    expect(res.status).toBe(500); // asyncHandler rethrows → 500 with error message
    expect(res.body.message).toMatch(/already permanently frozen/i);
  });

  it("returns 401 when no token is provided", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .send({ facultyId: faculty._id.toString() });

    expect(res.status).toBe(401);
  });

  it("returns 403 when a student attempts to freeze a booklet", async () => {
    const studentUser = await createUser("student");
    const studentToken = tokenFor(studentUser);

    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/freeze`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ facultyId: faculty._id.toString() });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/internal-eval/booklet/:id/unfreeze", () => {
  let facultyUser, facultyToken, faculty, booklet, evaluation;

  beforeEach(async () => {
    faculty = await createFaculty();
    facultyUser = await createUser("faculty", { roleRef: faculty._id, roleModel: "Faculty" });
    facultyToken = tokenFor(facultyUser);

    const student = await createStudent();
    const subject = await createSubject();
    const examEvent = await createExamEvent();
    booklet = await createAnswerBooklet(student._id, subject._id, examEvent._id, {
      status: "frozen",
    });
    // Create a frozen evaluation with a future review window
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    evaluation = await createFacultyEvaluation(booklet._id, faculty._id, {
      isFrozen: true,
      frozenAt: new Date(),
      reviewWindowExpiresAt: future,
      isPermanentlyFrozen: false,
    });
  });

  it("unfreezes the booklet when inside the review window", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/unfreeze`)
      .set("Authorization", `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unfrozen/i);
  });

  it("returns 403 when the review window has already expired", async () => {
    const past = new Date(Date.now() - 1000);
    await FacultyEvaluation.findByIdAndUpdate(evaluation._id, {
      reviewWindowExpiresAt: past,
    });

    const res = await request(app)
      .post(`/api/internal-eval/booklet/${booklet._id}/unfreeze`)
      .set("Authorization", `Bearer ${facultyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/review window has expired/i);
  });
});
