import { describe, it, expect } from "vitest";
import { computeResultHash } from "../../services/blockchain.service.js";

const baseResult = {
  student:      { rollNumber: "21CS001" },
  subject:      { courseCode: "CS601" },
  academicYear: { year: "2024-25" },
  semester:     { number: 6 },
  grandTotal:   78,
  grade:        "A",
  gradePoints:  8,
  isPassed:     true,
  declaredAt:   new Date("2025-05-01T00:00:00.000Z"),
};

describe("computeResultHash", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = computeResultHash(baseResult);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same input always produces the same hash", () => {
    expect(computeResultHash(baseResult)).toBe(computeResultHash(baseResult));
  });

  it("produces a different hash when roll number changes", () => {
    const modified = { ...baseResult, student: { rollNumber: "21CS002" } };
    expect(computeResultHash(baseResult)).not.toBe(computeResultHash(modified));
  });

  it("produces a different hash when grand total changes", () => {
    const modified = { ...baseResult, grandTotal: 79 };
    expect(computeResultHash(baseResult)).not.toBe(computeResultHash(modified));
  });

  it("produces a different hash when grade changes", () => {
    const modified = { ...baseResult, grade: "A+", gradePoints: 9 };
    expect(computeResultHash(baseResult)).not.toBe(computeResultHash(modified));
  });

  it("produces a different hash when isPassed flips", () => {
    const modified = { ...baseResult, isPassed: false };
    expect(computeResultHash(baseResult)).not.toBe(computeResultHash(modified));
  });

  it("handles missing optional fields gracefully without throwing", () => {
    const minimal = { grandTotal: 50, grade: "C", gradePoints: 5, isPassed: true };
    expect(() => computeResultHash(minimal)).not.toThrow();
  });
});
