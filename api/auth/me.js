import { getPool, verifyToken, withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id } = verifyToken(req);
    const db = getPool();
    const { rows } = await db.query(
      "SELECT id, email, full_name, plan, whatsapp, phone, alert_min_confidence, alerts_enabled, created_at FROM users WHERE id=$1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ user: rows[0] });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});
