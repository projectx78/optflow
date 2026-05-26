import bcrypt from "bcryptjs";
import { getPool, signToken } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const db = getPool();
  try {
    const exists = await db.query("SELECT id FROM users WHERE email=$1", [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      "INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id, email, full_name, plan, created_at",
      [email.toLowerCase(), password_hash, full_name || null]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, email: user.email, plan: user.plan });
    return res.status(201).json({ token, user });
  } catch (e) {
    console.error("signup error", e.message);
    return res.status(500).json({ error: "Signup failed" });
  }
}
