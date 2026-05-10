import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../app.js";
import CIEMarks from "../../models/CIEMarks.js";
import { createUser, tokenFor, createStudent, createSubject } from "../helpers.js";

const authHeaders = async (role = "admin") => {
  const user = await createUser(role);
  return { Authorization: `Bearer ${tokenFor(user)}` };
};

describe("CIE Marks — POST /api/cie-marks/compute", () => {
  let subject, headers;

  beforeEach(async () => {
    subject = await createSubject();
    headers = await authHeaders("examcell");
  });

  it("computes cieTheory and totalCIE for all students in a subject", async () => {
    const st1 = await createStudent();
    const st2 = await createStudent();

    const fakeAY = new mongoose.Types.ObjectId();
    const fakeSem = new mongoose.Types.ObjectId();

    // Seed raw IE marks — route reads these and recomputes
    await CIEMarks.create([
      {
        student: st1._id, subject: subject._id,
        academicYear: fakeAY, semester: fakeSem,
        "IE1.marks": 40, "IE2.marks": 30,
        "LA.marks": 5,  "DDA.marks": 3,  "LT.marks": 2,
      },
      {
        student: st2._id, subject: subject._id,
        academicYear: fakeAY, semester: fakeSem,
        "IE1.marks": 50, "IE2.marks": 50,
        "LA.marks": 0,   "DDA.marks": 0,  "LT.marks": 0,
      },
    ]);

    const res = await request(app)
      .post("/api/cie-marks/compute")
      .set(headers)
      .send({ subjectId: subject._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/2 students/i);

    const updated1 = await CIEMarks.findOne({ student: st1._id, subject: subject._id });
    // computeCIETheory(40,30) = 22.8; totalCIE = 22.8 + 5 + 3 + 2 = 32.8
    expect(updated1.cieTheory).toBe(22.8);
    expect(updated1.totalCIE).toBe(32.8);

    const updated2 = await CIEMarks.findOne({ student: st2._id, subject: subject._id });
    // computeCIETheory(50,50) = 30; totalCIE = 30
    expect(updated2.cieTheory).toBe(30);
    expect(updated2.totalCIE).toBe(30);
  });

  it("returns 0 computed when subject has no CIE records", async () => {
    const res = await request(app)
      .post("/api/cie-marks/compute")
      .set(headers)
      .send({ subjectId: subject._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/0 students/i);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app)
      .post("/api/cie-marks/compute")
      .send({ subjectId: subject._id.toString() });

    expect(res.status).toBe(401);
  });
});

describe("CIE Marks — GET /api/cie-marks", () => {
  it("lists CIE marks filtered by student", async () => {
    const student = await createStudent();
    const subject = await createSubject();
    const headers = await authHeaders();

    await CIEMarks.create({
      student: student._id, subject: subject._id,
      academicYear: new mongoose.Types.ObjectId(),
      semester: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .get("/api/cie-marks")
      .query({ student: student._id.toString() })
      .set(headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });
});

describe("CIE Marks — PUT /api/cie-marks/student/:sid/subject/:subid", () => {
  it("updates LA/DDA/LT and recomputes totalCIE", async () => {
    const student = await createStudent();
    const subject = await createSubject();
    const headers = await authHeaders();

    await CIEMarks.create({
      student: student._id, subject: subject._id,
      academicYear: new mongoose.Types.ObjectId(),
      semester: new mongoose.Types.ObjectId(),
      "IE1.marks": 40, "IE2.marks": 30,
    });

    const res = await request(app)
      .put(`/api/cie-marks/student/${student._id}/subject/${subject._id}`)
      .set(headers)
      .send({
        LA:  { marks: 5 },
        DDA: { marks: 3 },
        LT:  { marks: 2 },
      });

    expect(res.status).toBe(200);
    // cieTheory = computeCIETheory(40,30) = 22.8; totalCIE = 22.8 + 5 + 3 + 2 = 32.8
    expect(res.body.cieTheory).toBe(22.8);
    expect(res.body.totalCIE).toBe(32.8);
  });
});
