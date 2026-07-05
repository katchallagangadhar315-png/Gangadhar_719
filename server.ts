import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI securely server-side
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY is not defined in the environment. AI explanations will fall back to local simulated generation.");
  }

  // API route for AI explanation
  app.post("/api/explain", async (req, res) => {
    try {
      const { vulnName, severity, description, risk, recommendation, url } = req.body;

      if (!vulnName) {
        return res.status(400).json({ error: "Vulnerability name is required." });
      }

      if (!ai) {
        throw new Error("Gemini AI Client is not initialized due to missing API key.");
      }

      const prompt = `You are an educational cybersecurity scanning companion named AEGIS AI. Explain the following web vulnerability to a developer or security student:
Target Website: ${url || "Target URL"}
Vulnerability: ${vulnName}
Severity: ${severity}
Description: ${description}
Risk: ${risk}
Recommendation: ${recommendation}

Provide a polished, readable explanation in easy-to-understand language. Explain why it matters, how attackers might perceive or leverage this weakness (defensively speaking), and the suggested resolution. Keep your explanation extremely clear, professional, and instructional. Use short paragraphs or 3-4 bullet points. No markdown headings.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ explanation: response.text });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to reach AI Engine." });
    }
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
