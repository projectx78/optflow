# Options Signal · AI · NSE — Beta

> AI-powered NIFTY & BANKNIFTY options trading signal analyzer with live option chain, strategy builder, P&L tracker, backtesting, WhatsApp alerts, and multi-user SaaS dashboard.

---

## Features

| Feature | Free | Pro | Admin |
|---|---|---|---|
| Chart analysis (AI signals) | 5/day | Unlimited | Unlimited |
| NIFTY & BANKNIFTY | ✓ | ✓ | ✓ |
| Strategy builder | ✓ | ✓ | ✓ |
| Live option chain | ✓ | ✓ + auto-refresh | ✓ |
| PCR gauge | ✓ | ✓ | ✓ |
| P&L tracker | Basic | Full + charts | Full |
| Backtesting | ✗ | ✓ | ✓ |
| WhatsApp/SMS alerts | ✗ | ✓ | ✓ |
| Admin dashboard | ✗ | ✗ | ✓ |

---

## Deploy in 5 Steps

### Step 1 — Create Supabase project (free)

1. Go to https://supabase.com → New Project
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Go to **SQL Editor** → paste the entire contents of `supabase-schema.sql` → Run

### Step 2 — Get your API keys

| Service | Where | Purpose |
|---|---|---|
| Anthropic | https://console.anthropic.com | AI chart analysis |
| Supabase URL | Supabase → Settings → API | Database + auth |
| Supabase Anon Key | Supabase → Settings → API | Database + auth |
| Twilio (optional) | https://twilio.com | WhatsApp + SMS alerts |

### Step 3 — Push to GitHub

```bash
cd options-signal-beta
npm install
git init
git add .
git commit -m "Options Signal Beta v2"
```
Go to https://github.com/new → create repo → push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/options-signal-beta.git
git push -u origin main
```

### Step 4 — Deploy on Vercel

1. Go to https://vercel.com/new → Import your GitHub repo
2. **Before clicking Deploy**, go to **Environment Variables** and add all of these:

```
ANTHROPIC_API_KEY          = sk-ant-...
REACT_APP_SUPABASE_URL     = https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY  = eyJ...   (for cron job — Supabase Settings → API → service_role)
TWILIO_ACCOUNT_SID         = ACxxx   (optional, for alerts)
TWILIO_AUTH_TOKEN          = xxx     (optional)
TWILIO_PHONE               = +14155238886  (optional, Twilio sandbox number)
CRON_SECRET                = any-random-string-you-choose
```

3. Click **Deploy** → live in ~60 seconds

### Step 5 — Set yourself as Admin

After deploying and signing up:
1. Go to Supabase → Table Editor → profiles
2. Find your row → change `plan` from `free` to `admin`
3. Refresh the app → Admin tab appears

---

## Project Structure

```
options-signal-beta/
├── public/
│   └── index.html
├── src/
│   ├── index.js              # Entry point + auth gate
│   ├── App.js                # Main app (all tabs)
│   ├── lib/
│   │   └── supabase.js       # Supabase client
│   ├── context/
│   │   └── AuthContext.js    # Auth provider
│   ├── components/
│   │   └── UI.js             # Shared design tokens + components
│   └── pages/
│       ├── AuthPage.js       # Login / signup
│       ├── PnLPage.js        # P&L tracker with Recharts
│       ├── BacktestPage.js   # Backtesting engine
│       ├── AlertsPage.js     # WhatsApp/SMS alert settings
│       └── AdminPage.js      # Admin dashboard
├── api/
│   ├── analyze.js            # Anthropic API proxy
│   ├── optionchain.js        # NSE option chain proxy
│   ├── alerts/
│   │   └── send.js           # Twilio WhatsApp + SMS
│   └── cron/
│       └── refresh-oc.js     # Auto-refresh OC every 30s (market hours)
├── vercel.json               # Cron schedule config
├── supabase-schema.sql       # Full database schema — run in Supabase SQL editor
├── package.json
└── README.md
```

---

## How to Use

1. **Sign up** → create your account
2. **Analyze tab** → select NIFTY or BANKNIFTY, upload 1m/3m/5m/15m chart screenshots → click Analyze
3. **Strategy tab** → view the AI-recommended intraday strategy (Bull Call Spread / Bear Put Spread / Short Strangle)
4. **Option Chain tab** → view live NSE data with PCR gauge and OI heatmap
5. **P&L tab** → log every trade, mark WIN/LOSS/SCRATCH, view equity curve
6. **Backtest tab** → replay all stored signals to see historical performance
7. **Alerts tab** → add your WhatsApp number, set minimum confidence, get notified on strong signals

---

## Upgrading Users to Pro

In Supabase → Table Editor → profiles → find user → change `plan` to `pro` or `admin`.

> For a production SaaS, integrate Razorpay/Stripe and auto-update the plan field on payment confirmation.

---

*Not financial advice. Always manage your risk and position size.*
