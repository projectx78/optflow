import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isNative } from "../lib/api";

const BULL = "#39FF14";
const S = {
  wrap:   { minHeight: "100vh", background: "#030303", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Mono',monospace" },
  card:   { width: "100%", maxWidth: 400, background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "32px 28px" },
  logo:   { fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: "#fff", letterSpacing: 3, marginBottom: 4 },
  sub:    { fontSize: 11, color: "#888", letterSpacing: 1, marginBottom: 28 },
  label:  { fontSize: 10, color: "#aaa", letterSpacing: 1, marginBottom: 6, display: "block" },
  input:  { width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: "11px 14px", color: "#e0e0e0", fontSize: 13, outline: "none", marginBottom: 14, boxSizing: "border-box" },
  btn:    { width: "100%", padding: "13px", background: "linear-gradient(135deg,#39FF1415,#00D4FF08)", border: `1.5px solid ${BULL}`, borderRadius: 10, color: BULL, fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginTop: 6 },
  err:    { background: "#f33312", border: "1px solid #f33344", borderRadius: 8, padding: "10px 14px", color: "#f88", fontSize: 12, marginBottom: 14 },
  ok:     { background: "#39FF1412", border: "1px solid #39FF1444", borderRadius: 8, padding: "10px 14px", color: BULL, fontSize: 12, marginBottom: 14 },
  toggle: { textAlign: "center", marginTop: 18, fontSize: 11, color: "#888" },
  link:   { color: "#00D4FF", cursor: "pointer", textDecoration: "underline" },
};

// ── PIN dots display ──────────────────────────────────────────────
function PinDots({ value, length = 6 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24, marginTop: 8 }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: "50%",
          background: i < value.length ? BULL : "transparent",
          border: `2px solid ${i < value.length ? BULL : "#333"}`,
          boxShadow: i < value.length ? `0 0 8px ${BULL}88` : "none",
          transition: "all .15s",
        }} />
      ))}
    </div>
  );
}

// ── PIN numpad ────────────────────────────────────────────────────
function PinPad({ onDigit, onDelete }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
      {keys.map((k, i) => (
        <button key={i} onClick={() => k === "⌫" ? onDelete() : k ? onDigit(k) : null}
          disabled={!k}
          style={{
            padding: "18px 0", fontSize: k === "⌫" ? 20 : 22, fontWeight: 600,
            background: k ? "#0d0d0d" : "transparent",
            border: k ? "1px solid #1e1e1e" : "none",
            borderRadius: 12, color: k === "⌫" ? "#888" : "#e8e8e8",
            cursor: k ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "background .1s",
            WebkitTapHighlightColor: "transparent",
          }}
          onTouchStart={(e) => { e.currentTarget.style.background = "#1a1a1a"; }}
          onTouchEnd={(e) => { e.currentTarget.style.background = "#0d0d0d"; }}
        >{k}</button>
      ))}
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────
export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const mobile = isNative();
  const PIN_LEN = 4;

  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ email: "", password: "", full_name: "", pin: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const addDigit = (d) => {
    if (form.pin.length < PIN_LEN) setForm(p => ({ ...p, pin: p.pin + d }));
  };
  const delDigit = () => setForm(p => ({ ...p, pin: p.pin.slice(0, -1) }));

  const submit = async (pinOverride) => {
    const password = mobile ? (pinOverride || form.pin) : form.password;
    if (mobile && password.length < PIN_LEN) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === "login") {
        await signIn(form.email, password);
      } else {
        await signUp(form.email, password, form.full_name);
        setSuccess("Account created! Sign in with your PIN.");
        setMode("login");
        setForm(p => ({ ...p, pin: "" }));
      }
    } catch (e) {
      setError(e.message);
      setForm(p => ({ ...p, pin: "" }));
    } finally {
      setLoading(false);
    }
  };

  // auto-submit when PIN is complete
  const handleDigit = (d) => {
    const next = form.pin + d;
    setForm(p => ({ ...p, pin: next }));
    if (next.length === PIN_LEN) setTimeout(() => submit(next), 120);
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}>OPTIONS SIGNAL</div>
        <div style={S.sub}>AI · NSE · BETA</div>

        {error   && <div style={S.err}>{error}</div>}
        {success && <div style={S.ok}>{success}</div>}

        {mode === "signup" && (
          <>
            <label style={S.label}>FULL NAME</label>
            <input style={S.input} value={form.full_name} onChange={set("full_name")} placeholder="Your name" />
          </>
        )}

        <label style={S.label}>EMAIL</label>
        <input style={S.input} type="email" value={form.email} onChange={set("email")}
          placeholder="trader@email.com" autoCapitalize="none" autoCorrect="off" />

        {mobile ? (
          <>
            <label style={{ ...S.label, textAlign: "center", display: "block", marginTop: 8 }}>
              {mode === "login" ? "ENTER YOUR 6-DIGIT PIN" : "SET A 6-DIGIT PIN"}
            </label>
            <PinDots value={form.pin} length={PIN_LEN} />
            <PinPad onDigit={handleDigit} onDelete={delDigit} />
          </>
        ) : (
          <>
            <label style={S.label}>PASSWORD</label>
            <input style={S.input} type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
          </>
        )}

        {(!mobile || mode === "signup") && (
          <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={() => submit()} disabled={loading}>
            {loading ? "…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        )}

        <div style={S.toggle}>
          {mode === "login"
            ? <>No account? <span style={S.link} onClick={() => { setMode("signup"); setForm(p => ({ ...p, pin: "" })); }}>Sign up free</span></>
            : <>Have an account? <span style={S.link} onClick={() => { setMode("login"); setForm(p => ({ ...p, pin: "" })); }}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}
