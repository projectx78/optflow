import { getPool, verifyToken, withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id: user_id } = verifyToken(req);
    const db = getPool();
    const { rows } = await db.query(
      "SELECT * FROM signals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200",
      [user_id]
    );
    return res.status(200).json({ signals: rows });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});
