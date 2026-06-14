// ============================================================
// Multi-LLM Provider Abstraction
// Each provider normalizes to: { text: string } response
// ============================================================

const SYSTEM_PROMPT = `You are a stock data API. You ONLY output raw JSON. Never output any English sentences, explanations, markdown, or backticks. Your entire response must be a single valid JSON object starting with { and ending with }. No text before or after the JSON.`;

const buildPrompt = (ticker) => `Research stock "${ticker}" and provide current data. Return ONLY this JSON structure (no other text):
{
  "ticker": "${ticker}",
  "company_name": "Full company name",
  "current_price": 0.00,
  "currency": "USD",
  "change_percent_today": 0.0,
  "week_52_high": 0.0,
  "week_52_low": 0.0,
  "market_cap": "e.g. 3.2T",
  "pe_ratio": 0.0,
  "volume_vs_avg": "above/below/normal",
  "indicators": {
    "rsi_14": { "value": 0, "signal": "overbought/neutral/oversold" },
    "macd": { "signal": "bullish/bearish/neutral", "detail": "short explanation" },
    "moving_avg_50": { "price": 0, "position": "above/below" },
    "moving_avg_200": { "price": 0, "position": "above/below" },
    "bollinger": { "position": "upper/middle/lower", "detail": "short explanation" },
    "volume_trend": { "signal": "accumulation/distribution/neutral", "detail": "short explanation" },
    "support_level": 0.0,
    "resistance_level": 0.0
  },
  "trend": {
    "short_term": "bullish/bearish/neutral",
    "medium_term": "bullish/bearish/neutral",
    "long_term": "bullish/bearish/neutral"
  },
  "scores": {
    "technical": { "score": 0, "max": 100 },
    "momentum": { "score": 0, "max": 100 },
    "valuation": { "score": 0, "max": 100 },
    "trend_strength": { "score": 0, "max": 100 }
  },
  "overall_score": 0,
  "verdict": "STRONG BUY/BUY/HOLD/AVOID/STRONG AVOID",
  "entry_timing": {
    "is_good_entry": true,
    "recommendation": "Clear recommendation on whether to enter now or wait",
    "ideal_entry_price": 0.0,
    "stop_loss": 0.0,
    "target_price": 0.0
  },
  "summary": "2-3 sentence plain English summary of the analysis",
  "risks": ["risk 1", "risk 2", "risk 3"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}
Use the LATEST data you have. Be accurate with numbers. Score honestly. Output ONLY the JSON object.`;

// ─── Provider Registry ─────────────────────────────────────

const providers = {

  // ── Anthropic (Claude) ──────────────────────────────────
  anthropic: {
    name: "Anthropic",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-6",
    async call({ apiKey, model, ticker }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: buildPrompt(ticker) }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    },
  },

  // ── OpenAI (GPT) ───────────────────────────────────────
  openai: {
    name: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
    defaultModel: "gpt-4o",
    async call({ apiKey, model, ticker }) {
      const body = {
        model: model || this.defaultModel,
        max_tokens: 4000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(ticker) },
        ],
      };
      // Enable web search for models that support it
      if (["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"].includes(model || this.defaultModel)) {
        body.tools = [{ type: "web_search_preview" }];
      }
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || "";
    },
  },

  // ── Google Gemini ──────────────────────────────────────
  google: {
    name: "Google Gemini",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    defaultModel: "gemini-2.5-flash",
    async call({ apiKey, model, ticker }) {
      const m = model || this.defaultModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: buildPrompt(ticker) }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 4000 },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const parts = data.candidates?.[0]?.content?.parts || [];
      return parts.map(p => p.text || "").join("\n");
    },
  },

  // ── Groq ───────────────────────────────────────────────
  groq: {
    name: "Groq",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
    defaultModel: "llama-3.3-70b-versatile",
    async call({ apiKey, model, ticker }) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: 4000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(ticker) },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || "";
    },
  },

  // ── Mistral ────────────────────────────────────────────
  mistral: {
    name: "Mistral",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
    defaultModel: "mistral-large-latest",
    async call({ apiKey, model, ticker }) {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: 4000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(ticker) },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || "";
    },
  },

  // ── DeepSeek ───────────────────────────────────────────
  deepseek: {
    name: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    async call({ apiKey, model, ticker }) {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: 4000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(ticker) },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || "";
    },
  },

  // ── OpenRouter (access 100+ models) ────────────────────
  openrouter: {
    name: "OpenRouter",
    models: ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b"],
    defaultModel: "anthropic/claude-sonnet-4",
    async call({ apiKey, model, ticker }) {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          max_tokens: 4000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt(ticker) },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices?.[0]?.message?.content || "";
    },
  },
};

// ─── Unified analyze function ────────────────────────────

export async function analyze({ provider, apiKey, model, ticker }) {
  const p = providers[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(providers).join(", ")}`);
  if (!apiKey) throw new Error("API key is required");
  if (!ticker) throw new Error("Ticker symbol is required");

  const rawText = await p.call({ apiKey, model, ticker });

  // Extract JSON robustly
  const first = rawText.indexOf("{");
  const last = rawText.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Model did not return valid JSON. Try again or switch models.");

  return JSON.parse(rawText.slice(first, last + 1));
}

export function getProviders() {
  return Object.entries(providers).map(([id, p]) => ({
    id,
    name: p.name,
    models: p.models,
    defaultModel: p.defaultModel,
  }));
}
