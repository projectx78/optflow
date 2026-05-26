import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from "recharts";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { COLORS, SL, Pill, Card, Btn, Spinner, fmt, fmtP } from "../components/UI";

const RESULT_COLOR = { WIN: COLORS.bull, LOSS: COLORS.bear, SCRATCH: COLORS.neutral, OPEN: COLORS.info };

function TradeForm({ onSave, onCancel, signals = [] }) {
  const [form, setForm] = useState({
    symbol: "NIFTY", strategy_type: "Bull Call Spread", direction: "CALL",
    entry_price: "", exit_price: "", quantity: 1,
    premium_paid: "", premium_received: "", result: "OPEN", notes: "", signal_id: "",
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = (label, key, type = "text", opts) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>{label}</div>
      {opts ? (
        <select value={form[key]} onChange={set(key)} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 7, padding: "9px 12px", color: "#d0d0d0", fontSize: 12, outline: "none" }}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={set(key)}
          style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 7, padding: "9px 12px", color: "#d0d0d0", fontSize: 12, outline: "none" }} />
      )}
    </div>
  );
  return (
    <Card style={{ marginBottom: 20 }}>
      <SL>LOG NEW TRADE</SL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        {inp("SYMBOL", "symbol", "text", ["NIFTY","BANKNIFTY"])}
        {inp("STRATEGY", "strategy_type", "text", ["Bull Call Spread","Bear Put Spread","Short Strangle","Short Straddle","Long Call","Long Put"])}
        {inp("DIRECTION", "direction", "text", ["CALL","PUT","NEUTRAL"])}
        {inp("RESULT", "result", "text", ["OPEN","WIN","LOSS","SCRATCH"])}
        {inp("ENTRY PRICE ₹", "entry_price", "number")}
        {inp("EXIT PRICE ₹", "exit_price", "number")}
        {inp("PREMIUM PAID ₹", "premium_paid", "number")}
        {inp("PREMIUM RECEIVED ₹", "premium_received", "number")}
        {inp("QUANTITY (LOTS)", "quantity", "number")}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>NOTES</div>
        <textarea value={form.notes} onChange={set("notes")} rows={2}
          style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 7, padding: "9px 12px", color: "#d0d0d0", fontSize: 12, outline: "none", resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => onSave(form)}>SAVE TRADE</Btn>
        <Btn onClick={onCancel} variant="ghost">CANCEL</Btn>
      </div>
    </Card>
  );
}

