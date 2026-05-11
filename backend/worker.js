import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./src/config/database.js";
import { startWorkers } from "./src/workers/aiEvaluation.worker.js";

connectDB().then(() => {
  startWorkers();
  console.log("✅ Standalone AI evaluation worker process started");
}).catch((err) => {
  console.error("❌ Worker failed to connect to DB:", err);
  process.exit(1);
});
