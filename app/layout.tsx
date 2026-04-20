import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_SC, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pokopia Planner · 宝可梦居住地规划助手",
  description:
    "为 Pokopia 宝可梦设计宜居的居住地：图鉴、资源循环、前后期规划器。克制而精致，像无印良品遇上宝可梦。",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hans"
      className={`${inter.variable} ${notoSansSC.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Apply theme before React hydrates to avoid flash-of-light-content.
          Reads localStorage, falls back to prefers-color-scheme, defaults to light.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pokopia:theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>
          <SiteNav />
          <div className="flex-1">{children}</div>
        </TooltipProvider>
      </body>
    </html>
  );
}
