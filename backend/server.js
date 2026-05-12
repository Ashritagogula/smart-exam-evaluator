import dotenv from "dotenv";
dotenv.config();

const REQUIRED_ENV = ["JWT_SECRET", "MONGODB_URI", "GEMINI_API_KEY"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Set them in your .env file before starting the server.");
  process.exit(1);
}

import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { startCronJobs } from "./src/utils/cronJobs.js";
import { startWorkers } from "./src/workers/aiEvaluation.worker.js";

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    startCronJobs();
    startWorkers();
  });
}).catch((err) => {
  console.error("❌ Failed to connect to DB:", err);
  process.exit(1);
});
