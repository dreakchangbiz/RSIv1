export type OHLC = { date: string; open: number; high: number; low: number; close: number };
const win = Math.max(0, L-60);
const hh = Math.max(...highs.slice(win));
const ll = Math.min(...lows.slice(win));
const positionPct = Math.max(0, Math.min(100, ((closes[L-1]-ll)/Math.max(1e-9, hh-ll))*100));


const momentum = rs[L-1] - rs[L-2];


// 最近一次訊號距今幾天（以現行規則回朔）
let signalAgeDays = 999;
for (let k = L-2; k >= Math.max(1, L-120); k--) {
const up = rs[k-1] <= 50 && rs[k] > 50; // 上穿
const dn = rs[k-1] >= 50 && rs[k] < 50; // 下穿
let bd=false, sd=false;
// 近30內背離（以 k 為右端再判定一次近似）
const sl = pivL.filter(i => i <= k && i >= k - lookback);
if (sl.length >= 2) { const a = sl[sl.length-2], b = sl[sl.length-1]; if (lows[b]<lows[a] && rs[b]>rs[a]) bd=true; }
const sh = pivH.filter(i => i <= k && i >= k - lookback);
if (sh.length >= 2) { const a = sh[sh.length-2], b = sh[sh.length-1]; if (highs[b]>highs[a] && rs[b]<rs[a]) sd=true; }
const isBuy = bd && up; const isSell = sd && dn;
if (isBuy || isSell) { signalAgeDays = (L-1) - k; break; }
}


// 訊號與強度
let signal: "BUY"|"SELL"|"NEUTRAL" = "NEUTRAL"; let strength = 0; let explain="";
if (bullDiv && crossUp50) { signal = "BUY"; strength = Math.max(10, Math.min(100, Math.round(bullMag*100 + (rs[L-1]-50)*1.2))); explain = "牛背離+RSI上穿50"; }
else if (bearDiv && crossDn50) { signal = "SELL"; strength = Math.max(10, Math.min(100, Math.round(bearMag*100 + (50-rs[L-1])*1.2))); explain = "熊背離+RSI下穿50"; }


// 推薦進出場價（日線）：
let entry: number | null = null, stop: number | null = null, take: number | null = null;
if (signal === "BUY") {
const lastHigh20 = Math.max(...highs.slice(Math.max(0, L-20)));
entry = +(lastHigh20 * 1.005).toFixed(2); // 近20日高突破+0.5%
stop = +(entry * 0.93).toFixed(2); // -7% 停損
take = +(entry * 1.10).toFixed(2); // +10% 第一目標（亦可改 trailing）
} else if (signal === "SELL") {
const lastLow20 = Math.min(...lows.slice(Math.max(0, L-20)));
entry = +(lastLow20 * 0.995).toFixed(2); // 近20日低跌破-0.5%
stop = +(entry * 1.07).toFixed(2); // +7% 風控（做空/減碼視角）
take = +(entry * 0.90).toFixed(2); // -10% 目標
}


// 趨勢一致性加權，形成推薦分數（不覆寫 strength，僅作展示用）
let bonus = 0;
bonus += (trendZone === "UP" && signal === "BUY") ? 10 : 0;
bonus += (trendZone === "DOWN" && signal === "SELL") ? 10 : 0;
bonus += (momentum > 0 && signal === "BUY") ? 5 : 0;
bonus += (momentum < 0 && signal === "SELL") ? 5 : 0;
bonus += (signalAgeDays <= 3) ? 5 : 0; // 新近訊號加分
strength = Math.min(100, strength + bonus);


return {
signal, strength,
rsiNow: rs[L-1], rsiPrev: rs[L-2],
bullDiv, bearDiv, crossUp50, crossDn50,
trendZone,
positionPct,
momentum,
signalAgeDays,
entry, stop, take,
explain
};
}
