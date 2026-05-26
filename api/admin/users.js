import { getPool, verifyToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { plan } = verifyToken(req);
    if (plan !== "admin") return res.status(403).json({ error: "Forbidden" });
    const db = getPool();
    const { rows } = await db.query(
      "SELECT * FROM admin_overview ORDER BY created_at DESC"
    );
    return res.status(200).json({ users: rows });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
