import { useState, useRef, useCallback, useEffect } from "react";
import { apiFetch } from "./lib/api";
import { useAuth } from "./context/AuthContext";
import { COLORS, SL, Pill, Card, Btn, Spinner, fmt, fmtC } from "./components/UI";
import PnLPage      from "./pages/PnLPage";
import BacktestPage from "./pages/BacktestPage";
import AlertsPage   from "./pages/AlertsPage";
import AdminPage    from "./pages/AdminPage";

// ── constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES = [
  { id: "1m",  label: "1 MIN",  accent: COLORS.bull },
  { id: "3m",  label: "3 MIN",  accent: COLORS.info },
  { id: "5m",  label: "5 MIN",  accent: COLORS.neutral },
  { id: "15m", label: "15 MIN", accent: COLORS.bear },
];
const EXPIRY_OPTIONS = ["0DTE","1DTE","2DTE","Weekly","Monthly"];
const TABS = ["analyze","strategy","chain","pnl","backtest","alerts","admin"];
const TAB_ICONS  = { analyze:"📈", strategy:"🎯", chain:"⛓", pnl:"💰", backtest:"📊", alerts:"🔔", admin:"⚙️" };
const TAB_LABELS = { analyze:"Analyze", strategy:"Strategy", chain:"Option Chain", pnl:"P&L", backtest:"Backtest", alerts:"Alerts", admin:"Admin" };

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// ── UploadSlot ────────────────────────────────────────────────────────────────
function UploadSlot({ tf, img, onFile, onRemove }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);
  const accept = (file) => { if (file?.type.startsWith("image/")) onFile(tf.id, file); };
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); }}
      onClick={() => !img && inputRef.current.click()}
      style={{ position:"relative", aspectRatio:"16/9", borderRadius:10, border:`1.5px solid ${img||drag?tf.accent:"#1e1e1e"}`, background: img?"#000":drag?tf.accent+"0d":"#080808", cursor:img?"default":"pointer", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color .2s" }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={(e) => accept(e.target.files[0])} />
      {img ? (
        <>
          <img src={img.url} alt={tf.label} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,#000c)", padding:"18px 10px 7px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <span style={{ color:tf.accent, fontSize:11, fontWeight:700 }}>{tf.label} ✓</span>
            <button onClick={(e) => { e.stopPropagation(); onRemove(tf.id); }} style={{ background:"#f003", border:"1px solid #f005", borderRadius:6, width:22, height:22, color:"#f66", cursor:"pointer", fontSize:11 }}>✕</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign:"center", pointerEvents:"none" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", border:`1.5px dashed ${tf.accent}55`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:16 }}>+</div>
          <div style={{ color:tf.accent, fontSize:12, fontWeight:700, letterSpacing:1 }}>{tf.label}</div>
          <div style={{ color:"#333", fontSize:10, marginTop:3 }}>{drag?"drop it!":"click or drop"}</div>
        </div>
      )}
    </div>
  );
}

// ── AlignmentBar ──────────────────────────────────────────────────────────────
function AlignmentBar({ alignment }) {
  const icon = { bullish:"▲", bearish:"▼", neutral:"—" };
  const clr  = { bullish:COLORS.bull, bearish:COLORS.bear, neutral:"#555" };
  return (
    <div style={{ display:"flex", gap:8 }}>
      {TIMEFRAMES.map(tf => { const v = alignment?.[tf.id]||"neutral"; return (
        <div key={tf.id} style={{ flex:1, textAlign:"center", background:clr[v]+"14", border:`1px solid ${clr[v]}33`, borderRadius:8, padding:"7px 4px" }}>
          <div style={{ fontSize:9, color:"#444" }}>{tf.label}</div>
          <div style={{ color:clr[v], fontSize:14, marginTop:3 }}>{icon[v]}</div>
          <div style={{ color:clr[v]+"88", fontSize:8, marginTop:2 }}>{v}</div>
        </div>
      ); })}
    </div>
  );
}

