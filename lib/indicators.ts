// lib/indicators.ts
import type { OHLC } from "./twse";

// 簡單 SMA
export function sma(values: number[], period: number): number[] {
  const out = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// RSI(14)
export function rsi(values: number[], period = 14): number[] {
  const rsis: number[] = new Array(values.length).fill(NaN);
  if (values.length < period + 1) return rsis;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }

  let avgG = gains / period;
  let avgL = losses / period;
  rsis[period] = 100 - 100 / (1 + avgG / (avgL || 1e-9));

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    const rs = avgG / (avgL || 1e-9);
    rsis[i] = 100 - 100 / (1 + rs);
  }

  return rsis;
}

// pivot 高低點（左右各2根）
function pivots(bars: OHLC[]) {
  const L = bars.length;
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = 2; i < L - 2; i++) {
    const b = bars;
    const isLow =
      b[i].low < b[i - 1].low &&
      b[i].low < b[i + 1].low &&
      b[i].low < b[i - 2].low &&
      b[i].low < b[i + 2].low;
    const isHigh =
      b[i].high > b[i - 1].high &&
      b[i].high > b[i + 1].high &&
      b[i].high > b[i - 2].high &&
      b[i].high > b[i + 2].high;
    if (isLow) lows.push(i);
    if (isHigh) highs.push(i);
  }
  return { lows, highs };
}

export type SignalPack = {
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: number; // 0~100
  rsiNow: number;
  rsiPrev: number;
  bullDiv: boolean;
  bearDiv: boolean;
  crossUp50: boolean;
  crossDn50: boolean;
  trendZone: "UP" | "DOWN" | "NEUTRAL";
  positionPct: number; // 0~100
  momentum: number; // RSI 斜率
  signalAgeDays: number;
  entry: number | null;
  stop: number | null;
  take: number | null;
  explain: string;
};

export function analyze(bars: OHLC[]): SignalPack {
  const L = bars.length;
  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);

  const rs = rsi(closes, 14);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);

  const lookback = 30;
  const { lows: pivL, highs: pivH } = pivots(bars);
  const recentL = pivL.filter((i) => i >= L - lookback);
  const recentH = pivH.filter((i) => i >= L - lookback);

  let bullDiv = false;
  let bearDiv = false;
  let bullMag = 0;
  let bearMag = 0;

  if (recentL.length >= 2) {
    const i1 = recentL[recentL.length - 2];
    const i2 = recentL[recentL.length - 1];
    if (lows[i2] < lows[i1] && rs[i2] > rs[i1]) {
      bullDiv = true;
      bullMag =
        rs[i2] - rs[i1] + (lows[i1] - lows[i2]) / Math.max(1, lows[i1]);
    }
  }

  if (recentH.length >= 2) {
    const j1 = recentH[recentH.length - 2];
    const j2 = recentH[recentH.length - 1];
    if (highs[j2] > highs[j1] && rs[j2] < rs[j1]) {
      bearDiv = true;
      bearMag =
        rs[j1] - rs[j2] + (highs[j2] - highs[j1]) / Math.max(1, highs[j1]);
    }
  }

  const crossUp50 = rs[L - 2] <= 50 && rs[L - 1] > 50;
  const crossDn50 = rs[L - 2] >= 50 && rs[L - 1] < 50;

  // 趨勢區段
  const trendZone =
    rs[L - 1] > 55 && ma20[L - 1] > ma60[L - 1]
      ? "UP"
      : rs[L - 1] < 45 && ma20[L - 1] < ma60[L - 1]
      ? "DOWN"
      : "NEUTRAL";

  // 60 日區間位置
  const win = Math.max(0, L - 60);
  const hh = Math.max(...highs.slice(win));
  const ll = Math.min(...lows.slice(win));
  const positionPct = Math.max(
    0,
    Math.min(100, ((closes[L - 1] - ll) / Math.max(1e-9, hh - ll)) * 100)
  );

  const momentum = rs[L - 1] - rs[L - 2];

  // 最近訊號距今幾天（回朔 120 根）
  let signalAgeDays = 999;
  for (let k = L - 2; k >= Math.max(1, L - 120); k--) {
    const up = rs[k - 1] <= 50 && rs[k] > 50;
    const dn = rs[k - 1] >= 50 && rs[k] < 50;
    let bd = false;
    let sd = false;

    const sl = pivL.filter((i) => i <= k && i >= k - lookback);
    if (sl.length >= 2) {
      const a = sl[sl.length - 2];
      const b = sl[sl.length - 1];
      if (lows[b] < lows[a] && rs[b] > rs[a]) bd = true;
    }

    const sh = pivH.filter((i) => i <= k && i >= k - lookback);
    if (sh.length >= 2) {
      const a = sh[sh.length - 2];
      const b = sh[sh.length - 1];
      if (highs[b] > highs[a] && rs[b] < rs[a]) sd = true;
    }

    const isBuy = bd && up;
    const isSell = sd && dn;
    if (isBuy || isSell) {
      signalAgeDays = L - 1 - k;
      break;
    }
  }

  // 訊號與強度
  let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  let strength = 0;
  let explain = "";

  if (bullDiv && crossUp50) {
    signal = "BUY";
    strength = Math.max(
      10,
      Math.min(100, Math.round(bullMag * 100 + (rs[L - 1] - 50) * 1.2))
    );
    explain = "牛背離 + RSI 上穿 50";
  } else if (bearDiv && crossDn50) {
    signal = "SELL";
    strength = Math.max(
      10,
      Math.min(100, Math.round(bearMag * 100 + (50 - rs[L - 1]) * 1.2))
    );
    explain = "熊背離 + RSI 下穿 50";
  }

  // 建議進出場價
  let entry: number | null = null;
  let stop: number | null = null;
  let take: number | null = null;

  if (signal === "BUY") {
    const lastHigh20 = Math.max(...highs.slice(Math.max(0, L - 20)));
    entry = +(lastHigh20 * 1.005).toFixed(2); // 近 20 日高 +0.5%
    stop = +(entry * 0.93).toFixed(2); // -7% 停損
    take = +(entry * 1.1).toFixed(2); // +10% 目標
  } else if (signal === "SELL") {
    const lastLow20 = Math.min(...lows.slice(Math.max(0, L - 20)));
    entry = +(lastLow20 * 0.995).toFixed(2); // 近 20 日低 -0.5%
    stop = +(entry * 1.07).toFixed(2); // +7% 風控
    take = +(entry * 0.9).toFixed(2); // -10% 目標
  }

  // 加權 bonus
  let bonus = 0;
  if (trendZone === "UP" && signal === "BUY") bonus += 10;
  if (trendZone === "DOWN" && signal === "SELL") bonus += 10;
  if (momentum > 0 && signal === "BUY") bonus += 5;
  if (momentum < 0 && signal === "SELL") bonus += 5;
  if (signalAgeDays <= 3) bonus += 5;

  strength = Math.min(100, strength + bonus);

  return {
    signal,
    strength,
    rsiNow: rs[L - 1],
    rsiPrev: rs[L - 2],
    bullDiv,
    bearDiv,
    crossUp50,
    crossDn50,
    trendZone,
    positionPct,
    momentum,
    signalAgeDays,
    entry,
    stop,
    take,
    explain,
  };
}
