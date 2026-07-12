import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";
import LiquidGlassScene from "@/components/LiquidGlassScene";

export const metadata: Metadata = {
  title: "临床病人管理助手",
  description: "面向临床医生的移动端病人查房与待办管理 PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "临床助手",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#201e1c" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 首屏防闪：在渲染前根据系统配色偏好立即给 <html> 加 dark 类，
            避免 system-dark 用户先白屏再切暗。已显式选择 light/dark 的用户
            由 Providers 在设置加载后正确套用（SSR 不可同步读 Dexie）。 */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var d=m.matches;var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-screen">
        <LiquidGlassScene />
        <Providers>
          <main className="app-content mx-auto w-full max-w-2xl px-4 pb-28 pt-5">
            {children}
          </main>
          <NavBar />
        </Providers>
      </body>
    </html>
  );
}
