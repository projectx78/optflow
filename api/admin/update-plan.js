import { getPool, verifyToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { plan: callerPlan } = verifyToken(req);
    if (callerPlan !== "admin") return res.status(403).json({ error: "Forbidden" });
    const { id, plan } = req.body || {};
    if (!id || !plan) return res.status(400).json({ error: "id and plan required" });
    const db = getPool();
    await db.query("UPDATE users SET plan=$1 WHERE id=$2", [plan, id]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
