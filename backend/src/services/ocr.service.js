import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-poppler";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

const OUTPUT_DIR = "./output";

export const convertPDFToImages = async (filePath, originalName = "file") => {
  await fs.ensureDir(OUTPUT_DIR);
  const safeName = path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, "_");
  const prefix = `${safeName}_${Date.now()}`;

  const opts = {
    format: "jpeg",
    out_dir: OUTPUT_DIR,
    out_prefix: prefix,
    page: null,
    scale: 300,
  };

  await pdf.convert(filePath, opts);
  const files = await fs.readdir(OUTPUT_DIR);
  return files.filter(f => f.startsWith(prefix)).map(f => path.join(OUTPUT_DIR, f));
};

export const filterUsefulImages = (images) =>
  images.filter(img => {
    try { return fs.statSync(img).size > 5000; }
    catch { return false; }
  });

export const imageToBase64 = async (imgPath) => {
  const buffer = await fs.readFile(imgPath);
  return buffer.toString("base64");
};

export const compressImage = async (imgPath) => {
  const compressed = imgPath.replace(".jpg", "_c.jpg").replace(".jpeg", "_c.jpeg");
  await sharp(imgPath).jpeg({ quality: 75 }).toFile(compressed);
  return compressed;
};

export const cleanupFiles = async (files) => {
  for (const f of files) {
    try { await fs.remove(f); } catch {}
  }
};

export const basePrompt = `
CRITICAL SYSTEM INSTRUCTION:
You are a STRICT JSON GENERATOR.
You MUST return ONLY VALID JSON.

❌ Do NOT write explanations
❌ Do NOT write markdown
❌ Do NOT write paragraphs

---

You are a strict, accurate, and unbiased academic examiner.

You will be given:
1. An answer key (questions, answers, marks)
2. A student answer sheet (handwritten, may be messy)

Your task is to evaluate answers CONSERVATIVELY and BASED ONLY ON EVIDENCE.

## ATTEMPT DETECTION (VERY STRICT)
A question is ATTEMPTED ONLY if clear, meaningful, and relevant content exists.
NOT ATTEMPTED: blank, scribbles, only keywords, copied question text.
STRICT RULE: If NOT_ATTEMPTED → marksAwarded = 0

## MARKS CALCULATION
* totalMarks = sum of marksAwarded
* maxMarks = sum from answer key ONLY

## OUTPUT FORMAT (STRICT JSON ONLY)
{
  "totalMarks": number,
  "maxMarks": number,
  "questionWise": [
    {
      "question": "EXACT question text",
      "marksAwarded": number,
      "maxMarks": number,
      "status": "correct | partial | wrong | not_attempted",
      "feedback": "reason"
    }
  ],
  "mistakes": [],
  "suggestions": [],
  "strengths": [],
  "weaknesses": []
}

Return ONLY JSON starting with { and ending with }
`;

const AI_RETRY_BASE_DELAY_MS = parseInt(process.env.AI_RETRY_BASE_DELAY_MS || "2000", 10);
const AI_RETRY_COUNT        = parseInt(process.env.AI_RETRY_COUNT        || "3",    10);

export const evaluateWithGemini = async (studentImages, keyText = "", keyImages = []) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const parts = [];
  parts.push({ text: `${basePrompt}\n\nANSWER KEY:\n${keyText || "Answer key is provided in images"}` });

  for (const img of keyImages) {
    const base64 = await imageToBase64(img);
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  }

  for (const img of studentImages) {
    const base64 = await imageToBase64(img);
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
  }

  async function callGemini() {
    for (let i = 0; i < AI_RETRY_COUNT; i++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts }],
        });
        return result.response.text();
      } catch (err) {
        const isRetryable = err.status === 503 || err.status === 429 ||
          err.message?.includes("503") || err.message?.includes("429");
        if (i < AI_RETRY_COUNT - 1 && isRetryable) {
          const delay = AI_RETRY_BASE_DELAY_MS * Math.pow(2, i);
          console.warn(`[OCR] Gemini transient error (attempt ${i + 1}/${AI_RETRY_COUNT}), retrying in ${delay}ms:`, err.message);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Attach retry metadata so the error handler can send Retry-After to the client
        if (err.status === 429 || err.message?.includes("429")) {
          err.retryAfterSeconds = Math.ceil((AI_RETRY_BASE_DELAY_MS * Math.pow(2, AI_RETRY_COUNT)) / 1000);
          err.statusCode = 429;
        }
        throw err;
      }
    }
  }

  const text = await callGemini();
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error("[OCR] Gemini did not return JSON. Raw response:", text.slice(0, 300));
    return { totalMarks: 0, maxMarks: 0, questionWise: [], mistakes: ["AI did not return JSON"], suggestions: [] };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[OCR] JSON parse failed:", err.message, "| raw excerpt:", jsonMatch[0].slice(0, 300));
    return { totalMarks: 0, maxMarks: 0, questionWise: [], mistakes: ["AI returned malformed JSON"], suggestions: [] };
  }
};
