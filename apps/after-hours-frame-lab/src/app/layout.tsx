import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '九宫格废片写真生成器 · Almost Perfect Nine',
  description:
    '锁定同一位虚构成年女性、同一套服装与场景，生成九张「差一点封神」的私人废片接触表，支持单格重生成与 1080×1920 PNG 导出。',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#100f0d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
