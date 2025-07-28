import { getSession } from "next-auth/react";
import dbConnect from "../../lib/mongodb";
import User from "../../lib/user";
import mongoose from "mongoose";

// Saves to MongoDB
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get user session
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { type, fileName, filePath, content } = req.body;

    if (!type || !fileName || !filePath) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Connect to MongoDB
    const client = await dbConnect();
    const db = client.db();

    // Find user and update with new saved material
    const result = await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $push: { 
          savedMaterials: {
            type,
            fileName,
            filePath,
            content,
            createdAt: new Date()
          } 
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving material:", error);
    return res.status(500).json({ message: "Error saving material", error: error.message });
  }
}