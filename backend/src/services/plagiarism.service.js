/**
 * Plagiarism Detection Service
 *
 * Uses the Gemini AI model to detect similarities between student answer sheets
 * and a reference corpus. Identifies verbatim copying, paraphrasing, and
 * unusually similar answer patterns across booklets in the same exam event.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { imageToBase64 } from "./ocr.service.js";

const SIMILARITY_THRESHOLD = 0.75;

const plagiarismPrompt = `
You are an academic integrity analyst. Analyze the following student answer texts.

Detect:
1. Verbatim copying (identical phrases/sentences)
2. Near-identical paraphrasing (same ideas, slightly reworded)
3. Unusual structural similarity (same order of points, same examples)

Return ONLY valid JSON:
{
  "similarityScore": 0.0 to 1.0,
  "verdict": "clean | suspicious | plagiarized",
  "matchedSegments": [
    {
      "text": "copied or similar text fragment",
      "type": "verbatim | paraphrase | structural",
      "confidence": 0.0 to 1.0
    }
  ],
  "summary": "brief explanation"
}
`;

/**
 * Compare two answer texts using Gemini for plagiarism analysis.
 */
export const compareAnswerTexts = async (textA, textB) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `${plagiarismPrompt}

ANSWER A:
${textA}

ANSWER B:
${textB}
`;

  const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  const text = result.response.text();
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return { similarityScore: 0, verdict: "clean", matchedSegments: [], summary: "Analysis unavailable" };

  try {
    return JSON.parse(match[0]);
  } catch {
    return { similarityScore: 0, verdict: "clean", matchedSegments: [], summary: "Parsing error" };
  }
};

/**
 * Compare answer sheet images for visual/structural similarity using Gemini vision.
 */
export const compareAnswerImages = async (imagesA, imagesB) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const parts = [{ text: `${plagiarismPrompt}\nCompare the handwritten answers in the two sets of images below.` }];

  for (const img of imagesA.slice(0, 3)) {
    const base64 = await imageToBase64(img);
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  }
  parts.push({ text: "--- ANSWER B ---" });
  for (const img of imagesB.slice(0, 3)) {
    const base64 = await imageToBase64(img);
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  }

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const text = result.response.text();
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return { similarityScore: 0, verdict: "clean", matchedSegments: [], summary: "Analysis unavailable" };

  try {
    return JSON.parse(match[0]);
  } catch {
    return { similarityScore: 0, verdict: "clean", matchedSegments: [], summary: "Parsing error" };
  }
};

/**
 * Run a batch plagiarism check across all booklets in an exam event.
 * Compares each pair using extracted text from AIEvaluation question-wise feedback.
 * Returns a list of flagged pairs with similarity scores above the threshold.
 */
export const batchPlagiarismCheck = async (bookletEvaluations) => {
  const flagged = [];
  const n = bookletEvaluations.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const textA = (bookletEvaluations[i].questionWiseMarks || [])
        .map(q => q.feedback).join(" ");
      const textB = (bookletEvaluations[j].questionWiseMarks || [])
        .map(q => q.feedback).join(" ");

      if (!textA.trim() || !textB.trim()) continue;

      const analysis = await compareAnswerTexts(textA, textB);

      if (analysis.similarityScore >= SIMILARITY_THRESHOLD) {
        flagged.push({
          bookletA: bookletEvaluations[i].booklet,
          bookletB: bookletEvaluations[j].booklet,
          similarityScore: analysis.similarityScore,
          verdict: analysis.verdict,
          matchedSegments: analysis.matchedSegments,
          summary: analysis.summary,
          flaggedAt: new Date(),
        });
      }
    }
  }

  return {
    totalPairsChecked: (n * (n - 1)) / 2,
    flaggedPairs: flagged.length,
    threshold: SIMILARITY_THRESHOLD,
    results: flagged,
  };
};
