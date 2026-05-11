import { describe, it, expect } from "vitest";
import { getGrade } from "../../services/marks.service.js";

// ── Revaluation marks computation helpers ────────────────────────────────────
// Mirrors the averaging logic in revaluation.routes.js declare endpoint

function computeFinalRevalMarks(originalMarks, secondMarks, thirdMarks) {
  const marks = [originalMarks, secondMarks, thirdMarks].filter(
    (m) => m !== undefined && m !== null
  );
  return Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 100) / 100;
}

function requiresThirdEvaluator(originalMarks, secondMarks, threshold = 10) {
  return Math.abs(secondMarks - originalMarks) > threshold;
}

// ── computeFinalRevalMarks ────────────────────────────────────────────────────

describe("computeFinalRevalMarks", () => {
  it("averages original and second evaluator marks when no third evaluator", () => {
    expect(computeFinalRevalMarks(40, 50, undefined)).toBe(45);
  });

  it("averages all three evaluators when third is assigned", () => {
    expect(computeFinalRevalMarks(40, 60, 50)).toBe(50);
  });

  it("returns original marks unchanged when only one set of marks exists", () => {
    expect(computeFinalRevalMarks(38, undefined, undefined)).toBe(38);
  });

  it("rounds to 2 decimal places", () => {
    // (35 + 40) / 2 = 37.5
    expect(computeFinalRevalMarks(35, 40, undefined)).toBe(37.5);
  });

  it("handles zero marks correctly", () => {
    expect(computeFinalRevalMarks(0, 0, 0)).toBe(0);
  });
});

// ── requiresThirdEvaluator ───────────────────────────────────────────────────

describe("requiresThirdEvaluator", () => {
  it("returns true when variance exceeds 10 marks", () => {
    expect(requiresThirdEvaluator(30, 45)).toBe(true);
  });

  it("returns false when variance is exactly 10 marks", () => {
    expect(requiresThirdEvaluator(30, 40)).toBe(false);
  });

  it("returns false when variance is below threshold", () => {
    expect(requiresThirdEvaluator(30, 35)).toBe(false);
  });

  it("handles negative direction variance (second evaluator gives fewer marks)", () => {
    expect(requiresThirdEvaluator(50, 35)).toBe(true);
  });

  it("returns false when both marks are equal", () => {
    expect(requiresThirdEvaluator(42, 42)).toBe(false);
  });
});

// ── Grade assignment after revaluation ───────────────────────────────────────

describe("grade assignment after revaluation", () => {
  it("upgrades grade when final marks improve", () => {
    const before = getGrade(44, 100); // F
    const after  = getGrade(50, 100); // C
    expect(before.grade).toBe("F");
    expect(after.grade).toBe("C");
    expect(after.gradePoints).toBeGreaterThan(before.gradePoints);
  });

  it("marks isPassed true when gradePoints > 0 after upgrade", () => {
    const { gradePoints } = getGrade(50, 100);
    expect(gradePoints).toBeGreaterThan(0);
  });

  it("keeps isPassed false when revaluation result is still failing", () => {
    const { gradePoints } = getGrade(40, 100);
    expect(gradePoints).toBe(0);
  });
});
