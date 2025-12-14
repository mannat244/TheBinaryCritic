import mongoose from "mongoose";

let isConnected = false; // track connection

export async function connectDB() {
  // If already connected → reuse
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection exists but isn't ready
  if (mongoose.connection.readyState === 2) {
    console.log("⏳ Already connecting to MongoDB...");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    isConnected = conn.connections[0].readyState === 1;

    console.log("🟢 MongoDB Connected:", conn.connection.host);
  } catch (error) {
    console.error("🔴 MongoDB Connection Error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}
