import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      writeConcern: { w: "majority", j: true },
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("\n⚠️  NETWORK FIX REQUIRED:");
    console.error("   1. Go to https://cloud.mongodb.com");
    console.error("   2. Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)");
    console.error("   3. Or add your current IP address specifically");
    console.error("   4. Wait 1-2 minutes, then restart the server\n");
    throw err;
  }
};
