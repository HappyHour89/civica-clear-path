import type { Briefing } from "./schemas";

// Draws a 1080×1350 share card (the portrait size most social apps show in
// full) for one briefing, in the browser: nothing is uploaded or stored.

const W = 1080;
const H = 1350;
const PAD = 88;
const SERIF = '"Source Serif 4 Variable", "Noto Sans KR", Georgia, serif';
const SANS = '"Public Sans Variable", "Noto Sans KR", system-ui, sans-serif';

const C = {
  paper: "#f7f5ef",
  surface: "#ffffff",
  ink: "#1a1d1f",
  muted: "#565d63",
  line: "#dcd7cc",
  accent: "#0f5c55",
  accentSoft: "#e3eeeb",
};

export type CardText = { eyebrow: string; forYou: string; tagline: string; site: string };

// Splits text into lines that fit `width`, breaking long words (or Hangul
// runs) by character, and ends with "…" if it runs past `maxLines`.
export function wrapText(measure: (s: string) => number, text: string, width: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  const push = (next: string) => {
    lines.push(next);
    return lines.length >= maxLines;
  };
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) {
      line = candidate;
      continue;
    }
    if (line && push(line)) return ellipsize(measure, lines, width, true);
    line = "";
    let piece = "";
    for (const char of word) {
      if (measure(piece + char) > width && piece) {
        if (push(piece)) return ellipsize(measure, lines, width, true);
        piece = "";
      }
      piece += char;
    }
    line = piece;
  }
  if (line) lines.push(line);
  return ellipsize(measure, lines.slice(0, maxLines), width, lines.length > maxLines);
}

function ellipsize(measure: (s: string) => number, lines: string[], width: number, cut: boolean) {
  if (!cut || lines.length === 0) return lines;
  let last = lines[lines.length - 1];
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1);
  lines[lines.length - 1] = `${last.trimEnd()}…`;
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function emblem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.roundRect(0, 0, 64, 64, 10);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(14, 26);
  ctx.lineTo(32, 15);
  ctx.lineTo(50, 26);
  for (const cx of [20, 28, 36, 44]) {
    ctx.moveTo(cx, 29);
    ctx.lineTo(cx, 44);
  }
  ctx.moveTo(14, 49);
  ctx.lineTo(50, 49);
  ctx.stroke();
  ctx.restore();
}

export async function drawShareCard(b: Briefing, text: CardText): Promise<Blob> {
  // Make sure the site's fonts are ready, or the card falls back to defaults.
  await Promise.all(
    [`600 72px ${SERIF}`, `400 36px ${SANS}`, `600 30px ${SANS}`].map((font) =>
      document.fonts.load(font, b.title + b.summary).catch(() => []),
    ),
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.textBaseline = "top";
  const measure = (s: string) => ctx.measureText(s).width;
  const width = W - PAD * 2;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.accent;
  ctx.fillRect(0, 0, W, 16);

  // Masthead
  emblem(ctx, PAD, 72, 64);
  ctx.fillStyle = C.ink;
  ctx.font = `600 52px ${SERIF}`;
  ctx.fillText("Civica", PAD + 84, 76);
  ctx.fillStyle = C.line;
  ctx.fillRect(PAD, 172, width, 2);

  // Eyebrow and title
  let y = 216;
  ctx.fillStyle = C.accent;
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText(text.eyebrow.toUpperCase(), PAD, y);
  y += 54;
  ctx.fillStyle = C.ink;
  ctx.font = `600 68px ${SERIF}`;
  y = drawLines(ctx, wrapText(measure, b.title, width, 3), PAD, y, 80) + 28;

  // Summary
  ctx.fillStyle = C.ink;
  ctx.font = `400 34px ${SANS}`;
  const first = b.for_you.find((item) => item.certainty !== "not_affected");
  const summaryLines = first ? 5 : 9;
  y = drawLines(ctx, wrapText(measure, b.summary, width, summaryLines), PAD, y, 50) + 36;

  // "What changes for you": the first affected group
  if (first) {
    ctx.font = `400 30px ${SANS}`;
    const body = wrapText(measure, first.what_changes, width - 64, 4);
    ctx.font = `600 30px ${SANS}`;
    const who = wrapText(measure, first.who, width - 64, 1);
    const boxH = 56 + 44 + body.length * 44 + 32;
    const maxBoxBottom = H - 190;
    if (y + boxH <= maxBoxBottom) {
      ctx.fillStyle = C.accentSoft;
      ctx.beginPath();
      ctx.roundRect(PAD, y, width, boxH, 14);
      ctx.fill();
      ctx.fillStyle = C.accent;
      ctx.fillRect(PAD, y, 8, boxH);
      ctx.font = `600 22px ${SANS}`;
      ctx.fillText(text.forYou.toUpperCase(), PAD + 36, y + 28);
      ctx.fillStyle = C.ink;
      ctx.font = `600 30px ${SANS}`;
      drawLines(ctx, who, PAD + 36, y + 64, 44);
      ctx.font = `400 30px ${SANS}`;
      drawLines(ctx, body, PAD + 36, y + 108, 44);
    }
  }

  // Footer
  ctx.fillStyle = C.line;
  ctx.fillRect(PAD, H - 150, width, 2);
  ctx.fillStyle = C.accent;
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText(text.site, PAD, H - 116);
  ctx.fillStyle = C.muted;
  ctx.font = `italic 400 28px ${SERIF}`;
  ctx.fillText(text.tagline, PAD, H - 72);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image"))), "image/png"),
  );
}
