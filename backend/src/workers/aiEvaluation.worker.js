import { Worker } from "bullmq";
import mongoose from "mongoose";
import AnswerBooklet from "../models/AnswerBooklet.js";
import AIEvaluation from "../models/AIEvaluation.js";
import ExternalBundle from "../models/ExternalBundle.js";
import ExternalExamBooklet from "../models/ExternalExamBooklet.js";
import ExternalAIEvaluation from "../models/ExternalAIEvaluation.js";
import EvaluationSchema from "../models/EvaluationSchema.js";
import {
  convertPDFToImages, filterUsefulImages, evaluateWithGemini, cleanupFiles,
} from "../services/ocr.service.js";
import { BOOKLET_STATUS, EXTERNAL_BOOKLET_STATUS, BUNDLE_STATUS } from "../config/constants.js";

const REDIS_URL = process.env.REDIS_URL;

async function processBooklet(job) {
  const { bookletId } = job.data;
  const booklet = await AnswerBooklet.findById(bookletId).populate("examEvent subject");
  if (!booklet) throw new Error(`Booklet ${bookletId} not found`);

  const schema = await EvaluationSchema.findOne({
    examEvent: booklet.examEvent._id,
    subject: booklet.subject._id,
  });
  const keyText = schema
    ? schema.questions.map(q => `${q.questionNumber}: ${q.description || ""} [${q.maxMarks} marks]`).join("\n")
    : job.data.answerKeyText || "";

  let allImages = [];
  try {
    await job.updateProgress(10);
    const rawImages = await convertPDFToImages(`.${booklet.fileUrl}`, booklet.fileName || "booklet.pdf");
    allImages = rawImages;
    await job.updateProgress(40);

    const studentImages = filterUsefulImages(rawImages);
    const aiResult = await evaluateWithGemini(studentImages, keyText);
    await job.updateProgress(80);

    await AIEvaluation.findOneAndUpdate(
      { booklet: booklet._id },
      {
        booklet: booklet._id,
        questionWiseMarks: (aiResult.questionWise || []).map(q => ({
          questionNumber: q.question || "",
          maxMarks: q.maxMarks || 0,
          marksAwarded: q.marksAwarded || 0,
          status: q.status || "not_attempted",
          feedback: q.feedback || "",
        })),
        totalMarks: aiResult.totalMarks || 0,
        maxMarks: aiResult.maxMarks || 0,
        strengths: aiResult.strengths || [],
        weaknesses: aiResult.weaknesses || [],
        improvements: aiResult.suggestions || [],
        mistakes: aiResult.mistakes || [],
        suggestions: aiResult.suggestions || [],
        processedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await AnswerBooklet.findByIdAndUpdate(booklet._id, { status: BOOKLET_STATUS.AI_EVALUATED });
    await job.updateProgress(100);
  } finally {
    await cleanupFiles(allImages);
  }
}

async function processBundle(job) {
  const { bundleId } = job.data;
  const bundle = await ExternalBundle.findById(bundleId)
    .populate("booklets").populate("examEvent").populate("subject");
  if (!bundle) throw new Error(`Bundle ${bundleId} not found`);

  await ExternalBundle.findByIdAndUpdate(bundle._id, { status: BUNDLE_STATUS.EVALUATING });

  const schema = await EvaluationSchema.findOne({
    examEvent: bundle.examEvent._id, subject: bundle.subject._id,
  });
  const keyText = schema
    ? schema.questions.map(q => `${q.questionNumber}: ${q.description || ""} [${q.maxMarks} marks]`).join("\n")
    : "";

  const total = bundle.booklets.length;
  const results = [];

  for (let i = 0; i < total; i++) {
    const booklet = bundle.booklets[i];
    let allImages = [];
    try {
      const rawImages = await convertPDFToImages(`.${booklet.fileUrl}`, booklet.fileName || "booklet.pdf");
      allImages = rawImages;
      const studentImages = filterUsefulImages(rawImages);
      const aiResult = await evaluateWithGemini(studentImages, keyText);

      const totalMarks = aiResult.totalMarks || 0;
      const scaledTotal = Math.round((totalMarks / (aiResult.maxMarks || 100)) * 50 * 100) / 100;

      await ExternalAIEvaluation.findOneAndUpdate(
        { booklet: booklet._id },
        {
          booklet: booklet._id,
          questionWiseMarks: (aiResult.questionWise || []).map(q => ({
            questionNumber: q.question || "",
            maxMarks: q.maxMarks || 0,
            marksAwarded: q.marksAwarded || 0,
            scaledMarks: Math.round(((q.marksAwarded || 0) / (q.maxMarks || 1)) * 50 * 100) / 100,
            status: q.status || "not_attempted",
            feedback: q.feedback || "",
          })),
          totalMarks, scaledTotal,
          maxMarks: aiResult.maxMarks || 100,
          strengths: aiResult.strengths || [],
          weaknesses: aiResult.weaknesses || [],
          mistakes: aiResult.mistakes || [],
          suggestions: aiResult.suggestions || [],
          processedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      await ExternalExamBooklet.findByIdAndUpdate(booklet._id, {
        status: EXTERNAL_BOOKLET_STATUS.AI_EVALUATED,
      });
      results.push({ bookletId: booklet._id, totalMarks, scaledTotal });
    } finally {
      await cleanupFiles(allImages);
    }

    await job.updateProgress(Math.round(((i + 1) / total) * 100));
  }

  await ExternalBundle.findByIdAndUpdate(bundle._id, { status: BUNDLE_STATUS.EVALUATED });
  return { evaluated: results.length, results };
}

export function startWorkers() {
  if (!REDIS_URL) {
    console.log("ℹ️  REDIS_URL not set — AI evaluation queue workers disabled");
    return;
  }

  const connection = { url: REDIS_URL };

  const bookletWorker = new Worker("ai-booklet-evaluation", processBooklet, {
    connection,
    concurrency: 3,
  });

  const bundleWorker = new Worker("ai-bundle-evaluation", processBundle, {
    connection,
    concurrency: 2,
  });

  bookletWorker.on("completed", job => console.log(`✅ Booklet job ${job.id} completed`));
  bookletWorker.on("failed", (job, err) => console.error(`❌ Booklet job ${job?.id} failed:`, err.message));

  bundleWorker.on("completed", job => console.log(`✅ Bundle job ${job.id} completed`));
  bundleWorker.on("failed", (job, err) => console.error(`❌ Bundle job ${job?.id} failed:`, err.message));

  console.log("🚀 AI evaluation queue workers started (concurrency: booklet=3, bundle=2)");
}
