import { useEffect, useRef, useState } from "react";

const colors = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#eab308",
  accent: "#818cf8",
};

function Card({ children }) {
  return (
    <section style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: 18 }}>
      {children}
    </section>
  );
}

function signalColor(value = "") {
  const signal = value.toLowerCase();
  if (/buy|bull|above|accumul|oversold/.test(signal)) return colors.positive;
  if (/avoid|bear|below|distribut|overbought/.test(signal)) return colors.negative;
  return colors.neutral;
}

function Signal({ value }) {
  const color = signalColor(value);
  return (
    <span style={{ color, background: `${color}22`, borderRadius: 6, padding: "3px 9px", fontSize: 12 }}>
      {value}
    </span>
  );
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function analyze() {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol || !accessCode) {
      setError("Enter the private access code and a ticker symbol.");
      return;
    }

    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-token": accessCode,
        },
        body: JSON.stringify({ ticker: symbol }),
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis failed.");
      setData(result);
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f1a", color: "#e2e8f0", padding: "24px 16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>AI-POWERED</div>
          <h1 style={{ margin: "5px 0", fontSize: 30 }}>Stock Analyzer</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Private, server-managed AI analysis</p>
        </header>

        <Card>
          <div style={{ display: "grid", gap: 10 }}>
            <input type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)}
              autoComplete="off" placeholder="Private access code"
              style={{ padding: 12, borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e2e8f0" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())}
                onKeyDown={(event) => event.key === "Enter" && analyze()}
                placeholder="Ticker, e.g. AAPL"
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #2a2a4a", background: "#0f0f1a", color: "#e2e8f0" }} />
              <button onClick={analyze} disabled={loading}
                style={{ padding: "12px 20px", border: 0, borderRadius: 8, color: "white", fontWeight: 700,
                  cursor: loading ? "wait" : "pointer", background: loading ? "#334155" : colors.accent }}>
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>
        </Card>

        {error && <Card><div style={{ color: colors.negative }}>{error}</div></Card>}

        {data && (
          <>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{data.ticker} · {data.company_name}</h2>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>${data.current_price} {data.currency}</div>
                  <div style={{ color: data.change_percent_today >= 0 ? colors.positive : colors.negative }}>
                    {data.change_percent_today >= 0 ? "+" : ""}{data.change_percent_today}% today
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Signal value={data.verdict} />
                  <div style={{ fontSize: 30, fontWeight: 800, color: signalColor(data.verdict), marginTop: 10 }}>
                    {data.overall_score}/100
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3>Entry Timing</h3>
              <p>{data.entry_timing?.recommendation}</p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <span>Entry: <b>${data.entry_timing?.ideal_entry_price}</b></span>
                <span>Stop: <b>${data.entry_timing?.stop_loss}</b></span>
                <span>Target: <b>${data.entry_timing?.target_price}</b></span>
              </div>
            </Card>

            <Card>
              <h3>Technical Signals</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                <div>RSI: <Signal value={data.indicators?.rsi_14?.signal} /></div>
                <div>MACD: <Signal value={data.indicators?.macd?.signal} /></div>
                <div>50 MA: <Signal value={data.indicators?.moving_avg_50?.position} /></div>
                <div>200 MA: <Signal value={data.indicators?.moving_avg_200?.position} /></div>
                <div>Support: <b>${data.indicators?.support_level}</b></div>
                <div>Resistance: <b>${data.indicators?.resistance_level}</b></div>
              </div>
            </Card>

            <Card><h3>Summary</h3><p style={{ lineHeight: 1.6 }}>{data.summary}</p></Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <Card><h3 style={{ color: colors.negative }}>Risks</h3>{data.risks?.map((item) => <p key={item}>{item}</p>)}</Card>
              <Card><h3 style={{ color: colors.positive }}>Catalysts</h3>{data.catalysts?.map((item) => <p key={item}>{item}</p>)}</Card>
            </div>
          </>
        )}

        <footer style={{ color: "#64748b", textAlign: "center", fontSize: 11 }}>
          Not financial advice. Verify market data independently.
        </footer>
      </div>
    </main>
  );
}
