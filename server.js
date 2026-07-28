import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import User from "./models/User.js";
import Quiz from "./models/Quiz.js";

const app = express();
const PORT = process.env.PORT || 3000;

const requiredEnv = ["MONGODB_URI", "SESSION_SECRET", "GEMINI_API_KEY"];
for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.warn(`Warning: ${name} is not set.`);
  }
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.message = { type: "error", text: "Please log in first." };
    return res.redirect("/login");
  }
  next();
}

function cleanText(value, maxLength = 100) {
  return String(value || "").trim().slice(0, maxLength);
}

function validateGeneratedQuestions(data, expectedCount) {
  if (!Array.isArray(data) || data.length !== expectedCount) {
    throw new Error("The AI returned an unexpected number of questions.");
  }

  return data.map((item, index) => {
    if (
      typeof item.question !== "string" ||
      !Array.isArray(item.choices) ||
      item.choices.length !== 4 ||
      !Number.isInteger(item.correctIndex) ||
      item.correctIndex < 0 ||
      item.correctIndex > 3
    ) {
      throw new Error(`Question ${index + 1} had an invalid format.`);
    }

    return {
      question: item.question.trim(),
      choices: item.choices.map((choice) => String(choice).trim()),
      correctIndex: item.correctIndex,
      explanation: String(item.explanation || "").trim(),
      selectedIndex: null,
    };
  });
}

app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("index", { title: "Quiztopia" });
});

app.get("/signup", (req, res) => res.render("signup", { title: "Sign Up" }));

app.post("/signup", async (req, res) => {
  try {
    const username = cleanText(req.body.username, 30);
    const email = cleanText(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || "");

    if (username.length < 3 || !email.includes("@") || password.length < 8) {
      req.session.message = {
        type: "error",
        text: "Use a username of at least 3 characters, a valid email, and a password of at least 8 characters.",
      };
      return res.redirect("/signup");
    }

    if (await User.exists({ email })) {
      req.session.message = { type: "error", text: "That email is already registered." };
      return res.redirect("/signup");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });
    req.session.user = { id: user._id.toString(), username: user.username, email: user.email };
    req.session.message = { type: "success", text: "Account created successfully." };
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    req.session.message = { type: "error", text: "Unable to create the account." };
    res.redirect("/signup");
  }
});

app.get("/login", (req, res) => res.render("login", { title: "Log In" }));

app.post("/login", async (req, res) => {
  try {
    const email = cleanText(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      req.session.message = { type: "error", text: "Incorrect email or password." };
      return res.redirect("/login");
    }

    req.session.user = { id: user._id.toString(), username: user.username, email: user.email };
    req.session.message = { type: "success", text: `Welcome back, ${user.username}!` };
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    req.session.message = { type: "error", text: "Unable to log in." };
    res.redirect("/login");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/dashboard", requireAuth, async (req, res) => {
  const recentQuizzes = await Quiz.find({ user: req.session.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  res.render("dashboard", { title: "Dashboard", recentQuizzes });
});

app.post("/quizzes/generate", requireAuth, async (req, res) => {
  try {
    const topic = cleanText(req.body.topic, 100);
    const difficulty = ["easy", "medium", "hard"].includes(req.body.difficulty)
      ? req.body.difficulty
      : "medium";
    const count = Math.min(10, Math.max(3, Number.parseInt(req.body.count, 10) || 5));

    if (topic.length < 2) {
      req.session.message = { type: "error", text: "Please enter a quiz topic." };
      return res.redirect("/dashboard");
    }

    const prompt = `Create exactly ${count} ${difficulty} multiple-choice quiz questions about "${topic}".
Each question must have exactly four plausible answer choices.
Use zero-based correctIndex values: 0 for the first choice, 1 for the second, 2 for the third, or 3 for the fourth.
Keep explanations concise and factual. Do not use trick questions.`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          minItems: count,
          maxItems: count,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              choices: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: { type: "string" },
              },
              correctIndex: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string" },
            },
            required: ["question", "choices", "correctIndex", "explanation"],
          },
        },
      },
    });

    const generated = JSON.parse(response.text);
    const questions = validateGeneratedQuestions(generated, count);
    const quiz = await Quiz.create({
      user: req.session.user.id,
      title: `${topic} Quiz`,
      topic,
      difficulty,
      questions,
    });

    res.redirect(`/quizzes/${quiz._id}`);
  } catch (error) {
    console.error("Quiz generation error:", error);
    req.session.message = {
      type: "error",
      text: "Quiz generation failed. Check your API key and try again.",
    };
    res.redirect("/dashboard");
  }
});

app.get("/quizzes/:id", requireAuth, async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.user.id }).lean();
  if (!quiz) return res.status(404).render("error", { title: "Not Found", message: "Quiz not found." });
  if (quiz.completed) return res.redirect(`/quizzes/${quiz._id}/results`);
  res.render("quiz", { title: quiz.title, quiz });
});

app.post("/quizzes/:id/submit", requireAuth, async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.user.id });
  if (!quiz) return res.status(404).render("error", { title: "Not Found", message: "Quiz not found." });

  let score = 0;
  quiz.questions.forEach((question, index) => {
    const selected = Number.parseInt(req.body[`answer_${index}`], 10);
    question.selectedIndex = Number.isInteger(selected) && selected >= 0 && selected <= 3 ? selected : null;
    if (question.selectedIndex === question.correctIndex) score += 1;
  });

  quiz.score = score;
  quiz.completed = true;
  await quiz.save();
  res.redirect(`/quizzes/${quiz._id}/results`);
});

app.get("/quizzes/:id/results", requireAuth, async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.user.id }).lean();
  if (!quiz) return res.status(404).render("error", { title: "Not Found", message: "Quiz not found." });
  res.render("results", { title: "Quiz Results", quiz });
});

app.get("/history", requireAuth, async (req, res) => {
  const quizzes = await Quiz.find({ user: req.session.user.id }).sort({ createdAt: -1 }).lean();
  res.render("history", { title: "Quiz History", quizzes });
});

app.post("/quizzes/:id/title", requireAuth, async (req, res) => {
  const title = cleanText(req.body.title, 80);
  if (title) {
    await Quiz.updateOne({ _id: req.params.id, user: req.session.user.id }, { $set: { title } });
    req.session.message = { type: "success", text: "Quiz title updated." };
  }
  res.redirect("/history");
});

app.post("/quizzes/:id/delete", requireAuth, async (req, res) => {
  await Quiz.deleteOne({ _id: req.params.id, user: req.session.user.id });
  req.session.message = { type: "success", text: "Quiz deleted." };
  res.redirect("/history");
});

app.use((req, res) => {
  res.status(404).render("error", { title: "Page Not Found", message: "The page you requested does not exist." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", { title: "Server Error", message: "Something went wrong on the server." });
});

app.listen(PORT, () => console.log(`Quiztopia is running on port ${PORT}`));