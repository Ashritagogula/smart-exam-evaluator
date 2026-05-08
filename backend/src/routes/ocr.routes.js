import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { uploadOCR } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  convertPDFToImages, filterUsefulImages, evaluateWithGemini, cleanupFiles,
} from "../services/ocr.service.js";

const router = express.Router();
router.use(authenticate);

router.post("/evaluate", (req, res, next) => {
  uploadOCR(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, asyncHandler(async (req, res) => {
  const file = req.files?.["file"]?.[0];
  const keyFile = req.files?.["answerKeyFile"]?.[0];
  const keyText = req.body.answerKeyText || "";
  let options = null;
  try { options = req.body.options ? JSON.parse(req.body.options) : null; } catch {}

  if (!file) return res.status(400).json({ message: "No student file uploaded" });

  let allImages = [];
  let keyImages = [];
  try {
    if (keyFile) {
      keyImages = await convertPDFToImages(keyFile.path, keyFile.originalname);
      allImages.push(...keyImages);
    }
    const rawImages = await convertPDFToImages(file.path, file.originalname);
    allImages.push(...rawImages);
    const studentImages = filterUsefulImages(rawImages);

    const result = await evaluateWithGemini(studentImages, keyText, keyImages);
    res.json({ result });
  } finally {
    await cleanupFiles(allImages);
    // Clean uploaded temp files
    try { if (file) await import("fs-extra").then(fs => fs.default.remove(file.path)); } catch {}
    try { if (keyFile) await import("fs-extra").then(fs => fs.default.remove(keyFile.path)); } catch {}
  }
}));

export default router;
