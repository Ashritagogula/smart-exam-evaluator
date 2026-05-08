import cron from "node-cron";
import FacultyEvaluation from "../models/FacultyEvaluation.js";
import AnswerBooklet from "../models/AnswerBooklet.js";
import { BOOKLET_STATUS } from "../config/constants.js";

export const startCronJobs = () => {
  // Every 30 minutes: permanently freeze booklets whose review window has expired
  cron.schedule("*/30 * * * *", async () => {
    try {
      const expired = await FacultyEvaluation.find({
        isFrozen: true,
        isPermanentlyFrozen: false,
        reviewWindowExpiresAt: { $lte: new Date() },
      });

      for (const evalDoc of expired) {
        await FacultyEvaluation.findByIdAndUpdate(evalDoc._id, {
          isPermanentlyFrozen: true,
          permanentFreezeAt: new Date(),
        });
        await AnswerBooklet.findByIdAndUpdate(evalDoc.booklet, {
          status: BOOKLET_STATUS.PERMANENTLY_FROZEN,
        });
      }

      if (expired.length > 0) {
        console.log(`🔒 Permanently froze ${expired.length} booklets after 2-day window.`);
      }
    } catch (err) {
      console.error("❌ Cron job error:", err.message);
    }
  });

  console.log("✅ Cron jobs started");
};
