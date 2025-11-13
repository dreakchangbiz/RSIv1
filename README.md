# 台股 RSI 背離選股推薦（Vercel / Next.js）


**功能**：掃描（預設 300 檔）上市公司，計算 RSI(14)+背離+50 中軸穿越的買賣訊號，並產出「推薦等級、趨勢區段、區間位置、動能、訊號日齡、建議進出場價」。


## 快速使用
1. `npm i`
2. `npm run dev` → http://localhost:3000
3. 推到 GitHub，Vercel 連線一鍵部署。


## 環境變數
- `MAX_CODES`：掃描檔數（預設 300）
- `MONTHS`：回看月數抓日 K（預設 6）


## 注意
- 抓取在後端 Route Handler 進行以避免 CORS。
- 若要全市場千檔建議：分頁批次 or 善用 ISR/KV 快取。
- 僅供技術研究，非投資建議。
