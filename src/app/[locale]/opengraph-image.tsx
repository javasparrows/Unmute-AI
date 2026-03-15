import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Unmute AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const title =
    locale === "ja"
      ? "Unmute AI"
      : "Unmute AI";

  const subtitle =
    locale === "ja"
      ? "母語で書いて、どの言語でも出版"
      : "Write in your language, publish in any";

  const stats =
    locale === "ja"
      ? ["17言語対応", "8ジャーナルスタイル", "引用自動検索"]
      : ["17 Languages", "8 Journal Styles", "Auto Citations"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 40,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          {subtitle}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#60a5fa",
                fontSize: 20,
              }}
            >
              <span style={{ color: "#3b82f6" }}>&#x25CF;</span>
              {stat}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#475569",
          }}
        >
          unmute-ai.com
        </div>
      </div>
    ),
    { ...size },
  );
}
