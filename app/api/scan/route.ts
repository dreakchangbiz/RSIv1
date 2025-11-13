export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 1800; // 若檔案裡已經有 revalidate，就保留一個即可

import { NextResponse } from "next/server";
import { fetchListedCompanies, fetchDailyOHLC } from "@/lib/twse";
import { analyze } from "@/lib/indicators";


const MAX_CODES = parseInt(process.env.MAX_CODES || "300", 10);
const MONTHS = parseInt(process.env.MONTHS || "6", 10);
export const revalidate = 1800; // 30m


export async function GET(req: Request) {
try {
const { searchParams } = new URL(req.url);
const q = (searchParams.get("q") || "").trim();


const list = await fetchListedCompanies();
const universe = list.filter(x => !q || x.code.includes(q) || x.name.includes(q)).slice(0, MAX_CODES);


const batchSize = 15; const items: any[] = [];
for (let i = 0; i < universe.length; i += batchSize) {
const batch = universe.slice(i, i+batchSize);
const out = await Promise.all(batch.map(async s => {
const bars = await fetchDailyOHLC(s.code, MONTHS);
if (bars.length < 65) return { ...s, status: "INSUFFICIENT" };
const r = analyze(bars);
// 推薦等級（可調整門檻）
let recommendation: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell" = "Hold";
if (r.signal === "BUY" && r.strength >= 75) recommendation = "Strong Buy";
else if (r.signal === "BUY" && r.strength >= 55) recommendation = "Buy";
else if (r.signal === "SELL" && r.strength >= 75) recommendation = "Strong Sell";
else if (r.signal === "SELL" && r.strength >= 55) recommendation = "Sell";
else recommendation = "Hold";


return {
code: s.code, name: s.name,
signal: r.signal, strength: r.strength, recommendation,
trendZone: r.trendZone, positionPct: Math.round(r.positionPct),
rsi: Math.round(r.rsiNow*10)/10, momentum: Math.round(r.momentum*10)/10,
signalAgeDays: r.signalAgeDays,
entry: r.entry, stop: r.stop, take: r.take,
explain: r.explain
};
}));
items.push(...out);
}


// 排序：Strong Buy/Buy → Hold → Sell/Strong Sell（內部再以 strength）
const rank = (x: any) => (
x.recommendation === "Strong Buy" ? 5 :
x.recommendation === "Buy" ? 4 :
x.recommendation === "Hold" ? 3 :
x.recommendation === "Sell" ? 2 : 1
);
items.sort((a,b)=> rank(b)-rank(a) || (b.strength||0)-(a.strength||0));


return NextResponse.json({ count: items.length, items }, { status: 200 });
} catch (e: any) {
return NextResponse.json({ error: e?.message || "scan failed" }, { status: 500 });
}
}
