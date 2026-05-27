// NSE blocks cold requests from cloud IPs.
// Fix: fetch the option-chain PAGE first (not just homepage) to get a valid session,
// wait briefly, then hit the JSON API with that session cookie.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseCookies(raw) {
  if (!raw) return "";
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts.map(c => c.split(";")[0]).join("; ");
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getSession() {
  // Step 1: hit homepage
  const r1 = await fetch("https://www.nseindia.com/", {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
  });
  const c1 = parseCookies(r1.headers.getSetCookie?.() || r1.headers.get("set-cookie") || "");

  await wait(600);

  // Step 2: hit the option-chain page itself (gives NSE the right referral chain)
  const r2 = await fetch("https://www.nseindia.com/option-chain", {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.nseindia.com/",
      "Cookie": c1,
      "Connection": "keep-alive",
    },
  });
  const c2 = parseCookies(r2.headers.getSetCookie?.() || r2.headers.get("set-cookie") || "");
  const merged = [c1, c2].filter(Boolean).join("; ");

  await wait(400);
  return merged;
}

import { withCors } from "./_db.js";

export default withCors(async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const symbol = req.query.symbol === "BANKNIFTY" ? "BANKNIFTY" : "NIFTY";

  try {
    const cookies = await getSession();

    const ocRes = await fetch(
      `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`,
      {
        headers: {
          "User-Agent": UA,
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Referer": "https://www.nseindia.com/option-chain",
          "Cookie": cookies,
          "X-Requested-With": "XMLHttpRequest",
          "Connection": "keep-alive",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
      }
    );

    if (!ocRes.ok) {
      return res.status(ocRes.status).json({ error: `NSE returned ${ocRes.status}` });
    }

    const data = await ocRes.json();
    res.setHeader("Cache-Control", "s-maxage=25, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("OC proxy error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