// ── SignalCard ────────────────────────────────────────────────────────────────
function SignalCard({ signal }) {
  if (!signal) return null;
  const dc   = signal.direction==="CALL"?COLORS.bull:signal.direction==="PUT"?COLORS.bear:COLORS.neutral;
  const icon = signal.direction==="CALL"?"▲":signal.direction==="PUT"?"▼":"◈";
  return (
    <Card accent={dc} style={{ marginTop:16, animation:"fsIn .4s ease" }}>
      <style>{`@keyframes fsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:dc, letterSpacing:2, textShadow:`0 0 24px ${dc}88` }}>{icon} {signal.direction}</div>
          {signal.suggestedExpiry && <Pill label="EXPIRY" value={signal.suggestedExpiry} color={dc} />}
          {signal.strikeNote      && <Pill label="STRIKE" value={signal.strikeNote}      color={COLORS.neutral} />}
          <Pill label="CONFIDENCE" value={`${signal.confidence}%`} color={COLORS.info} />
        </div>
      </div>
      <div style={{ marginBottom:12 }}><SL>TIMEFRAME ALIGNMENT</SL><AlignmentBar alignment={signal.timeframeAlignment} /></div>
      {signal.keyLevels && (
        <div style={{ marginBottom:12 }}>
          <SL>KEY LEVELS</SL>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {signal.keyLevels.support    && <Pill label="SUPPORT"    value={signal.keyLevels.support}    color={COLORS.bull} />}
            {signal.keyLevels.resistance && <Pill label="RESISTANCE" value={signal.keyLevels.resistance} color={COLORS.bear} />}
            {signal.keyLevels.target     && <Pill label="TARGET"     value={signal.keyLevels.target}     color={COLORS.info} />}
          </div>
        </div>
      )}
      <div style={{ marginBottom:12 }}><SL>ANALYSIS</SL><p style={{ color:"#bbb", fontSize:13, lineHeight:1.7, margin:0 }}>{signal.rationale}</p></div>
      {signal.entryTips?.length>0 && (
        <div style={{ marginBottom:12 }}><SL>ENTRY TIPS</SL>
          <ul style={{ margin:0, padding:"0 0 0 16px", color:"#888", fontSize:12, lineHeight:1.8 }}>
            {signal.entryTips.map((t,i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
      {signal.risk && (
        <div style={{ background:"#FF980012", border:"1px solid #FF980033", borderRadius:8, padding:"10px 14px" }}>
          <SL>⚠ RISK / INVALIDATION</SL>
          <p style={{ color:"#FF980088", fontSize:12, lineHeight:1.5, margin:0 }}>{signal.risk}</p>
        </div>
      )}
    </Card>
  );
}

// ── StrategyCard ──────────────────────────────────────────────────────────────
function StrategyCard({ strategy }) {
  if (!strategy) return null;
  const typeColor = { "Bull Call Spread":COLORS.bull, "Bear Put Spread":COLORS.bear, "Short Strangle":COLORS.neutral, "Short Straddle":"#FF9800", "Wait":"#555" };
  const c = typeColor[strategy.type] || "#888";
  return (
    <Card accent={c} style={{ marginTop:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:c, letterSpacing:1 }}>{strategy.type}</div>
        <div style={{ fontSize:10, color:c+"99", background:c+"14", border:`1px solid ${c}33`, borderRadius:6, padding:"3px 10px" }}>{strategy.bias?.toUpperCase()}</div>
      </div>
      <div style={{ marginBottom:12 }}>
        <SL>TRADE LEGS</SL>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {strategy.legs?.map((leg,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:"#0d0d0d", borderRadius:8, padding:"8px 12px", border:"1px solid #1a1a1a" }}>
              <div style={{ width:28, height:28, borderRadius:6, background:leg.action==="BUY"?COLORS.bull+"22":COLORS.bear+"22", border:`1px solid ${leg.action==="BUY"?COLORS.bull:COLORS.bear}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:leg.action==="BUY"?COLORS.bull:COLORS.bear, fontWeight:700 }}>
                {leg.action==="BUY"?"B":"S"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:"#ddd", fontSize:12, fontWeight:600 }}>{leg.action} {leg.instrument} — Strike {leg.strike}</div>
                <div style={{ color:"#444", fontSize:10 }}>{leg.expiry} · Premium ≈ ₹{leg.premium}</div>
              </div>
              <div style={{ fontSize:11, color:leg.action==="BUY"?COLORS.bear:COLORS.bull, fontWeight:700 }}>
                {leg.action==="BUY"?`-₹${leg.premium}`:`+₹${leg.premium}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <SL>METRICS</SL>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {strategy.maxProfit  && <Pill label="MAX PROFIT" value={`₹${strategy.maxProfit}`}        color={COLORS.bull} />}
          {strategy.maxLoss    && <Pill label="MAX LOSS"   value={`₹${strategy.maxLoss}`}          color={COLORS.bear} />}
          {strategy.breakevens && <Pill label="BREAKEVEN"  value={strategy.breakevens.join(" / ")} color={COLORS.neutral} />}
          {strategy.rrr        && <Pill label="R:R"        value={strategy.rrr}                    color={COLORS.info} />}
        </div>
      </div>
      <div style={{ marginBottom:12 }}><SL>RATIONALE</SL><p style={{ color:"#aaa", fontSize:13, lineHeight:1.6, margin:0 }}>{strategy.rationale}</p></div>
      {strategy.exitRule && (
        <div style={{ background:COLORS.info+"0a", border:`1px solid ${COLORS.info}22`, borderRadius:8, padding:"10px 14px" }}>
          <SL>EXIT RULE</SL><p style={{ color:COLORS.info+"88", fontSize:12, lineHeight:1.5, margin:0 }}>{strategy.exitRule}</p>
        </div>
      )}
    </Card>
  );
}

// ── PCR Gauge ─────────────────────────────────────────────────────────────────
function PCRGauge({ pcr }) {
  if (!pcr) return null;
  const sentiment = pcr>1.2?{label:"BULLISH",color:COLORS.bull}:pcr<0.8?{label:"BEARISH",color:COLORS.bear}:{label:"NEUTRAL",color:COLORS.neutral};
  const angle = Math.min(Math.max((pcr/2)*180,0),180);
  return (
    <div style={{ background:COLORS.card, border:`1px solid ${sentiment.color}33`, borderRadius:12, padding:"14px 16px", textAlign:"center" }}>
      <div style={{ fontSize:9, color:"#444", letterSpacing:2, marginBottom:8 }}>PUT/CALL RATIO</div>
      <svg viewBox="0 0 120 65" style={{ width:"100%", maxWidth:160, margin:"0 auto", display:"block" }}>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round"/>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={sentiment.color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(angle/180)*157} 157`} style={{ filter:`drop-shadow(0 0 4px ${sentiment.color}88)` }}/>
        {(() => { const rad=((180-angle)*Math.PI)/180; const nx=60+44*Math.cos(rad),ny=60-44*Math.sin(rad); return <line x1="60" y1="60" x2={nx} y2={ny} stroke={sentiment.color} strokeWidth="2" strokeLinecap="round"/>; })()}
        <circle cx="60" cy="60" r="4" fill={sentiment.color}/>
        <text x="60" y="44" textAnchor="middle" fill={sentiment.color} fontSize="12" fontFamily="monospace" fontWeight="700">{pcr.toFixed(2)}</text>
      </svg>
      <div style={{ color:sentiment.color, fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2 }}>{sentiment.label}</div>
      <div style={{ color:"#333", fontSize:9, marginTop:4 }}>PCR &gt; 1.2 = bullish · &lt; 0.8 = bearish</div>
    </div>
  );
}

