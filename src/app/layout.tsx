import type { Metadata } from "next";
import { Outfit, Merriweather, Fira_Code } from "next/font/google";
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
  metadataBase: new URL("https://unmute-ai.com"),
  title: {
    default: "Unmute AI",
    template: "%s | Unmute AI",
  },
  description: "Focus on the research. We handle the language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export { fontSans, fontSerif, fontMono };
