import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root (two levels up from src/__tests__)
dotenv.config({ path: resolve(__dirname, "../../.env") });

export async function setup() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-for-vitest";

  // Derive a test-specific database URI so tests never touch the production DB.
  // If MONGODB_TEST_URI is already set (CI/CD override), honour it.
  if (!process.env.MONGODB_TEST_URI) {
    const uri = process.env.MONGODB_URI || "";
    // Swap the database name to "<dbname>_test"
    process.env.MONGODB_TEST_URI = uri.replace(
      /\/([^/?]+)(\?|$)/,
      "/$1_test$2"
    );
  }
}

export async function teardown() {
  // Connection is closed per test-file in setup.js afterAll hooks.
  // No global teardown needed.
}
