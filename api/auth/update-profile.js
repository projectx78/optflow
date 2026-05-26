import { getPool, verifyToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id } = verifyToken(req);
    const { full_name, whatsapp, phone, alert_min_confidence, alerts_enabled } = req.body || {};
    const db = getPool();
    const { rows } = await db.query(
      `UPDATE users SET
        full_name            = COALESCE($1, full_name),
        whatsapp             = COALESCE($2, whatsapp),
        phone                = COALESCE($3, phone),
        alert_min_confidence = COALESCE($4, alert_min_confidence),
        alerts_enabled       = COALESCE($5, alerts_enabled)
      WHERE id=$6
      RETURNING id, email, full_name, plan, whatsapp, phone, alert_min_confidence, alerts_enabled`,
      [full_name, whatsapp, phone, alert_min_confidence, alerts_enabled, id]
    );
    return res.status(200).json({ user: rows[0] });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
