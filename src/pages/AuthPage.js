import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isNative } from "../lib/api";

const BULL  = "#39FF14";
const EMAIL_KEY = "optflow_saved_email";

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

function PinDots({ value, length = 4 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 28, marginTop: 8 }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{
          width: 18, height: 18, borderRadius: "50%",
          background: i < value.length ? BULL : "transparent",
          border: `2px solid ${i < value.length ? BULL : "#333"}`,
          boxShadow: i < value.length ? `0 0 8px ${BULL}88` : "none",
          transition: "all .15s",
        }} />
      ))}
    </div>
  );
}

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
            fontFamily: "inherit", transition: "background .1s",
            WebkitTapHighlightColor: "transparent",
          }}
          onTouchStart={(e) => { e.currentTarget.style.background = "#1a1a1a"; }}
          onTouchEnd={(e)   => { e.currentTarget.style.background = "#0d0d0d"; }}
        >{k}</button>
      ))}
    </div>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const mobile  = isNative();
  const PIN_LEN = 4;

  const savedEmail = localStorage.getItem(EMAIL_KEY) || "";

  const [mode,    setMode]    = useState("login");
  const [email,   setEmail]   = useState(savedEmail);
  const [pin,     setPin]     = useState("");
  const [name,    setName]    = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  // On mobile login: if we have a saved email, we only need the PIN
  const needsEmail = !mobile || mode === "signup" || !savedEmail;

  const submit = async (pinOverride) => {
    const pwd = mobile ? (pinOverride || pin) : password;
    if (mobile && pwd.length < PIN_LEN) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === "login") {
        await signIn(email, pwd);
        localStorage.setItem(EMAIL_KEY, email);
      } else {
        await signUp(email, pwd, name);
        localStorage.setItem(EMAIL_KEY, email);
        setSuccess("Account created! Sign in with your PIN.");
        setMode("login");
        setPin("");
      }
    } catch (e) {
      setError(e.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (d) => {
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LEN) setTimeout(() => submit(next), 120);
  };

  const forgetEmail = () => {
    localStorage.removeItem(EMAIL_KEY);
    setEmail("");
    setPin("");
    setError(null);
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logo}>OPTIONS SIGNAL</div>
        <div style={S.sub}>AI · NSE · BETA</div>

        {error   && <div style={S.err}>{error}</div>}
        {success && <div style={S.ok}>{success}</div>}

        {/* ── MOBILE LOGIN: just PIN, show saved email as greeting ── */}
        {mobile && mode === "login" && savedEmail ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>WELCOME BACK</div>
              <div style={{ fontSize: 14, color: "#ccc", fontWeight: 600 }}>{savedEmail}</div>
              <span style={{ ...S.link, fontSize: 10, marginTop: 6, display: "inline-block" }}
                onClick={forgetEmail}>Not you?</span>
            </div>
            <div style={{ fontSize: 11, color: "#aaa", letterSpacing: 1, textAlign: "center", marginBottom: 4 }}>
              ENTER YOUR PIN
            </div>
            <PinDots value={pin} length={PIN_LEN} />
            <PinPad onDigit={handleDigit} onDelete={() => setPin(p => p.slice(0, -1))} />
          </>
        ) : (
          <>
            {/* ── SIGNUP: name field ── */}
            {mode === "signup" && (
              <>
                <label style={S.label}>FULL NAME</label>
                <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </>
            )}

            {/* ── EMAIL (always shown on web; shown on signup or no saved email on mobile) ── */}
            {needsEmail && (
              <>
                <label style={S.label}>EMAIL</label>
                <input style={S.input} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@email.com"
                  autoCapitalize="none" autoCorrect="off" />
              </>
            )}

            {/* ── PIN pad (mobile) or password (web) ── */}
            {mobile ? (
              <>
                <div style={{ fontSize: 11, color: "#aaa", letterSpacing: 1, textAlign: "center", marginBottom: 4 }}>
                  {mode === "login" ? "ENTER YOUR PIN" : "SET A 4-DIGIT PIN"}
                </div>
                <PinDots value={pin} length={PIN_LEN} />
                <PinPad onDigit={handleDigit} onDelete={() => setPin(p => p.slice(0, -1))} />
              </>
            ) : (
              <>
                <label style={S.label}>PASSWORD</label>
                <input style={S.input} type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </>
            )}

            {!mobile && (
              <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}
                onClick={() => submit()} disabled={loading}>
                {loading ? "…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
              </button>
            )}

            {mobile && mode === "signup" && (
              <button style={{ ...S.btn, opacity: loading || pin.length < PIN_LEN ? 0.5 : 1 }}
                onClick={() => submit()} disabled={loading || pin.length < PIN_LEN}>
                {loading ? "…" : "CREATE ACCOUNT"}
              </button>
            )}
          </>
        )}

        <div style={S.toggle}>
          {mode === "login"
            ? <>No account? <span style={S.link} onClick={() => { setMode("signup"); setPin(""); setError(null); }}>Sign up free</span></>
            : <>Have an account? <span style={S.link} onClick={() => { setMode("login"); setPin(""); setError(null); }}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}
