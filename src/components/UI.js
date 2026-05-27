// ── shared design tokens & tiny components ────────────────────────

export const COLORS = {
  bull:    "#39FF14",
  bear:    "#FF3CAC",
  neutral: "#FFB800",
  info:    "#00D4FF",
  bg:      "#030303",
  card:    "#080808",
  border:  "#1a1a1a",
  text:    "#e8e8e8",
  muted:   "#999",
};

export function SL({ children }) {
  return <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>{children}</div>;
}

export function Pill({ label, value, color = "#888" }) {
  return (
    <div style={{ background: color + "18", border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 10px", fontSize: 10, textAlign: "center", minWidth: 68 }}>
      <div style={{ color: "#aaa", marginBottom: 2, fontSize: 10 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</div>
    </div>
  );
}

export function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${accent ? accent + "33" : COLORS.border}`,
      borderRadius: 12, padding: "16px 18px", ...style,
    }}>{children}</div>
  );
}

export function Btn({ children, onClick, disabled, variant = "primary", small, style = {} }) {
  const colors = {
    primary: { border: COLORS.bull,  color: COLORS.bull,  bg: COLORS.bull  + "12" },
    danger:  { border: COLORS.bear,  color: COLORS.bear,  bg: COLORS.bear  + "12" },
    info:    { border: COLORS.info,  color: COLORS.info,  bg: COLORS.info  + "12" },
    ghost:   { border: COLORS.border, color: COLORS.muted, bg: "transparent" },
  };
  const c = colors[variant] || colors.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "5px 12px" : "10px 18px",
      background: disabled ? "#080808" : c.bg,
      border: `1px solid ${disabled ? "#1e1e1e" : c.border}`,
      borderRadius: 8, color: disabled ? "#2a2a2a" : c.color,
      fontSize: small ? 10 : 12, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", letterSpacing: 0.5, transition: "all .15s", ...style,
    }}>{children}</button>
  );
}

export function Spinner({ msg }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "24px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.bull, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
      {msg && <span style={{ color: "#aaa", fontSize: 12, marginLeft: 8 }}>{msg}</span>}
      <style>{`@keyframes pulse{0%,100%{transform:scale(.6);opacity:.3}50%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export const fmt  = (n) => n?.toLocaleString("en-IN") ?? "—";
export const fmtC = (n) => typeof n === "number" ? n.toFixed(2) : "—";
export const fmtP = (n) => typeof n === "number" ? (n >= 0 ? `+₹${fmt(n)}` : `-₹${fmt(Math.abs(n))}`) : "—";
