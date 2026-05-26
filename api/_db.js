// Shared CockroachDB pool + JWT helpers for all API routes
import pkg from "pg";
const { Pool } = pkg;

let pool;
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

// JWT helpers
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change-me";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("No token");
  return jwt.verify(auth.slice(7), SECRET);
}
