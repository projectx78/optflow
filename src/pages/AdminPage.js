import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { COLORS, SL, Pill, Card, Btn, Spinner } from "../components/UI";

export default function AdminPage() {
  const { profile } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { users: u } = await apiFetch("/api/admin/users");
    setUsers(u || []);
    // aggregate stats
    if (u) {
      const plans = u.reduce((a, r) => { a[r.plan] = (a[r.plan] || 0) + 1; return a; }, {});
      setStats({ total: u.length, plans, signals: u.reduce((s, r) => s + (r.signal_count || 0), 0), trades: u.reduce((s, r) => s + (r.trade_count || 0), 0) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (profile?.plan === "admin") load(); }, [profile, load]);

  const upgradePlan = async (id, plan) => {
    await apiFetch("/api/admin/update-plan", { method: "PATCH", body: { id, plan } });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, plan } : u));
  };

  if (profile?.plan !== "admin") {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#1e1e1e", fontSize: 12 }}>
        🔒 Admin access only.<br /><br />
        <span style={{ color: "#333" }}>Contact the system administrator to request access.</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 16 }}>ADMIN DASHBOARD</div>

      {loading && <Spinner msg="Loading user data…" />}

      {stats && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Pill label="TOTAL USERS"   value={stats.total}              color={COLORS.info} />
          <Pill label="FREE USERS"    value={stats.plans.free  || 0}   color="#888" />
          <Pill label="PRO USERS"     value={stats.plans.pro   || 0}   color={COLORS.neutral} />
          <Pill label="TOTAL SIGNALS" value={stats.signals}            color={COLORS.bull} />
          <Pill label="TOTAL TRADES"  value={stats.trades}             color={COLORS.bear} />
        </div>
      )}

      {/* subscription tiers info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { plan: "free",  color: "#888",         label: "FREE",  features: ["5 analyses/day", "Option chain view", "Basic P&L tracker", "No alerts"] },
          { plan: "pro",   color: COLORS.neutral, label: "PRO",   features: ["Unlimited analyses", "Real-time OC refresh", "WhatsApp + SMS alerts", "Backtesting", "Full P&L + charts"] },
          { plan: "admin", color: COLORS.bull,    label: "ADMIN", features: ["Everything in Pro", "User management", "Admin dashboard", "Plan upgrades"] },
        ].map(t => (
          <Card key={t.plan} accent={t.color}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.color, letterSpacing: 2, marginBottom: 10 }}>{t.label}</div>
            {t.features.map(f => <div key={f} style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>✓ {f}</div>)}
          </Card>
        ))}
      </div>

      {/* user table */}
      {!loading && users.length > 0 && (
        <Card>
          <SL>ALL USERS</SL>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a", color: "#444" }}>
                  {["EMAIL","NAME","PLAN","SIGNALS","TRADES","JOINED","ACTIONS"].map(h => (
                    <td key={h} style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const pc = u.plan === "admin" ? COLORS.bull : u.plan === "pro" ? COLORS.neutral : "#555";
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid #0d0d0d", background: i % 2 === 0 ? "#050505" : "transparent" }}>
                      <td style={{ padding: "6px 8px", color: "#888" }}>{u.email}</td>
                      <td style={{ padding: "6px 8px", color: "#666" }}>{u.full_name || "—"}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ color: pc, background: pc + "18", border: `1px solid ${pc}33`, borderRadius: 4, padding: "2px 8px", fontSize: 9 }}>{u.plan?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "6px 8px", color: COLORS.bull }}>{u.signal_count || 0}</td>
                      <td style={{ padding: "6px 8px", color: COLORS.info }}>{u.trade_count  || 0}</td>
                      <td style={{ padding: "6px 8px", color: "#333" }}>{u.created_at?.split("T")[0]}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["free","pro","admin"].map(plan => (
                            <button key={plan} onClick={() => upgradePlan(u.id, plan)}
                              disabled={u.plan === plan}
                              style={{
                                padding: "2px 7px", borderRadius: 4, fontSize: 9, cursor: u.plan === plan ? "default" : "pointer",
                                background: u.plan === plan ? "#111" : "#0d0d0d",
                                border: `1px solid ${u.plan === plan ? "#333" : "#222"}`,
                                color: u.plan === plan ? "#333" : "#888",
                              }}>{plan}</button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
