import { getPool, verifyToken, withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id: user_id } = verifyToken(req);
    const { symbol, strategy_type, date_from, date_to, total_signals,
            wins, losses, win_rate, total_pnl, avg_confidence, results_json } = req.body || {};
    const db = getPool();
    const { rows } = await db.query(
      `INSERT INTO backtests (user_id, symbol, strategy_type, date_from, date_to,
        total_signals, wins, losses, win_rate, total_pnl, avg_confidence, results_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [user_id, symbol, strategy_type, date_from, date_to,
       total_signals, wins, losses, win_rate, total_pnl, avg_confidence, JSON.stringify(results_json)]
    );
    return res.status(201).json({ backtest: rows[0] });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});
