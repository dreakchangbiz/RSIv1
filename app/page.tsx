"use client";

import { useEffect, useState } from "react";

type Row = {
  code: string;
  name: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength?: number;
  recommendation?: string;
  trendZone?: "UP" | "DOWN" | "NEUTRAL";
  positionPct?: number;
  rsi?: number;
  momentum?: number;
  signalAgeDays?: number;
  entry?: number | null;
  stop?: number | null;
  take?: number | null;
  explain?: string;
  status?: string;
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyBuys, setOnlyBuys] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/scan?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      setRows(j.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const view = rows.filter(
    (r) => !onlyBuys || (r.recommendation && r.recommendation.includes("Buy"))
  );

  const tag = (t?: string) => (
    <span
      className={
        "px-2 py-1 rounded text-xs " +
        (t === "Strong Buy"
          ? "bg-green-700 text-white"
          : t === "Buy"
          ? "bg-green-100 text-green-800"
          : t === "Sell"
          ? "bg-red-100 text-red-700"
          : t === "Strong Sell"
          ? "bg-red-700 text-white"
          : "bg-gray-200 text-gray-800")
      }
    >
      {t}
    </span>
  );

  const zone = (z?: string) =>
    z === "UP" ? "上升" : z === "DOWN" ? "下降" : "盤整";

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">台股 RSI 背離選股推薦</h1>
      <p className="text-sm text-gray-600 mb-4">
        日線邏輯：近 30 根 RSI 背離 + RSI 穿越 50；強度加權趨勢 / 動能 /
        新近性。僅供教育研究，非投資建議。
      </p>

      <div className="flex gap-2 items-center mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="輸入代碼或名稱關鍵字…"
          className="border rounded px-3 py-2 w-72"
        />
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white"
        >
          {loading ? "掃描中…" : "掃描"}
        </button>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyBuys}
            onChange={(e) => setOnlyBuys(e.target.checked)}
          />
          只看 Buy / Strong Buy
        </label>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">代碼</th>
              <th className="px-3 py-2 text-left">名稱</th>
              <th className="px-3 py-2 text-left">推薦</th>
              <th className="px-3 py-2 text-left">訊號</th>
              <th className="px-3 py-2 text-right">強度</th>
              <th className="px-3 py-2 text-left">趨勢</th>
              <th className="px-3 py-2 text-right">區間位置</th>
              <th className="px-3 py-2 text-right">RSI</th>
              <th className="px-3 py-2 text-right">動能</th>
              <th className="px-3 py-2 text-right">訊號日齡</th>
              <th className="px-3 py-2 text-right">建議進場</th>
              <th className="px-3 py-2 text-right">停損</th>
              <th className="px-3 py-2 text-right">第一目標</th>
              <th className="px-3 py-2 text-left">說明</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.code} className="border-t">
                <td className="px-3 py-2">{r.code}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{tag(r.recommendation)}</td>
                <td className="px-3 py-2">
                  {r.signal === "BUY"
                    ? "買進"
                    : r.signal === "SELL"
                    ? "賣出"
                    : "觀望"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.strength ?? "-"}
                </td>
                <td className="px-3 py-2 text-left">
                  {zone(r.trendZone)}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.positionPct ?? "-"}%
                </td>
                <td className="px-3 py-2 text-right">{r.rsi ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  {r.momentum ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.signalAgeDays ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.entry ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.stop ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.take ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {r.explain || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="text-xs text-gray-500 mt-4 list-disc pl-5 space-y-1">
        <li>
          推薦等級：Strong Buy/Buy/Hold/Sell/Strong Sell
          由訊號強度與趨勢/動能加權決定。
        </li>
        <li>
          建議進場價：近 20 日高（或低）突破 ±0.5%，停損預設 7%，第一目標 ±10%。
        </li>
        <li>
          區間位置：相對過去 60 日高低區間的百分位，僅作風險參考。
        </li>
        <li>
          僅供教育研究，非投資建議；資料源自 TWSE 公開端點，可能延遲或中斷。
        </li>
      </ul>
    </main>
  );
}
