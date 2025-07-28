import mongoose from "mongoose";

const FeatureCounterSchema = new mongoose.Schema({
  BlindAssistance: { type: Number, default: 0 },
  DeafAssistance: { type: Number, default: 0 },
  AutismSupport: { type: Number, default: 0 },
  PersonalizedLearning: { type: Number, default: 0 },
}, { _id: false });

const SavedMaterialSchema = new mongoose.Schema({
  type: { type: String, enum: ['flashcard', 'summary', 'quiz'], required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  content: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  emailVerified: { type: Date, default: null },
  image: String,
  featureCounters: { type: FeatureCounterSchema, default: () => ({}) },
  savedMaterials: [SavedMaterialSchema]
});

export default mongoose.models.User || mongoose.model("User", UserSchema);