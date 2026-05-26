import { getPool, verifyToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id: user_id } = verifyToken(req);
    const { id, result } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const db = getPool();
    await db.query(
      "UPDATE trades SET result=$1 WHERE id=$2 AND user_id=$3",
      [result, id, user_id]
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
