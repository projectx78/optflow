// api/optionchain.js — NSE option chain proxy with session cookie handling
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const symbol = req.query.symbol === "BANKNIFTY" ? "BANKNIFTY" : "NIFTY";

  try {
    const cookieRes = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const cookies = cookieRes.headers.get("set-cookie") || "";

    const ocRes = await fetch(
      `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.5",
          "Referer": "https://www.nseindia.com/option-chain",
          "Cookie": cookies,
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!ocRes.ok) return res.status(ocRes.status).json({ error: `NSE returned ${ocRes.status}` });

    const data = await ocRes.json();
    res.setHeader("Cache-Control", "s-maxage=25, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
