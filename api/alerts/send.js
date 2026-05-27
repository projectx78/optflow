// api/alerts/send.js — Twilio WhatsApp + SMS alert
// Env vars needed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE
import { withCors } from "../_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { whatsapp, phone, message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE; // e.g. +14155238886 (Twilio sandbox)

  if (!sid || !token || !from) {
    return res.status(500).json({ error: "Twilio env vars not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE in Vercel." });
  }

  const auth    = Buffer.from(`${sid}:${token}`).toString("base64");
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${auth}` };
  const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  const sent    = [];
  const errors  = [];

  const sendMsg = async (to, fromNum) => {
    const body = new URLSearchParams({ From: fromNum, To: to, Body: message });
    const r = await fetch(baseUrl, { method: "POST", headers, body });
    const d = await r.json();
    if (r.ok) sent.push(to);
    else      errors.push({ to, error: d.message });
  };

  try {
    const tasks = [];
    if (whatsapp) tasks.push(sendMsg(`whatsapp:${whatsapp}`, `whatsapp:${from}`));
    if (phone)    tasks.push(sendMsg(phone, from));
    await Promise.all(tasks);

    return res.status(200).json({ ok: true, channels: sent, errors });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
