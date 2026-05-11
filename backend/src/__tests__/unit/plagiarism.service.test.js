import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared mock for generateContent so all GoogleGenerativeAI instances use it
const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

vi.mock("../../services/ocr.service.js", () => ({
  imageToBase64: vi.fn().mockResolvedValue("base64data"),
}));

import { compareAnswerTexts, batchPlagiarismCheck } from "../../services/plagiarism.service.js";

const SIMILARITY_THRESHOLD = 0.75;

function setupGeminiResponse(payload) {
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify(payload) },
  });
}

// ── compareAnswerTexts ────────────────────────────────────────────────────────

describe("compareAnswerTexts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns clean verdict when similarity is below threshold", async () => {
    setupGeminiResponse({ similarityScore: 0.2, verdict: "clean", matchedSegments: [], summary: "No similarity" });
    const result = await compareAnswerTexts("Text A", "Text B");
    expect(result.verdict).toBe("clean");
    expect(result.similarityScore).toBeLessThan(SIMILARITY_THRESHOLD);
  });

  it("returns plagiarized verdict when similarity is high", async () => {
    setupGeminiResponse({ similarityScore: 0.95, verdict: "plagiarized", matchedSegments: [{ text: "same", type: "verbatim", confidence: 0.99 }], summary: "Near identical" });
    const result = await compareAnswerTexts("Text A", "Text A copy");
    expect(result.verdict).toBe("plagiarized");
    expect(result.similarityScore).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });

  it("returns suspicious verdict for moderate similarity", async () => {
    setupGeminiResponse({ similarityScore: 0.80, verdict: "suspicious", matchedSegments: [], summary: "Some overlap" });
    const result = await compareAnswerTexts("Text A", "Text B similar");
    expect(result.verdict).toBe("suspicious");
  });

  it("returns fallback object when Gemini returns non-JSON", async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => "not json at all" } });
    const result = await compareAnswerTexts("A", "B");
    expect(result.similarityScore).toBe(0);
    expect(result.verdict).toBe("clean");
  });
});

// ── batchPlagiarismCheck ──────────────────────────────────────────────────────

describe("batchPlagiarismCheck", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags pairs above the 0.75 similarity threshold", async () => {
    setupGeminiResponse({ similarityScore: 0.90, verdict: "plagiarized", matchedSegments: [], summary: "Copied" });

    const evaluations = [
      { booklet: "booklet1", questionWiseMarks: [{ feedback: "Photosynthesis converts sunlight to energy." }] },
      { booklet: "booklet2", questionWiseMarks: [{ feedback: "Photosynthesis converts sunlight to energy." }] },
    ];

    const result = await batchPlagiarismCheck(evaluations);
    expect(result.flaggedPairs).toBe(1);
    expect(result.results[0].verdict).toBe("plagiarized");
    expect(result.results[0].similarityScore).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });

  it("does not flag pairs below the threshold", async () => {
    setupGeminiResponse({ similarityScore: 0.30, verdict: "clean", matchedSegments: [], summary: "No match" });

    const evaluations = [
      { booklet: "b1", questionWiseMarks: [{ feedback: "Completely different answer A." }] },
      { booklet: "b2", questionWiseMarks: [{ feedback: "Completely different answer B." }] },
    ];

    const result = await batchPlagiarismCheck(evaluations);
    expect(result.flaggedPairs).toBe(0);
  });

  it("calculates total pairs as n*(n-1)/2", async () => {
    setupGeminiResponse({ similarityScore: 0.1, verdict: "clean", matchedSegments: [], summary: "" });

    const evaluations = [
      { booklet: "b1", questionWiseMarks: [{ feedback: "Answer one." }] },
      { booklet: "b2", questionWiseMarks: [{ feedback: "Answer two." }] },
      { booklet: "b3", questionWiseMarks: [{ feedback: "Answer three." }] },
    ];

    const result = await batchPlagiarismCheck(evaluations);
    expect(result.totalPairsChecked).toBe(3); // 3*(3-1)/2 = 3
  });

  it("skips pairs where feedback text is empty", async () => {
    const evaluations = [
      { booklet: "b1", questionWiseMarks: [{ feedback: "" }] },
      { booklet: "b2", questionWiseMarks: [{ feedback: "" }] },
    ];

    const result = await batchPlagiarismCheck(evaluations);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(result.flaggedPairs).toBe(0);
  });
});
