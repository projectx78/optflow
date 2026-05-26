import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { COLORS, SL, Card, Btn, Spinner } from "../components/UI";

export default function AlertsPage() {
  const { profile, updateProfile } = useAuth();
  const [form, setForm] = useState({
    whatsapp: profile?.whatsapp || "",
    phone:    profile?.phone    || "",
    alert_min_confidence: profile?.alert_min_confidence || 75,
    alerts_enabled: profile?.alerts_enabled || false,
  });
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg]         = useState(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true); setMsg(null);
    await updateProfile({ whatsapp: form.whatsapp, phone: form.phone, alert_min_confidence: parseInt(form.alert_min_confidence), alerts_enabled: form.alerts_enabled });
    setMsg({ type: "ok", text: "Settings saved!" });
    setSaving(false);
  };

  const testAlert = async () => {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch("/api/alerts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: form.whatsapp, phone: form.phone,
          message: `🟢 OPTIONS SIGNAL TEST\n\nSymbol: NIFTY\nSignal: ▲ CALL\nConfidence: 82%\nStrategy: Bull Call Spread\nExpiry: 0DTE\n\nThis is a test alert from your Options Signal app.`,
        }),
      });
      const data = await res.json();
      if (res.ok) setMsg({ type: "ok",  text: `Test sent! ${data.channels?.join(", ")} ✓` });
      else        setMsg({ type: "err", text: data.error || "Send failed." });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setTesting(false);
  };

  const inp = (label, key, type = "text") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: "#444", letterSpacing: 1, display: "block", marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key]} onChange={set(key)}
        style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: "11px 14px", color: "#e0e0e0", fontSize: 13, outline: "none" }} />
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 16 }}>ALERTS & NOTIFICATIONS</div>

      <Card style={{ marginBottom: 16 }}>
        <SL>ALERT CHANNELS</SL>
        <div style={{ fontSize: 11, color: "#333", marginBottom: 16 }}>
          Powered by Twilio. Add your TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE in Vercel env vars.
        </div>
        {inp("WHATSAPP NUMBER (with country code, e.g. +919876543210)", "whatsapp")}
        {inp("SMS PHONE NUMBER (with country code)", "phone")}
        {inp("MINIMUM CONFIDENCE TO ALERT (%)", "alert_min_confidence", "number")}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <input type="checkbox" id="ae" checked={form.alerts_enabled} onChange={set("alerts_enabled")}
            style={{ width: 16, height: 16, accentColor: COLORS.bull }} />
          <label htmlFor="ae" style={{ fontSize: 12, color: form.alerts_enabled ? COLORS.bull : "#555", cursor: "pointer" }}>
            Enable alerts when a high-confidence signal fires
          </label>
        </div>

        {msg && (
          <div style={{ background: msg.type === "ok" ? "#39FF1412" : "#f33312", border: `1px solid ${msg.type === "ok" ? "#39FF1433" : "#f33344"}`, borderRadius: 8, padding: "10px 14px", color: msg.type === "ok" ? COLORS.bull : "#f88", fontSize: 12, marginBottom: 14 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={save} disabled={saving}>{saving ? "SAVING…" : "SAVE SETTINGS"}</Btn>
          <Btn onClick={testAlert} disabled={testing || !form.whatsapp} variant="info">{testing ? "SENDING…" : "SEND TEST ALERT"}</Btn>
        </div>
      </Card>

      <Card>
        <SL>HOW IT WORKS</SL>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "📈", title: "Analysis runs", desc: "You upload charts and run an analysis." },
            { icon: "🔍", title: "Confidence check", desc: `If confidence ≥ ${form.alert_min_confidence}%, the alert fires automatically.` },
            { icon: "📱", title: "WhatsApp message", desc: "You receive a WhatsApp + SMS with direction, strategy, strikes and entry tips." },
            { icon: "⚡", title: "Instant delivery", desc: "Alerts are sent within seconds via Twilio's API." },
          ].map(s => (
            <div key={s.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
