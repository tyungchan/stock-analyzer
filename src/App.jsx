import { useState, useRef, useEffect } from "react";

function ScoreGauge({ score, label, size = 90 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (score / 100) * 0.75);
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2a2a4a" strokeWidth="6"
          strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeLinecap="round"
          transform={`rotate(135 ${size/2} ${size/2})`} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(135 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        <text x={size/2} y={size/2+2} textAnchor="middle" fill={color}
          style={{ fontSize: size > 100 ? "22px" : "16px", fontWeight: 700 }}>{score}</text>
      </svg>
      <div style={{ fontSize: 11, color: "#999", marginTop: -6 }}>{label}</div>
    </div>
  );
}

function SignalBadge({ signal }) {
  const s = (signal || "").toLowerCase();
  const isBull = /bull|above|accumul|oversold/.test(s);
  const isBear = /bear|below|distribut|overbought/.test(s);
  const bg = isBull ? "rgba(34,197,94,0.15)" : isBear ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)";
  const color = isBull ? "#22c55e" : isBear ? "#ef4444" : "#eab308";
  return <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{signal}</span>;
}

function Card({ children, style }) {
  return <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 18, ...style }}>{children}</div>;
}

const LOAD_MSGS = [
  "Scanning market data...", "Crunching technical indicators...",
  "Evaluating momentum signals...", "Analyzing entry timing...",
  "Checking support & resistance...", "Computing risk scores...", "Generating verdict..."
];

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", models: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"] },
  { id: "google", name: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] },
  { id: "groq", name: "Groq", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"] },
  { id: "mistral", name: "Mistral", models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"] },
  { id: "deepseek", name: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "openrouter", name: "OpenRouter", models: ["anthropic/claude-sonnet-4", "openai/gpt-4o", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b"] },
];

export default function App() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loadMsg, setLoadMsg] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const timerRef = useRef(null);

  const selectedProvider = PROVIDERS.find((item) => item.id === provider) || PROVIDERS[0];

  const changeProvider = (event) => {
    const nextProvider = event.target.value;
    const next = PROVIDERS.find((item) => item.id === nextProvider) || PROVIDERS[0];
    setProvider(nextProvider);
    setModel(next.models[0]);
  };

  const analyze = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true); setError(""); setData(null);
    let i = 0;
    setLoadMsg(LOAD_MSGS[0]);
    timerRef.current = setInterval(() => { i = (i + 1) % LOAD_MSGS.length; setLoadMsg(LOAD_MSGS[i]); }, 2800);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, provider, model, apiKey }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e.message || "Analysis failed");
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const vType = (v) => {
    const l = (v || "").toLowerCase();
    return l.includes("buy") ? "buy" : l.includes("avoid") ? "avoid" : "hold";
  };
  const vColor = { buy: "#22c55e", avoid: "#ef4444", hold: "#eab308" };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", color: "#e2e8f0", background: "#0f0f1a", minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#818cf8", fontWeight: 600, marginBottom: 4 }}>AI-POWERED</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#818cf8,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Stock Analyzer</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0" }}>Technical analysis, entry timing & buy/sell signals</p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setShowSettings((value) => !value)}
            style={{ border: "1px solid #2a2a4a", background: "#1a1a2e", color: "#cbd5e1",
              borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>
            {showSettings ? "Hide settings" : `Settings: ${selectedProvider.name}`}
          </button>
        </div>

        {showSettings && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12, letterSpacing: 1 }}>MODEL SETTINGS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                Provider
                <select value={provider} onChange={changeProvider}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e2e8f0" }}>
                  {PROVIDERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                Model
                <select value={model} onChange={(event) => setModel(event.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e2e8f0" }}>
                  {selectedProvider.models.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
              API key (optional when configured on the server)
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off" placeholder="Key is sent only with this analysis request"
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e2e8f0" }} />
            </label>
          </Card>
        )}

        {/* Search */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="Enter ticker (e.g. AAPL, TSLA, NVDA)"
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #2a2a4a", background: "#1a1a2e", color: "#e2e8f0", fontSize: 15, outline: "none" }} />
          <button onClick={analyze} disabled={loading}
            style={{ padding: "12px 24px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14,
              background: loading ? "#334155" : "linear-gradient(135deg,#818cf8,#6366f1)",
              color: "#fff", cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ width: 40, height: 40, border: "3px solid #2a2a4a", borderTopColor: "#818cf8",
              borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "#818cf8", fontWeight: 600, fontSize: 14 }}>{loadMsg}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </Card>
        )}

        {error && <Card style={{ borderColor: "#ef4444" }}><p style={{ color: "#ef4444", margin: 0, fontSize: 14 }}>{error}</p></Card>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Price + Verdict */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{data.ticker}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{data.company_name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700 }}>${data.current_price}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: data.change_percent_today >= 0 ? "#22c55e" : "#ef4444" }}>
                      {data.change_percent_today >= 0 ? "+" : ""}{data.change_percent_today}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    52W: ${data.week_52_low} — ${data.week_52_high} · MCap: {data.market_cap} · P/E: {data.pe_ratio}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>VERDICT</div>
                  <div style={{ fontSize: 20, fontWeight: 800, padding: "8px 20px", borderRadius: 10,
                    background: `${vColor[vType(data.verdict)]}22`, color: vColor[vType(data.verdict)] }}>
                    {data.verdict}
                  </div>
                </div>
              </div>
            </Card>

            {/* Scores */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14, letterSpacing: 1 }}>SCORES</div>
              <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 }}>
                <ScoreGauge score={data.overall_score} label="OVERALL" size={110} />
                <ScoreGauge score={data.scores.technical.score} label="Technical" />
                <ScoreGauge score={data.scores.momentum.score} label="Momentum" />
                <ScoreGauge score={data.scores.valuation.score} label="Valuation" />
                <ScoreGauge score={data.scores.trend_strength.score} label="Trend" />
              </div>
            </Card>

            {/* Entry Timing */}
            <Card style={{ borderColor: data.entry_timing?.is_good_entry ? "#22c55e33" : "#ef444433" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{data.entry_timing?.is_good_entry ? "🟢" : "🔴"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: 1 }}>ENTRY TIMING</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: data.entry_timing?.is_good_entry ? "#22c55e" : "#ef4444" }}>
                    {data.entry_timing?.is_good_entry ? "Good time to enter" : "Wait for better entry"}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, margin: "0 0 12px" }}>{data.entry_timing?.recommendation}</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[["Entry", data.entry_timing?.ideal_entry_price, "#818cf8"],
                  ["Stop Loss", data.entry_timing?.stop_loss, "#ef4444"],
                  ["Target", data.entry_timing?.target_price, "#22c55e"]].map(([l, v, c]) => (
                  <div key={l} style={{ flex: "1 1 100px", background: "#0f0f1a", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c }}>${v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Technical Indicators */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14, letterSpacing: 1 }}>TECHNICAL INDICATORS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {[["RSI (14)", data.indicators.rsi_14.value, data.indicators.rsi_14.signal],
                  ["MACD", null, data.indicators.macd.signal, data.indicators.macd.detail],
                  ["50 MA", `$${data.indicators.moving_avg_50.price}`, data.indicators.moving_avg_50.position],
                  ["200 MA", `$${data.indicators.moving_avg_200.price}`, data.indicators.moving_avg_200.position],
                  ["Bollinger", null, data.indicators.bollinger.position, data.indicators.bollinger.detail],
                  ["Volume", null, data.indicators.volume_trend.signal, data.indicators.volume_trend.detail]
                ].map(([label, val, signal, detail]) => (
                  <div key={label} style={{ background: "#0f0f1a", borderRadius: 8, padding: "10px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
                      {val && <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{val}</div>}
                      {detail && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{detail}</div>}
                    </div>
                    <SignalBadge signal={signal} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div style={{ flex: 1, background: "#0f0f1a", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Support</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>${data.indicators.support_level}</div>
                </div>
                <div style={{ flex: 1, background: "#0f0f1a", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Resistance</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>${data.indicators.resistance_level}</div>
                </div>
              </div>
            </Card>

            {/* Trend */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12, letterSpacing: 1 }}>TREND DIRECTION</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[["Short-Term", data.trend.short_term], ["Medium-Term", data.trend.medium_term], ["Long-Term", data.trend.long_term]].map(([l, v]) => (
                  <div key={l} style={{ flex: "1 1 100px", textAlign: "center", background: "#0f0f1a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
                    <div style={{ marginTop: 4 }}><SignalBadge signal={v} /></div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Summary */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 1 }}>ANALYSIS SUMMARY</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#cbd5e1", margin: 0 }}>{data.summary}</p>
            </Card>

            {/* Risks & Catalysts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 10, letterSpacing: 1 }}>⚠ RISKS</div>
                {data.risks?.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#cbd5e1", padding: "6px 0",
                    borderBottom: i < data.risks.length - 1 ? "1px solid #1e293b" : "none" }}>{r}</div>
                ))}
              </Card>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 10, letterSpacing: 1 }}>🚀 CATALYSTS</div>
                {data.catalysts?.map((c, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#cbd5e1", padding: "6px 0",
                    borderBottom: i < data.catalysts.length - 1 ? "1px solid #1e293b" : "none" }}>{c}</div>
                ))}
              </Card>
            </div>

            <div style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: "12px 0", borderTop: "1px solid #1e293b", marginTop: 8 }}>
              ⚠️ Not financial advice. AI-generated analysis for informational purposes only. Always do your own research.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