// ── Option Chain Table ────────────────────────────────────────────────────────
function OChainTable({ rows, spot }) {
  if (!rows?.length) return null;
  const maxCOI = Math.max(...rows.map(r=>r.CE?.openInterest||0));
  const maxPOI = Math.max(...rows.map(r=>r.PE?.openInterest||0));
  return (
    <div style={{ overflowX:"auto", marginTop:12 }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:"monospace" }}>
        <thead>
          <tr style={{ color:"#444", borderBottom:"1px solid #1a1a1a" }}>
            {["CE OI","CE IV%","CE LTP","STRIKE","PE LTP","PE IV%","PE OI"].map((h,i) => (
              <td key={h} style={{ padding:"6px 8px", color:i<3?COLORS.bear:i>3?COLORS.bull:COLORS.neutral, textAlign:i===3?"center":"left" }}>{h}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => {
            const strike = r.strikePrice;
            const isATM  = Math.abs(strike-(spot||0)) < 100;
            const ci = r.CE?.openInterest?(r.CE.openInterest/maxCOI):0;
            const pi = r.PE?.openInterest?(r.PE.openInterest/maxPOI):0;
            return (
              <tr key={i} style={{ background:isATM?"#FFB80010":i%2===0?"#050505":"transparent", borderBottom:isATM?"1px solid #FFB80033":"1px solid #0d0d0d" }}>
                <td style={{ padding:"5px 8px", color:COLORS.bear, background:`rgba(255,60,172,${ci*0.18})` }}>{fmt(r.CE?.openInterest)}</td>
                <td style={{ padding:"5px 8px", color:COLORS.bear+"88" }}>{fmtC(r.CE?.impliedVolatility)}</td>
                <td style={{ padding:"5px 8px", color:COLORS.bear }}>{fmtC(r.CE?.lastPrice)}</td>
                <td style={{ padding:"5px 8px", textAlign:"center", color:isATM?COLORS.neutral:"#888", fontWeight:isATM?700:400 }}>{fmt(strike)}{isATM?" ◀ATM▶":""}</td>
                <td style={{ padding:"5px 8px", color:COLORS.bull }}>{fmtC(r.PE?.lastPrice)}</td>
                <td style={{ padding:"5px 8px", color:COLORS.bull+"88" }}>{fmtC(r.PE?.impliedVolatility)}</td>
                <td style={{ padding:"5px 8px", color:COLORS.bull, background:`rgba(57,255,20,${pi*0.18})` }}>{fmt(r.PE?.openInterest)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, profile, signOut } = useAuth();
  const [images, setImages]     = useState({});
  const [symbol, setSymbol]     = useState("NIFTY");
  const [expiry, setExpiry]     = useState("0DTE");
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState("");
  const [signal,  setSignal]    = useState(null);
  const [strategy,setStrategy]  = useState(null);
  const [ocData,  setOcData]    = useState(null);
  const [ocLoading,setOcLoading]= useState(false);
  const [ocError, setOcError]   = useState(null);
  const [error,   setError]     = useState(null);
  const [tab,     setTab]       = useState("analyze");
  const [ocTimer, setOcTimer]   = useState(null);

  const uploadedTFs = TIMEFRAMES.filter(tf => images[tf.id]);
  const canAnalyze  = uploadedTFs.length >= 2 && !loading;
  const isPro       = profile?.plan === "pro" || profile?.plan === "admin";
  const isAdmin     = profile?.plan === "admin";

  const pcr = ocData ? (() => {
    const rows = ocData.filtered?.data || [];
    const cOI = rows.reduce((s,r)=>s+(r.CE?.openInterest||0),0);
    const pOI = rows.reduce((s,r)=>s+(r.PE?.openInterest||0),0);
    return cOI>0 ? pOI/cOI : null;
  })() : null;
  const spot = ocData?.records?.underlyingValue || null;
  const chainRows = (() => {
    if (!ocData) return [];
    const all = ocData.filtered?.data||[];
    if (!all.length) return [];
    const sp = spot || all[Math.floor(all.length/2)]?.strikePrice||0;
    return [...all].sort((a,b)=>Math.abs(a.strikePrice-sp)-Math.abs(b.strikePrice-sp)).slice(0,18);
  })();

  // ── auto-refresh OC every 30s during market hours ──────────────────────────
  const fetchOC = useCallback(async (sym) => {
    setOcLoading(true); setOcError(null);
    try {
      const res  = await fetch(`/api/optionchain?symbol=${sym||symbol}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"Failed");
      setOcData(data);
    } catch (e) { setOcError(e.message); }
    finally { setOcLoading(false); }
  }, [symbol]);

  useEffect(() => {
    if (!isPro) return;
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));
    const h=ist.getHours(),m=ist.getMinutes(),d=ist.getDay();
    const inMarket = d>=1&&d<=5&&(h>9||(h===9&&m>=15))&&(h<15||(h===15&&m<=30));
    if (!inMarket) return;
    const t = setInterval(()=>fetchOC(symbol), 30000);
    setOcTimer(t);
    return () => clearInterval(t);
  }, [isPro, symbol, fetchOC]);

  const handleFile = useCallback((id,file)=>{
    setImages(p=>({...p,[id]:{file,url:URL.createObjectURL(file)}}));
    setSignal(null); setStrategy(null); setError(null);
  },[]);
  const handleRemove = useCallback((id)=>{
    setImages(p=>{ const n={...p}; URL.revokeObjectURL(n[id]?.url); delete n[id]; return n; });
  },[]);

  // ── main analysis ──────────────────────────────────────────────────────────
  const analyze = async () => {
    setLoading(true); setError(null); setSignal(null); setStrategy(null);
    try {
      setLoadMsg("Reading charts…");
      const pcrCtx  = pcr  ? `Current PCR=${pcr.toFixed(2)} (${pcr>1.2?"bullish":pcr<0.8?"bearish":"neutral"}).` : "";
      const spotCtx = spot ? `Spot=${spot}.` : "";
      const content = [{ type:"text", text:`You are a professional NSE options trader for NIFTY/BANKNIFTY intraday strategies.
Analyse chart screenshots for ${symbol} (expiry:${expiry}). ${spotCtx} ${pcrCtx}

Return ONLY valid JSON with keys "signal" and "strategy":
{
  "signal":{ "direction":"CALL"|"PUT"|"WAIT","confidence":<0-100>,"suggestedExpiry":"<str>","strikeNote":"<str>","timeframeAlignment":{"1m":"bullish"|"bearish"|"neutral","3m":"...","5m":"...","15m":"..."},"keyLevels":{"support":"<p>","resistance":"<p>","target":"<p>"},"rationale":"<3-4 sentences>","entryTips":["<t1>","<t2>"],"risk":"<1-2 sentences>" },
  "strategy":{ "type":"Bull Call Spread"|"Bear Put Spread"|"Short Strangle"|"Short Straddle"|"Wait","bias":"bullish"|"bearish"|"neutral","legs":[{"action":"BUY"|"SELL","instrument":"CE"|"PE","strike":"<p>","expiry":"<d>","premium":"<₹>"}],"maxProfit":"<₹>","maxLoss":"<₹>","breakevens":["<p1>","<p2>"],"rrr":"<ratio>","rationale":"<2-3 sentences>","exitRule":"<str>" }
}
Strategy rules: Bullish>60% confidence→Bull Call Spread; Bearish>60%→Bear Put Spread; Range/low-conf→Short Strangle; No setup→Wait.` }];

      setLoadMsg("Encoding images…");
      for (const tf of uploadedTFs) {
        const img = images[tf.id];
        content.push({ type:"text", text:`--- ${tf.label} CHART ---` });
        content.push({ type:"image", source:{ type:"base64", media_type:img.file.type||"image/png", data:await toBase64(img.file) } });
      }

      setLoadMsg("Asking Claude AI…");
      const res = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, messages:[{role:"user",content}] }) });
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error||`Error ${res.status}`); }
      const data   = await res.json();
      const raw    = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());

      setSignal(parsed.signal); setStrategy(parsed.strategy);

      // ── save signal to DB ──
      const { id: savedId } = await apiFetch("/api/signals/save", { method: "POST", body: {
        symbol, expiry,
        direction: parsed.signal.direction, confidence: parsed.signal.confidence,
        strategy_type: parsed.strategy?.type,
        signal_json: parsed.signal, strategy_json: parsed.strategy,
        pcr, spot,
      }}).catch(() => ({}));

      // ── fire alert if confidence high enough ──
      if (profile?.alerts_enabled && parsed.signal.confidence >= (profile.alert_min_confidence||75)) {
        const alertMsg = `📊 OPTIONS SIGNAL\n\nSymbol: ${symbol}\nDirection: ${parsed.signal.direction==="CALL"?"▲ CALL":"▼ PUT"}\nConfidence: ${parsed.signal.confidence}%\nStrategy: ${parsed.strategy?.type||"—"}\nExpiry: ${expiry}\n\n${parsed.signal.rationale?.substring(0,120)}…\n\n⚠️ Not financial advice. Manage your risk.`;
        await fetch("/api/alerts/send", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ whatsapp:profile.whatsapp, phone:profile.phone, message:alertMsg }) });
      }

    } catch(e) {
      console.error(e);
      setError(e.message||"Analysis failed.");
    } finally { setLoading(false); setLoadMsg(""); }
  };

  const visibleTabs = TABS.filter(t => t !== "admin" || isAdmin);

  return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, color:COLORS.text, fontFamily:"'IBM Plex Mono','Courier New',monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Bebas+Neue&display=swap');*{box-sizing:border-box;margin:0;padding:0}input,select,button{font-family:inherit}input::placeholder{color:#333}select option{background:#111}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#222;border-radius:4px}`}</style>

      {/* TOP BAR */}
      <div style={{ borderBottom:"1px solid #111", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#050505", flexWrap:"wrap", gap:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS.bull, boxShadow:`0 0 10px ${COLORS.bull}88`, animation:"blink 2s infinite" }}/>
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          <span style={{ fontFamily:"'Bebas Neue'", fontSize:19, letterSpacing:2, color:"#fff" }}>OPTIONS SIGNAL</span>
          <span style={{ fontSize:9, color:COLORS.bull, background:COLORS.bull+"14", border:`1px solid ${COLORS.bull}33`, borderRadius:4, padding:"2px 6px" }}>AI · NSE · BETA</span>
          {spot && <span style={{ fontSize:11, color:COLORS.neutral }}>{symbol} {fmt(spot)}</span>}
          {isPro && ocTimer && <span style={{ fontSize:9, color:COLORS.bull+"66" }}>● LIVE 30s</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:2 }}>
            {visibleTabs.map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                background: tab===t ? "#111" : "transparent",
                border: `1px solid ${tab===t ? "#333" : "transparent"}`,
                borderRadius: 8, padding: "6px 10px",
                color: tab===t ? "#fff" : "#444",
                cursor: "pointer", transition: "all .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                minWidth: 48,
              }}>
                <span style={{ fontSize: 20 }}>{TAB_ICONS[t]}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.5, fontWeight: tab===t ? 700 : 400, color: tab===t ? "#fff" : "#888" }}>{TAB_LABELS[t]}</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:8, borderLeft:"1px solid #1a1a1a", paddingLeft:12 }}>
            <span style={{ fontSize:12, color:"#ccc", fontWeight:500 }}>{profile?.email}</span>
            <span style={{
              fontSize:10, fontWeight:700, letterSpacing:1,
              color: isAdmin ? COLORS.bull : isPro ? COLORS.neutral : "#aaa",
              background: (isAdmin ? COLORS.bull : isPro ? COLORS.neutral : "#555") + "22",
              border: `1px solid ${(isAdmin ? COLORS.bull : isPro ? COLORS.neutral : "#555")}55`,
              borderRadius:5, padding:"3px 9px"
            }}>{profile?.plan?.toUpperCase()}</span>
            <Btn onClick={signOut} variant="ghost" small>SIGN OUT</Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:880, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* ── ANALYZE ── */}
        {tab==="analyze" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              {["NIFTY","BANKNIFTY"].map(s => (
                <button key={s} onClick={()=>setSymbol(s)} style={{ padding:"9px 16px", borderRadius:8, cursor:"pointer", background:symbol===s?COLORS.bull+"14":"#080808", border:`1.5px solid ${symbol===s?COLORS.bull:"#1a1a1a"}`, color:symbol===s?COLORS.bull:"#444", fontFamily:"'Bebas Neue'", fontSize:16, letterSpacing:2, transition:"all .15s" }}>{s}</button>
              ))}
              <select value={expiry} onChange={e=>setExpiry(e.target.value)} style={{ background:"#080808", border:"1px solid #1a1a1a", borderRadius:8, padding:"9px 14px", color:"#888", fontSize:12, outline:"none", cursor:"pointer" }}>
                {EXPIRY_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
              <Btn onClick={()=>{fetchOC(symbol);setTab("chain");}} variant="info" small>⛓ Load OC</Btn>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {TIMEFRAMES.map(tf=><UploadSlot key={tf.id} tf={tf} img={images[tf.id]} onFile={handleFile} onRemove={handleRemove}/>)}
            </div>
            <div style={{ display:"flex", gap:5, alignItems:"center", marginBottom:14 }}>
              {TIMEFRAMES.map(tf=>(
                <div key={tf.id} style={{ flex:1, height:2.5, borderRadius:3, background:images[tf.id]?tf.accent:"#151515", boxShadow:images[tf.id]?`0 0 6px ${tf.accent}88`:"none", transition:"all .3s" }}/>
              ))}
              <div style={{ fontSize:10, color:"#333", minWidth:36, textAlign:"right" }}>{uploadedTFs.length}/4</div>
            </div>
            {error && <div style={{ background:"#f3331a", border:"1px solid #f33344", borderRadius:8, padding:"10px 14px", color:"#f88", fontSize:12, marginBottom:12 }}>{error}</div>}
            <button onClick={analyze} disabled={!canAnalyze} style={{ width:"100%", padding:"13px", background:canAnalyze?"linear-gradient(135deg,#39FF1412,#00D4FF08)":"#080808", border:`1.5px solid ${canAnalyze?COLORS.bull:"#151515"}`, borderRadius:10, color:canAnalyze?COLORS.bull:"#2a2a2a", fontFamily:"'Bebas Neue'", fontSize:20, letterSpacing:4, cursor:canAnalyze?"pointer":"not-allowed", transition:"all .2s", boxShadow:canAnalyze?"0 0 20px #39FF1412":"none" }}>
              {loading ? loadMsg||"ANALYZING…" : uploadedTFs.length<2 ? "UPLOAD AT LEAST 2 CHARTS" : `ANALYZE ${symbol} · ${uploadedTFs.length} CHARTS`}
            </button>
            {loading && <Spinner msg={loadMsg}/>}
            {signal   && <SignalCard signal={signal}/>}
          </>
        )}

        {/* ── STRATEGY ── */}
        {tab==="strategy" && (
          <>
            <div style={{ fontSize:10, color:"#333", letterSpacing:2, marginBottom:14 }}>INTRADAY STRATEGY</div>
            {pcr && <div style={{ marginBottom:14 }}><PCRGauge pcr={pcr}/></div>}
            {signal && (
              <div style={{ marginBottom:14 }}>
                <SL>SIGNAL SUMMARY</SL>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Pill label="DIRECTION"  value={signal.direction}  color={signal.direction==="CALL"?COLORS.bull:signal.direction==="PUT"?COLORS.bear:COLORS.neutral}/>
                  <Pill label="CONFIDENCE" value={`${signal.confidence}%`} color={COLORS.info}/>
                  {signal.keyLevels?.support    && <Pill label="SUPPORT"    value={signal.keyLevels.support}    color={COLORS.bull}/>}
                  {signal.keyLevels?.resistance && <Pill label="RESISTANCE" value={signal.keyLevels.resistance} color={COLORS.bear}/>}
                  {signal.keyLevels?.target     && <Pill label="TARGET"     value={signal.keyLevels.target}     color={COLORS.info}/>}
                </div>
              </div>
            )}
            {strategy ? <StrategyCard strategy={strategy}/> : <div style={{ color:"#1e1e1e", textAlign:"center", padding:"60px 0", fontSize:12 }}>No strategy yet — run an analysis in the Analyze tab first.</div>}
          </>
        )}

        {/* ── OPTION CHAIN ── */}
        {tab==="chain" && (
          <>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ fontSize:10, color:"#333", letterSpacing:2, flex:1 }}>LIVE OPTION CHAIN</div>
              {["NIFTY","BANKNIFTY"].map(s=>(
                <button key={s} onClick={()=>{setSymbol(s);fetchOC(s);}} style={{ padding:"7px 12px", borderRadius:8, cursor:"pointer", background:symbol===s?COLORS.bull+"14":"#080808", border:`1px solid ${symbol===s?COLORS.bull:"#1a1a1a"}`, color:symbol===s?COLORS.bull:"#444", fontSize:11, transition:"all .15s" }}>{s}</button>
              ))}
              <Btn onClick={()=>fetchOC(symbol)} variant="info" small>{ocLoading?"Loading…":"↻ Refresh"}</Btn>
              {isPro && <span style={{ fontSize:9, color:COLORS.bull+"55" }}>Auto-refreshing every 30s</span>}
            </div>
            {ocError  && <div style={{ background:"#f3331a", border:"1px solid #f33344", borderRadius:8, padding:"10px 14px", color:"#f88", fontSize:12, marginBottom:12 }}>⚠ {ocError}</div>}
            {ocLoading && <Spinner msg="Fetching NSE data…"/>}
            {!ocData&&!ocLoading && <div style={{ color:"#1e1e1e", textAlign:"center", padding:"60px 0", fontSize:12 }}>Click a symbol above to load live NSE option chain data.</div>}
            {ocData && (
              <>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                  {spot && <Pill label="SPOT"   value={fmt(spot)}          color={COLORS.neutral}/>}
                  {pcr  && <Pill label="PCR"    value={pcr.toFixed(2)}     color={pcr>1.2?COLORS.bull:pcr<0.8?COLORS.bear:COLORS.neutral}/>}
                  <Pill label="SYMBOL" value={symbol}                 color={COLORS.info}/>
                </div>
                <div style={{ marginBottom:14 }}><PCRGauge pcr={pcr}/></div>
                <OChainTable rows={chainRows} spot={spot}/>
              </>
            )}
          </>
        )}

        {/* ── P&L ── */}
        {tab==="pnl"      && <PnLPage/>}
        {tab==="backtest" && <BacktestPage/>}
        {tab==="alerts"   && <AlertsPage/>}
        {tab==="admin"    && <AdminPage/>}

      </div>
    </div>
  );
}
