import crypto from "crypto";
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
const provider = String(process.env.ANALYSIS_PROVIDER || "anthropic").toLowerCase();
const model = String(process.env.ANALYSIS_MODEL || "").trim();
const accessToken = String(process.env.APP_ACCESS_TOKEN || "");
const rateWindowMs = Number(process.env.RATE_WINDOW_MS || 60_000);
const rateMax = Number(process.env.RATE_MAX || 3);
const dailyMax = Number(process.env.DAILY_MAX || 50);

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
let dailyUsage = { date: new Date().toISOString().slice(0, 10), count: 0 };

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(distDir));

app.get("/api/providers", (_req, res) => {
  const configured = getProviders().find((item) => item.id === provider);
  res.json(configured ? [{ ...configured, models: model ? [model] : configured.models }] : []);
});

app.post("/api/analyze", async (req, res) => {
  const ticker = String(req.body?.ticker || "").trim().toUpperCase();

  if (!/^[A-Z0-9.-]{1,15}$/.test(ticker)) {
    return res.status(400).json({ error: "Enter a valid ticker symbol." });
  }

  if (!accessToken) {
    return res.status(503).json({ error: "Server access is not configured." });
  }

  const suppliedToken = String(req.get("x-app-token") || "");
  const expected = Buffer.from(accessToken);
  const supplied = Buffer.from(suppliedToken);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: "Invalid access code." });
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

  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.date !== today) dailyUsage = { date: today, count: 0 };
  if (dailyUsage.count >= dailyMax) {
    return res.status(429).json({ error: "The daily analysis limit has been reached." });
  }

  const envName = envKeys[provider];
  const apiKey = envName ? process.env[envName] : "";
  if (!apiKey) {
    return res.status(503).json({ error: "The analysis provider is not configured." });
  }

  try {
    dailyUsage.count += 1;
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
