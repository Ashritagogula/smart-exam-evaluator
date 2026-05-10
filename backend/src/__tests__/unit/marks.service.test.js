import { describe, it, expect } from "vitest";
import { computeCIETheory, scaleSEEMarks, getGrade } from "../../services/marks.service.js";

describe("computeCIETheory", () => {
  it("applies 80/20 weighting to higher/lower IE and scales to 30", () => {
    // higher=40, lower=30 → raw=38 → (38/50)*30 = 22.8
    expect(computeCIETheory(40, 30)).toBe(22.8);
  });

  it("returns 30 when both IEs are full marks (50)", () => {
    expect(computeCIETheory(50, 50)).toBe(30);
  });

  it("returns 0 when both IEs are 0", () => {
    expect(computeCIETheory(0, 0)).toBe(0);
  });

  it("is symmetric — order of arguments does not change the result", () => {
    expect(computeCIETheory(30, 40)).toBe(computeCIETheory(40, 30));
  });

  it("handles maximum divergence — one IE full, other zero", () => {
    // higher=50, lower=0 → raw=40 → (40/50)*30 = 24
    expect(computeCIETheory(50, 0)).toBe(24);
  });
});

describe("scaleSEEMarks", () => {
  it("scales 100 → 50", () => {
    expect(scaleSEEMarks(100)).toBe(50);
  });

  it("scales 0 → 0", () => {
    expect(scaleSEEMarks(0)).toBe(0);
  });

  it("scales 70 → 35", () => {
    expect(scaleSEEMarks(70)).toBe(35);
  });

  it("rounds to 2 decimal places", () => {
    expect(scaleSEEMarks(33)).toBe(16.5);
  });
});

describe("getGrade", () => {
  const cases = [
    [90, 100, "O",  10],
    [80, 100, "A+",  9],
    [70, 100, "A",   8],
    [60, 100, "B+",  7],
    [55, 100, "B",   6],
    [50, 100, "C",   5],
    [45, 100, "D",   4],
    [44, 100, "F",   0],
    [0,  100, "F",   0],
  ];

  it.each(cases)(
    "%i/%i marks → grade %s, %i grade points",
    (marks, max, grade, points) => {
      const result = getGrade(marks, max);
      expect(result.grade).toBe(grade);
      expect(result.gradePoints).toBe(points);
    }
  );

  it("returns F with 0 grade points when maxMarks is 0 (guard against division by zero)", () => {
    const result = getGrade(0, 0);
    expect(result.grade).toBe("F");
    expect(result.gradePoints).toBe(0);
  });
});
