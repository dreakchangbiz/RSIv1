// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "台股 RSI 背離選股推薦",
  description: "以日線 RSI 背離 + 趨勢區段的台股選股推薦程式（僅供教育研究）",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
