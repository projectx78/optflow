// Vercel cron: every minute during market hours Mon–Fri
// vercel.json schedule: "*/1 3-10 * * 1-5" (UTC = IST-5:30)

async function fetchOC(symbol) {
  const cookieRes = await fetch("https://www.nseindia.com", {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36", "Accept": "text/html,*/*" },
  });
  const cookies = cookieRes.headers.get("set-cookie") || "";
  const ocRes = await fetch(`https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, */*",
      "Referer": "https://www.nseindia.com/option-chain",
      "Cookie": cookies,
    },
  });
  if (!ocRes.ok) throw new Error(`NSE ${ocRes.status}`);
  return ocRes.json();
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const h = ist.getHours(), m = ist.getMinutes();
  const inMarket = day >= 1 && day <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));

  if (!inMarket) return res.status(200).json({ skipped: "Outside market hours" });

  try {
    const [nifty, banknifty] = await Promise.all([fetchOC("NIFTY"), fetchOC("BANKNIFTY")]);
    return res.status(200).json({
      ok: true,
      nifty_spot:     nifty.records?.underlyingValue,
      banknifty_spot: banknifty.records?.underlyingValue,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Cron OC refresh failed:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
