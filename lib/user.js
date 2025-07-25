import mongoose from "mongoose";

const FeatureCounterSchema = new mongoose.Schema({
  BlindAssistance: { type: Number, default: 0 },
  DeafAssistance: { type: Number, default: 0 },
  AutismSupport: { type: Number, default: 0 },
  PersonalizedLearning: { type: Number, default: 0 },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  emailVerified: { type: Date, default: null },
  image: String,
  featureCounters: { type: FeatureCounterSchema, default: () => ({}) },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);