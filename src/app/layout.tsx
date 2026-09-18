import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Threads 自動運用",
  description: "Threads 投稿管理ダッシュボード",
};

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/posts", label: "投稿管理" },
  { href: "/generate", label: "AI生成" },
  { href: "/knowledge", label: "ナレッジ" },
  { href: "/calendar", label: "吉日" },
  { href: "/settings", label: "設定" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <span className="font-bold text-sm">Threads 運用</span>
            <nav className="flex gap-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
