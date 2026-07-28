import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    choices: {
      type: [String],
      required: true,
      validate: [(value) => value.length === 4, "Exactly four choices are required."],
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, default: "" },
    selectedIndex: { type: Number, default: null },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    questions: { type: [questionSchema], required: true },
    completed: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
