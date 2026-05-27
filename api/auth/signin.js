import bcrypt from "bcryptjs";
import { getPool, signToken, withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const db = getPool();
  try {
    const { rows } = await db.query(
      "SELECT id, email, password_hash, full_name, plan, whatsapp, phone, alert_min_confidence, alerts_enabled FROM users WHERE email=$1",
      [email.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const { password_hash, ...profile } = user;
    const token = signToken({ id: user.id, email: user.email, plan: user.plan });
    return res.status(200).json({ token, user: profile });
  } catch (e) {
    console.error("signin error", e.message);
    return res.status(500).json({ error: "Signin failed" });
  }
});
