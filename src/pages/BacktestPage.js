import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { COLORS, SL, Pill, Card, Btn, Spinner, fmt, fmtP } from "../components/UI";

// Simulate strategy P&L from signal confidence + direction
// In production replace with real historical price data from NSE
function simulateTrade(signal, spot) {
  if (!signal || signal.direction === "WAIT") return { pnl: 0, result: "SCRATCH" };
  const conf = signal.confidence || 50;
  // simplified: high confidence = higher hit rate, random outcome weighted by conf
  const hitRate = conf / 100;
  const isWin = Math.random() < hitRate;
  const lotSize = signal.symbol === "BANKNIFTY" ? 15 : 50;
  const premium = signal.strategy_type === "Bull Call Spread" || signal.strategy_type === "Bear Put Spread" ? 80 : 120;
  const pnl = isWin ? premium * lotSize * 0.6 : -premium * lotSize;
  return { pnl: Math.round(pnl), result: isWin ? "WIN" : "LOSS" };
}

export default function BacktestPage() {
  const { user } = useAuth();
  const [signals, setSignals]     = useState([]);
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [running, setRunning]     = useState(false);
  const [saved, setSaved]         = useState([]);
  const [filters, setFilters]     = useState({ symbol: "ALL", minConf: 60, strategy: "ALL" });

  const setF = (k) => (e) => setFilters(p => ({ ...p, [k]: e.target.value }));

  const loadSignals = useCallback(async () => {
    setLoading(true);
    const { signals: data } = await apiFetch("/api/signals/list");
    setSignals(data || []);
    setLoading(false);
  }, [user]);

  const loadSaved = useCallback(async () => {
    const { backtests: data } = await apiFetch("/api/backtests/list");
    setSaved(data || []);
  }, [user]);

  useEffect(() => { loadSignals(); loadSaved(); }, [loadSignals, loadSaved]);

  const runBacktest = async () => {
    setRunning(true);
    const filtered = signals.filter(s => {
      if (filters.symbol !== "ALL" && s.symbol !== filters.symbol) return false;
      if ((s.confidence || 0) < parseInt(filters.minConf)) return false;
      if (filters.strategy !== "ALL" && s.strategy_type !== filters.strategy) return false;
      return s.direction !== "WAIT";
    });

    // simulate each signal
    const res = filtered.map(s => {
      const sim = simulateTrade(s.signal_json, s.spot);
      return { ...s, sim_pnl: sim.pnl, sim_result: sim.result };
    });

    // build cumulative
    let cum = 0;
    const withCum = res.map((r, i) => {
      cum += r.sim_pnl;
      return { ...r, cum, idx: i + 1 };
    });

    setResults(withCum);

    // save to DB
    if (withCum.length > 0) {
      const wins   = withCum.filter(r => r.sim_result === "WIN").length;
      const losses = withCum.filter(r => r.sim_result === "LOSS").length;
      await apiFetch("/api/backtests/save", { method: "POST", body: {
        symbol: filters.symbol,
        strategy_type: filters.strategy,
        total_signals: withCum.length,
        wins, losses,
        win_rate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
        total_pnl: cum,
        avg_confidence: Math.round(withCum.reduce((s, r) => s + (r.confidence || 0), 0) / withCum.length),
        results_json: withCum.slice(0, 50),
        date_from: withCum[withCum.length - 1]?.created_at?.split("T")[0],
        date_to:   withCum[0]?.created_at?.split("T")[0],
      }});
      loadSaved();
    }
    setRunning(false);
  };

  const wins       = results.filter(r => r.sim_result === "WIN").length;
  const losses     = results.filter(r => r.sim_result === "LOSS").length;
  const winRate    = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : null;
  const totalPnl   = results.reduce((s, r) => s + (r.sim_pnl || 0), 0);
  const avgConf    = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.confidence || 0), 0) / results.length) : 0;
  const maxDrawdown = (() => {
    let peak = 0, maxDD = 0;
    results.forEach(r => {
      if (r.cum > peak) peak = r.cum;
      const dd = peak - r.cum;
      if (dd > maxDD) maxDD = dd;
    });
    return Math.round(maxDD);
  })();

  const strategies = ["ALL", ...new Set(signals.map(s => s.strategy_type).filter(Boolean))];

  return (
    <div>
      <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 16 }}>BACKTESTING ENGINE</div>

      {/* filter controls */}
      <Card style={{ marginBottom: 16 }}>
        <SL>BACKTEST PARAMETERS</SL>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[
            { label: "SYMBOL", key: "symbol", opts: ["ALL","NIFTY","BANKNIFTY"] },
            { label: "MIN CONFIDENCE %", key: "minConf", opts: ["50","60","70","75","80"] },
            { label: "STRATEGY", key: "strategy", opts: strategies },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>{label}</div>
              <select value={filters[key]} onChange={setF(key)}
                style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 7, padding: "8px 12px", color: "#d0d0d0", fontSize: 12, outline: "none", cursor: "pointer" }}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <Btn onClick={runBacktest} disabled={running || signals.length === 0}>
            {running ? "RUNNING…" : `▶ RUN ON ${signals.filter(s => s.direction !== "WAIT").length} SIGNALS`}
          </Btn>
        </div>
        {signals.length === 0 && !loading && (
          <div style={{ fontSize: 11, color: "#333", marginTop: 10 }}>
            No signals found. Run chart analyses first to generate backtest data.
          </div>
        )}
      </Card>

      {(loading || running) && <Spinner msg={loading ? "Loading signals…" : "Running simulation…"} />}

      {results.length > 0 && (
        <>
          {/* result pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Pill label="SIGNALS"   value={results.length}                    color={COLORS.info} />
            <Pill label="WIN RATE"  value={winRate != null ? `${winRate}%` : "—"} color={winRate > 55 ? COLORS.bull : winRate > 40 ? COLORS.neutral : COLORS.bear} />
            <Pill label="NET P&L"   value={fmtP(totalPnl)}                    color={totalPnl >= 0 ? COLORS.bull : COLORS.bear} />
            <Pill label="MAX DD"    value={`₹${fmt(maxDrawdown)}`}            color={COLORS.bear} />
            <Pill label="AVG CONF"  value={`${avgConf}%`}                     color={COLORS.neutral} />
          </div>

          {/* Equity curve */}
          <Card style={{ marginBottom: 16 }}>
            <SL>EQUITY CURVE (SIMULATED)</SL>
            <div style={{ fontSize: 9, color: "#333", marginBottom: 8 }}>
              Note: Simulation uses confidence-weighted probability. Replace with real NSE historical data for production accuracy.
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={results}>
                <XAxis dataKey="idx" stroke="#222" tick={{ fill: "#444", fontSize: 9 }} />
                <YAxis stroke="#222" tick={{ fill: "#444", fontSize: 9 }} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, fontSize: 11 }}
                  formatter={(v, n) => [`₹${v}`, n === "cum" ? "Cumulative" : "Trade P&L"]}
                  labelFormatter={l => `Trade #${l}`} />
                <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="cum"     stroke={totalPnl >= 0 ? COLORS.bull : COLORS.bear} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sim_pnl" stroke="#333" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Trade-by-trade */}
          <Card>
            <SL>SIGNAL-BY-SIGNAL RESULTS</SL>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1a", color: "#444" }}>
                    {["#","DATE","SYMBOL","DIRECTION","STRATEGY","CONF","SIM P&L","RESULT"].map(h => (
                      <td key={h} style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{h}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const rc = r.sim_result === "WIN" ? COLORS.bull : r.sim_result === "LOSS" ? COLORS.bear : COLORS.neutral;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #0d0d0d", background: i % 2 === 0 ? "#050505" : "transparent" }}>
                        <td style={{ padding: "5px 8px", color: "#444" }}>{i + 1}</td>
                        <td style={{ padding: "5px 8px", color: "#555" }}>{r.created_at?.split("T")[0]}</td>
                        <td style={{ padding: "5px 8px", color: COLORS.neutral }}>{r.symbol}</td>
                        <td style={{ padding: "5px 8px", color: r.direction === "CALL" ? COLORS.bull : COLORS.bear }}>{r.direction}</td>
                        <td style={{ padding: "5px 8px", color: "#666", fontSize: 10 }}>{r.strategy_type || "—"}</td>
                        <td style={{ padding: "5px 8px", color: COLORS.info }}>{r.confidence}%</td>
                        <td style={{ padding: "5px 8px", color: r.sim_pnl >= 0 ? COLORS.bull : COLORS.bear, fontWeight: 700 }}>{fmtP(r.sim_pnl)}</td>
                        <td style={{ padding: "5px 8px" }}>
                          <span style={{ color: rc, background: rc + "18", border: `1px solid ${rc}33`, borderRadius: 4, padding: "2px 7px", fontSize: 9 }}>{r.sim_result}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Past backtests */}
      {saved.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SL>SAVED BACKTEST RUNS</SL>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {saved.map(bt => (
              <Card key={bt.id} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Pill label="SYMBOL"   value={bt.symbol}                  color={COLORS.info} />
                <Pill label="SIGNALS"  value={bt.total_signals}           color="#888" />
                <Pill label="WIN RATE" value={`${Math.round(bt.win_rate)}%`} color={bt.win_rate > 55 ? COLORS.bull : COLORS.bear} />
                <Pill label="NET P&L"  value={fmtP(Math.round(bt.total_pnl))} color={bt.total_pnl >= 0 ? COLORS.bull : COLORS.bear} />
                <span style={{ fontSize: 10, color: "#333", marginLeft: "auto" }}>{bt.created_at?.split("T")[0]}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