export default function PnLPage() {
  const { user } = useAuth();
  const [trades, setTrades]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { trades: data } = await apiFetch("/api/trades/list");
    setTrades(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const saveTrade = async (form) => {
    const entry = {
      symbol: form.symbol, strategy_type: form.strategy_type, direction: form.direction,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price:  parseFloat(form.exit_price)  || null,
      quantity: parseInt(form.quantity) || 1,
      premium_paid:     parseFloat(form.premium_paid)     || null,
      premium_received: parseFloat(form.premium_received) || null,
      result: form.result, notes: form.notes,
    };
    await apiFetch("/api/trades/save", { method: "POST", body: entry });
    setShowForm(false);
    load();
  };

  const updateResult = async (id, result) => {
    await apiFetch("/api/trades/update", { method: "PATCH", body: { id, result } });
    setTrades(prev => prev.map(t => t.id === id ? { ...t, result } : t));
  };

  // compute stats
  const closed  = trades.filter(t => t.result !== "OPEN" && t.result !== null);
  const wins    = trades.filter(t => t.result === "WIN").length;
  const losses  = trades.filter(t => t.result === "LOSS").length;
  const winRate = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : null;
  const totalPnl = trades.reduce((s, t) => {
    const p = t.exit_price && t.entry_price ? (t.exit_price - t.entry_price) * (t.quantity || 1) : 0;
    return s + p;
  }, 0);

  // cumulative P&L for chart
  const cumData = (() => {
    let cum = 0;
    return [...trades].reverse().map((t, i) => {
      const p = t.exit_price && t.entry_price ? (t.exit_price - t.entry_price) * (t.quantity || 1) : 0;
      cum += p;
      return { name: `T${i + 1}`, pnl: p, cum, symbol: t.symbol };
    });
  })();

  // bar data by strategy
  const byStrategy = trades.reduce((acc, t) => {
    const key = t.strategy_type || "Unknown";
    if (!acc[key]) acc[key] = { wins: 0, losses: 0 };
    if (t.result === "WIN")  acc[key].wins++;
    if (t.result === "LOSS") acc[key].losses++;
    return acc;
  }, {});
  const stratData = Object.entries(byStrategy).map(([name, v]) => ({ name: name.replace(" ", "\n"), ...v }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 2 }}>P&L TRACKER</div>
        <Btn onClick={() => setShowForm(s => !s)} variant="primary">{showForm ? "CANCEL" : "+ LOG TRADE"}</Btn>
      </div>

      {/* summary pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <Pill label="TOTAL TRADES" value={trades.length}     color={COLORS.info} />
        <Pill label="WIN RATE"     value={winRate != null ? `${winRate}%` : "—"} color={winRate > 55 ? COLORS.bull : winRate > 40 ? COLORS.neutral : COLORS.bear} />
        <Pill label="WINS"         value={wins}               color={COLORS.bull} />
        <Pill label="LOSSES"       value={losses}             color={COLORS.bear} />
        <Pill label="NET P&L"      value={fmtP(Math.round(totalPnl))} color={totalPnl >= 0 ? COLORS.bull : COLORS.bear} />
      </div>

      {showForm && <TradeForm onSave={saveTrade} onCancel={() => setShowForm(false)} />}

      {loading && <Spinner msg="Loading trades…" />}

      {/* Cumulative P&L chart */}
      {cumData.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <SL>CUMULATIVE P&L (₹)</SL>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cumData}>
              <XAxis dataKey="name" stroke="#222" tick={{ fill: "#444", fontSize: 9 }} />
              <YAxis stroke="#222" tick={{ fill: "#444", fontSize: 9 }} tickFormatter={v => `₹${v}`} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`₹${v.toFixed(0)}`, "Cumulative"]} />
              <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="cum" stroke={totalPnl >= 0 ? COLORS.bull : COLORS.bear}
                strokeWidth={2} dot={false} style={{ filter: `drop-shadow(0 0 4px ${totalPnl >= 0 ? COLORS.bull : COLORS.bear}88)` }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Per-trade P&L bars */}
      {cumData.length > 1 && (
        <Card style={{ marginBottom: 16 }}>
          <SL>PER-TRADE P&L (₹)</SL>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={cumData}>
              <XAxis dataKey="name" stroke="#222" tick={{ fill: "#444", fontSize: 9 }} />
              <YAxis stroke="#222" tick={{ fill: "#444", fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`₹${v.toFixed(0)}`, "P&L"]} />
              <ReferenceLine y={0} stroke="#333" />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {cumData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? COLORS.bull : COLORS.bear} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Strategy breakdown */}
      {stratData.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SL>WIN/LOSS BY STRATEGY</SL>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stratData} layout="vertical">
              <XAxis type="number" stroke="#222" tick={{ fill: "#444", fontSize: 9 }} />
              <YAxis type="category" dataKey="name" stroke="#222" tick={{ fill: "#888", fontSize: 9 }} width={90} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="wins"   name="Wins"   fill={COLORS.bull} radius={[0,3,3,0]} />
              <Bar dataKey="losses" name="Losses" fill={COLORS.bear} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Trade list */}
      {!loading && trades.length === 0 && (
        <div style={{ color: "#1e1e1e", textAlign: "center", padding: "60px 0", fontSize: 12 }}>No trades yet. Log your first trade above.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {trades.map(t => {
          const pnl = t.exit_price && t.entry_price ? (t.exit_price - t.entry_price) * (t.quantity || 1) : null;
          const rc  = RESULT_COLOR[t.result] || "#555";
          return (
            <div key={t.id} style={{ background: "#080808", border: `1px solid ${rc}22`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: rc }}>{t.symbol}</span>
                  <span style={{ fontSize: 11, color: "#666" }}>{t.strategy_type}</span>
                  <span style={{ fontSize: 10, color: "#333" }}>{new Date(t.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {pnl !== null && <span style={{ fontSize: 13, color: pnl >= 0 ? COLORS.bull : COLORS.bear, fontWeight: 700 }}>{fmtP(Math.round(pnl))}</span>}
                  {["WIN","LOSS","SCRATCH"].map(r => (
                    <button key={r} onClick={() => updateResult(t.id, r)}
                      style={{ padding: "3px 8px", borderRadius: 5, fontSize: 9, cursor: "pointer",
                        background: t.result === r ? RESULT_COLOR[r] + "22" : "#111",
                        border: `1px solid ${t.result === r ? RESULT_COLOR[r] : "#222"}`,
                        color: t.result === r ? RESULT_COLOR[r] : "#444" }}>{r}</button>
                  ))}
                </div>
              </div>
              {t.notes && <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{t.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
