import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { analyze, getProviders } from "./providers.js";

config();

const app = express();
const port = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist");

const envKeys = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

const rateLimit = new Map();
const rateWindowMs = 60_000;
const rateMax = 10;

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(distDir));

app.get("/api/providers", (_req, res) => {
  res.json(getProviders());
});

app.post("/api/analyze", async (req, res) => {
  const ticker = String(req.body?.ticker || "").trim().toUpperCase();
  const provider = String(req.body?.provider || "anthropic").trim().toLowerCase();
  const model = String(req.body?.model || "").trim();
  const suppliedKey = String(req.body?.apiKey || "").trim();

  if (!/^[A-Z0-9.-]{1,15}$/.test(ticker)) {
    return res.status(400).json({ error: "Enter a valid ticker symbol." });
  }

  const now = Date.now();
  const ip = req.ip || "unknown";
  const usage = rateLimit.get(ip);
  const current = !usage || now - usage.startedAt > rateWindowMs
    ? { startedAt: now, count: 1 }
    : { ...usage, count: usage.count + 1 };
  rateLimit.set(ip, current);

  if (current.count > rateMax) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute." });
  }

  const envName = envKeys[provider];
  const apiKey = suppliedKey || (envName ? process.env[envName] : "");
  if (!apiKey) {
    return res.status(400).json({
      error: `API key required for ${provider}. Enter one in Settings or configure ${envName || "the provider environment variable"}.`,
    });
  }

  try {
    const result = await analyze({ provider, apiKey, model, ticker });
    return res.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(502).json({ error: error.message || "Analysis failed." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Stock Analyzer API running on http://localhost:${port}`);
});
