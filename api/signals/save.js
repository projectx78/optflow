import { getPool, verifyToken, withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id: user_id } = verifyToken(req);
    const { symbol, expiry, direction, confidence, strategy_type, signal_json, strategy_json, pcr, spot } = req.body || {};
    const db = getPool();
    const { rows } = await db.query(
      `INSERT INTO signals (user_id, symbol, expiry, direction, confidence, strategy_type, signal_json, strategy_json, pcr, spot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [user_id, symbol, expiry, direction, confidence, strategy_type,
       JSON.stringify(signal_json), JSON.stringify(strategy_json), pcr, spot]
    );
    return res.status(201).json({ id: rows[0].id });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});
