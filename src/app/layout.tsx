import type { Metadata } from "next";
import { Outfit, Merriweather, Fira_Code } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const fontSans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontSerif = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const fontMono = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Translation Editor",
  description: "Real-time bidirectional translation editor for academic writing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
