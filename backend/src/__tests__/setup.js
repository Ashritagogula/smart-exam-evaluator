import mongoose from "mongoose";
import { beforeAll, afterAll, beforeEach } from "vitest";

// Unit tests run without a database. Only connect when MONGODB_TEST_URI is
// available (set by globalSetup when a real .env is found).
const needsDB = Boolean(process.env.MONGODB_TEST_URI);

beforeAll(async () => {
  if (!needsDB) return;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// Wipe all collections between tests so each test starts with a clean slate
beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});
