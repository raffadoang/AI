
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Firebase Admin
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Tes server
app.get("/", (req, res) => {
  res.send("RAFFZ AI Backend aktif!");
});

// Chat AI
app.post("/api/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Login diperlukan"
      });
    }

    await admin.auth().verifyIdToken(token);

    const message = req.body.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 10000
    ) {
      return res.status(400).json({
        error: "Pesan tidak valid"
      });
    }

    if (!process.env.GROQ_API_KEY) {
      throw new Error("API Groq belum dipasang");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Kamu adalah RAFFZ AI, asisten yang ramah, pintar, dan membantu."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);
      return res.status(502).json({
        error: "Gagal menghubungi AI Groq"
      });
    }

    res.json({
      reply: data.choices?.[0]?.message?.content || "Tidak ada jawaban."
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Terjadi kesalahan pada server"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RAFFZ AI aktif di port ${PORT}`);
});
