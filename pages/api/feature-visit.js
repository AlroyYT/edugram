import clientPromise from "../../lib/mongodb";
import mongoose from "mongoose";
import User from "../../lib/user";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, feature } = req.body;
  if (!email || !feature) return res.status(400).json({ error: "Missing params" });

  if (mongoose.connection.readyState === 0) {
    const client = await clientPromise;
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // bufferCommands: false, // optional
    });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (!user.featureCounters) user.featureCounters = {};
  user.featureCounters[feature] = (user.featureCounters[feature] || 0) + 1;

  await user.save();

  res.status(200).json({ success: true, counters: user.featureCounters });
}
