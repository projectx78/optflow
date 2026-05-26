import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const S = {
  wrap: { minHeight: "100vh", background: "#030303", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'IBM Plex Mono',monospace" },
  card: { width: "100%", maxWidth: 400, background: "#080808", border: "1px solid #1a1a1a", borderRadius: 16, padding: "32px 28px" },
  logo: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: "#fff", letterSpacing: 3, marginBottom: 4 },
  sub:  { fontSize: 11, color: "#333", letterSpacing: 1, marginBottom: 28 },
  label: { fontSize: 10, color: "#444", letterSpacing: 1, marginBottom: 6, display: "block" },
  input: { width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: "11px 14px", color: "#e0e0e0", fontSize: 13, outline: "none", marginBottom: 14 },
  btn:  { width: "100%", padding: "13px", background: "linear-gradient(135deg,#39FF1415,#00D4FF08)", border: "1.5px solid #39FF14", borderRadius: 10, color: "#39FF14", fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginTop: 6 },
  err:  { background: "#f33312", border: "1px solid #f33344", borderRadius: 8, padding: "10px 14px", color: "#f88", fontSize: 12, marginBottom: 14 },
  ok:   { background: "#39FF1412", border: "1px solid #39FF1444", borderRadius: 8, padding: "10px 14px", color: "#39FF14", fontSize: 12, marginBottom: 14 },
  toggle: { textAlign: "center", marginTop: 18, fontSize: 11, color: "#444" },
  link: { color: "#00D4FF", cursor: "pointer", textDecoration: "underline" },
};

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]   = useState("login"); // login | signup
  const [form, setForm]   = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === "login") {
        const { error: e } = await signIn(form.email, form.password);
        if (e) throw e;
      } else {
        const { error: e } = await signUp(form.email, form.password, form.full_name);
        if (e) throw e;
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
        <input style={S.input} type="email" value={form.email} onChange={set("email")} placeholder="trader@email.com" />
        <label style={S.label}>PASSWORD</label>
        <input style={S.input} type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />

        <button style={S.btn} onClick={submit} disabled={loading}>
          {loading ? "…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        <div style={S.toggle}>
          {mode === "login"
            ? <>No account? <span style={S.link} onClick={() => setMode("signup")}>Sign up free</span></>
            : <>Have an account? <span style={S.link} onClick={() => setMode("login")}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}
