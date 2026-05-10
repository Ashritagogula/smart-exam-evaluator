import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js";
import { createUser, tokenFor } from "../helpers.js";

// Silence OCR imports for routes pulled in by app.js
vi.mock("../../services/ocr.service.js", () => ({
  convertPDFToImages: vi.fn(),
  filterUsefulImages: vi.fn(),
  evaluateWithGemini: vi.fn(),
  cleanupFiles: vi.fn(),
}));
vi.mock("../../services/notification.service.js", () => ({
  sendStudentNotification: vi.fn(),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

const token = async (role) => {
  const user = await createUser(role);
  return `Bearer ${tokenFor(user)}`;
};

// ── Unauthenticated access ────────────────────────────────────────────────────

describe("Unauthenticated requests return 401", () => {
  const protectedEndpoints = [
    ["GET",   "/api/exam-events"],
    ["POST",  "/api/exam-events"],
    ["GET",   "/api/faculty"],
    ["GET",   "/api/cie-marks"],
    ["POST",  "/api/cie-marks/compute"],
  ];

  it.each(protectedEndpoints)(
    "%s %s → 401 without token",
    async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    }
  );
});

// ── Exam events — only admin/examcell can create ──────────────────────────────

describe("POST /api/exam-events — role-based authorization", () => {
  const payload = {
    examType: "IE1",
    type: "IE1",
    status: "upcoming",
    college: new mongoose.Types.ObjectId(),
    department: new mongoose.Types.ObjectId(),
    semester: new mongoose.Types.ObjectId(),
  };

  it("allows admin to create an exam event", async () => {
    const res = await request(app)
      .post("/api/exam-events")
      .set("Authorization", await token("admin"))
      .send(payload);

    // Any non-auth error (201 success, 400 validation, 500 DB) proves auth passed
    expect([201, 400, 500]).toContain(res.status);
  });

  it("allows examcell to create an exam event", async () => {
    const res = await request(app)
      .post("/api/exam-events")
      .set("Authorization", await token("examcell"))
      .send(payload);

    expect([201, 400, 500]).toContain(res.status);
  });

  it("denies faculty from creating an exam event (403)", async () => {
    const res = await request(app)
      .post("/api/exam-events")
      .set("Authorization", await token("faculty"))
      .send(payload);

    expect(res.status).toBe(403);
  });

  it("denies student from creating an exam event (403)", async () => {
    const res = await request(app)
      .post("/api/exam-events")
      .set("Authorization", await token("student"))
      .send(payload);

    expect(res.status).toBe(403);
  });
});

// ── Faculty creation — only admin/hod can create ─────────────────────────────

describe("POST /api/faculty — role-based authorization", () => {
  const payload = {
    employeeId: `EMP-${Date.now()}`,
    name: "New Faculty",
    email: `new-${Date.now()}@test.com`,
    primaryRole: "faculty",
  };

  it("allows admin to create a faculty member", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", await token("admin"))
      .send(payload);

    expect([201, 500]).toContain(res.status);
  });

  it("allows hod to create a faculty member", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", await token("hod"))
      .send({ ...payload, employeeId: `EMP-HOD-${Date.now()}`, email: `hod-${Date.now()}@test.com` });

    expect([201, 500]).toContain(res.status);
  });

  it("denies faculty from creating a faculty member (403)", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", await token("faculty"))
      .send(payload);

    expect(res.status).toBe(403);
  });

  it("denies student from creating a faculty member (403)", async () => {
    const res = await request(app)
      .post("/api/faculty")
      .set("Authorization", await token("student"))
      .send(payload);

    expect(res.status).toBe(403);
  });
});

// ── Internal eval — freeze requires faculty/subject_coordinator/hod ──────────

describe("POST /api/internal-eval/booklet/:id/freeze — role authorization", () => {
  const fakeId = new mongoose.Types.ObjectId();

  it("denies student from freezing a booklet (403)", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${fakeId}/freeze`)
      .set("Authorization", await token("student"))
      .send({});

    expect(res.status).toBe(403);
  });

  it("denies examcell from freezing a booklet (403)", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${fakeId}/freeze`)
      .set("Authorization", await token("examcell"))
      .send({});

    expect(res.status).toBe(403);
  });

  it("allows faculty to attempt freeze (reaches business logic, not auth check)", async () => {
    const res = await request(app)
      .post(`/api/internal-eval/booklet/${fakeId}/freeze`)
      .set("Authorization", await token("faculty"))
      .send({});

    // 403 from role → fail; any other status means auth passed
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});

// ── PATCH exam-event status — admin/examcell/dce/ce only ─────────────────────

describe("PATCH /api/exam-events/:id/status — role authorization", () => {
  const fakeId = new mongoose.Types.ObjectId();

  it("denies faculty from changing exam event status (403)", async () => {
    const res = await request(app)
      .patch(`/api/exam-events/${fakeId}/status`)
      .set("Authorization", await token("faculty"))
      .send({ status: "completed" });

    expect(res.status).toBe(403);
  });

  it("denies student from changing exam event status (403)", async () => {
    const res = await request(app)
      .patch(`/api/exam-events/${fakeId}/status`)
      .set("Authorization", await token("student"))
      .send({ status: "completed" });

    expect(res.status).toBe(403);
  });

  it("allows dce to change exam event status (reaches business logic)", async () => {
    const res = await request(app)
      .patch(`/api/exam-events/${fakeId}/status`)
      .set("Authorization", await token("dce"))
      .send({ status: "completed" });

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
