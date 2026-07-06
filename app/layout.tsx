import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

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
  maximumScale: 1,
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
      <body className="min-h-screen">
        <Providers>
          <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-5">
            {children}
          </main>
          <NavBar />
        </Providers>
      </body>
    </html>
  );
}
