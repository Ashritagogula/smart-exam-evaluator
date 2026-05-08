import pdf from "pdf-poppler";
import fs from "fs-extra";
import path from "path";
import sharp from "sharp";

const OUTPUT_DIR = "./output";

// Convert PDF to JPEG images
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

// Filter blank/useless pages
export const filterUsefulImages = (images) =>
  images.filter(img => {
    try { return fs.statSync(img).size > 5000; }
    catch { return false; }
  });

// Convert image to base64
export const imageToBase64 = async (imgPath) => {
  const buffer = await fs.readFile(imgPath);
  return buffer.toString("base64");
};

// Compress image for faster API transmission
export const compressImage = async (imgPath) => {
  const compressed = imgPath.replace(".jpg", "_c.jpg").replace(".jpeg", "_c.jpeg");
  await sharp(imgPath).jpeg({ quality: 75 }).toFile(compressed);
  return compressed;
};

// Cleanup temp files
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

// Main evaluation function
export const evaluateWithGemini = async (studentImages, keyText = "", keyImages = []) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const parts = [];

  parts.push({ text: `${basePrompt}\n\nANSWER KEY:\n${keyText || "Answer key is provided in images"}` });

  for (const img of keyImages) {
    const base64 = await imageToBase64(img);
    parts.push({ inline_data: { mime_type: "image/jpeg", data: base64 } });
  }

  for (const img of studentImages) {
    const base64 = await imageToBase64(img);
    parts.push({ inline_data: { mime_type: "image/jpeg", data: base64 } });
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  async function callGemini(retries = 3) {
    for (let i = 0; i < retries; i++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }] }),
      });
      if (res.status === 503) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return res;
    }
    throw new Error("Gemini API unavailable after retries");
  }

  const response = await callGemini();
  const data = await response.json();

  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error("No candidate in Gemini response");

  let text = candidate.content.parts.map(p => p.text || "").join("");
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { totalMarks: 0, maxMarks: 0, questionWise: [], mistakes: ["AI did not return JSON"], suggestions: [] };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { totalMarks: 0, maxMarks: 0, questionWise: [], mistakes: ["AI returned malformed JSON"], suggestions: [] };
  }
};
