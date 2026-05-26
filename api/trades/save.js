import { getPool, verifyToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id: user_id } = verifyToken(req);
    const { symbol, strategy_type, direction, entry_price, exit_price, quantity,
            premium_paid, premium_received, result, notes, signal_id } = req.body || {};
    const db = getPool();
    const { rows } = await db.query(
      `INSERT INTO trades (user_id, signal_id, symbol, strategy_type, direction,
        entry_price, exit_price, quantity, premium_paid, premium_received, result, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [user_id, signal_id || null, symbol, strategy_type, direction,
       entry_price || null, exit_price || null, quantity || 1,
       premium_paid || null, premium_received || null, result || "OPEN", notes || null]
    );
    return res.status(201).json({ trade: rows[0] });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
