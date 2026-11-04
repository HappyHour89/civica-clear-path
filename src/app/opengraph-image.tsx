import { ImageResponse } from "next/og";

export const alt = "Civica — Know what it says. Decide what you think.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The link preview shown when Civica is shared. Uses the built-in font:
// ImageResponse cannot read the site's woff2 web fonts.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f5ef",
          color: "#1a1d1f",
          padding: "72px 80px",
          borderTop: "18px solid #0f5c55",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#0f5c55" }}>Civica</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>
            Know what it says. Decide what you think.
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#565d63" }}>
            Bills, ballot measures, and court letters in plain language, with sources and every side.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#565d63", borderTop: "2px solid #dcd7cc", paddingTop: 24 }}>
          In English and Korean
        </div>
      </div>
    ),
    size,
  );
}
