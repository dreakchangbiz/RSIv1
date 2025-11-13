const UA = "Mozilla/5.0 (compatible; TWSE-Recommender/1.0)";
const TWSE_OPEN = "https://openapi.twse.com.tw/v1";
const TWSE_LEGACY = "https://www.twse.com.tw";


export async function fetchListedCompanies() {
const url = `${TWSE_OPEN}/opendata/t187ap03_L`;
const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" }, cache: "no-store" });
const data = await res.json();
return (Array.isArray(data) ? data : []).map((row: any) => ({
code: (row["公司代號"] || row["證券代號"] || "").toString().trim(),
name: (row["公司名稱"] || row["證券名稱"] || "").toString().trim()
})).filter((x: any) => /^\d{4}$/.test(x.code));
}


export async function fetchDailyOHLC(code: string, months = 6) {
const now = new Date();
const tasks: Promise<any>[] = [];
for (let m = 0; m < months; m++) {
const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
const yyyymmdd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}01`;
const url = `${TWSE_LEGACY}/exchangeReport/STOCK_DAY?response=json&date=${yyyymmdd}&stockNo=${code}`;
tasks.push(fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" }, cache: "no-store" }).then(r=>r.json()).catch(()=>null));
}
const arr = await Promise.all(tasks);
const rows: any[] = [];
for (const a of arr) if (a && Array.isArray(a.data)) rows.push(...a.data);
const ohlc = rows.map((r: any[]) => {
const [date, , , open, high, low, close] = r;
const [y, m, d] = date.replace(/\s/g, "").split("/");
const ds = `${parseInt(y)+1911}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
return {
date: ds,
open: parseFloat((open||"0").toString().replace(/,/g, "")),
high: parseFloat((high||"0").toString().replace(/,/g, "")),
low: parseFloat((low ||"0").toString().replace(/,/g, "")),
close:parseFloat((close||"0").toString().replace(/,/g, ""))
};
}).filter(x => Number.isFinite(x.close));
const dedup = new Map<string, any>();
for (const k of ohlc) dedup.set(k.date, k);
return Array.from(dedup.values()).sort((a,b)=>a.date.localeCompare(b.date));
}
