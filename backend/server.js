import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { startCronJobs } from "./src/utils/cronJobs.js";

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    startCronJobs();
  });
}).catch((err) => {
  console.error("❌ Failed to connect to DB:", err);
  process.exit(1);
});
