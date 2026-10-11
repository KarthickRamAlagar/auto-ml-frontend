// Template-based PDF report. One fixed layout is filled with the run's data and drawn straight onto A4 pages with jsPDF:
// real selectable text, vector charts, no screenshots of the page and no AI call. That is why it is fast and small.
// Look: warm page, thin brand border on every page, bento cards with soft shadows, serif headings like the app.
import { REPORT_BRAND } from "./brand";
import type { EdaData, JobView, ModelResult, TreeNode, Verdict } from "./types";

type Doc = import("jspdf").jsPDF;
type RGB = [number, number, number];

const PW = 210;
const PH = 297;
const ML = 14;
const CW = PW - ML * 2; // content width
const MT = 24; // first line on pages after the cover
const MB = 20; // bottom: footer lives below this

const INK: RGB = [38, 38, 36];
const MUTED: RGB = [110, 108, 100];
const LINE: RGB = [226, 223, 214];
const BG: RGB = [251, 250, 246];
const WHITE: RGB = [255, 255, 255];
const SOFT: RGB = [244, 241, 234];
const TINT: RGB = [251, 236, 229];
const BRAND: RGB = [185, 87, 58];
const BLUE: RGB = [59, 105, 191];
const GREEN: RGB = [46, 125, 80];
const AMBER: RGB = [176, 118, 20];
const LINKEDIN: RGB = [10, 102, 194];
const SERIES: RGB[] = [BLUE, BRAND, GREEN, [124, 92, 168], [30, 142, 158], [190, 150, 40], [150, 60, 100], [90, 90, 90]];

const METRIC_LABELS: Record<string, string> = {
  accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1 (weighted)", roc_auc: "ROC-AUC",
  r2: "R2", rmse: "RMSE", mse: "MSE", mae: "MAE",
};
const NAMES: Record<string, string> = {
  class_weight: "Class weights", oversample: "Oversampling", smote: "SMOTE", undersample: "Undersampling",
  kbest: "SelectKBest", variance: "Variance threshold", mutual_info: "Mutual information", rfe: "RFE", lasso: "Lasso (L1)", tree: "Tree importance",
};

/** Built-in PDF fonts only cover Latin-1, so map the few other symbols we use and drop the rest. */
export function clean(s: unknown): string {
  return String(s ?? "")
    .replace(/₹/g, "Rs ").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—−]/g, "-").replace(/…/g, "...")
    .replace(/⚠/g, "!").replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/R²/g, "R2").replace(/×/g, "x")
    .replace(/[^\x00-\xFF]/g, "");
}
const num = (v: number | null | undefined, d = 3) => (v == null || !Number.isFinite(v) ? "-" : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d));
const mlabel = (k: string) => METRIC_LABELS[k] ?? k.toUpperCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtVal = (v: unknown): string => {
  if (v === null || v === undefined) return "None";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  if (Array.isArray(v)) return v.map(fmtVal).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

type Family = "helvetica" | "courier" | "times";

class Writer {
  y = MT;
  constructor(readonly pdf: Doc, readonly running: string) {
    this.paintPage();
  }

  fill(c: RGB) { this.pdf.setFillColor(c[0], c[1], c[2]); }
  stroke(c: RGB) { this.pdf.setDrawColor(c[0], c[1], c[2]); }
  ink(c: RGB) { this.pdf.setTextColor(c[0], c[1], c[2]); }
  font(size: number, style: "normal" | "bold" | "italic" = "normal", family: Family = "helvetica") {
    this.pdf.setFont(family, style);
    this.pdf.setFontSize(size);
  }

  /** Page background and the thin brand border. */
  paintPage() {
    this.fill(BG);
    this.pdf.rect(0, 0, PW, PH, "F");
    this.stroke(BRAND);
    this.pdf.setLineWidth(0.45);
    this.pdf.roundedRect(6, 6, PW - 12, PH - 12, 3, 3, "S");
  }
  newPage() {
    this.pdf.addPage();
    this.paintPage();
    this.y = MT;
  }
  ensure(h: number) {
    if (this.y + h > PH - MB) this.newPage();
  }
  space(h: number) { this.y += h; }

  /** Fits text to a width at the current font. */
  trunc(text: string, w: number) {
    const t = clean(text);
    if (this.pdf.getTextWidth(t) <= w) return t;
    let s = t;
    while (s.length > 1 && this.pdf.getTextWidth(s + "..") > w) s = s.slice(0, -1);
    return s + "..";
  }

  /** A bento card: white, hairline border, soft layered shadow. */
  card(x: number, y: number, w: number, h: number, fill: RGB = WHITE) {
    this.fill([236, 233, 224]);
    this.pdf.roundedRect(x + 0.55, y + 0.95, w, h, 2.6, 2.6, "F");
    this.fill([243, 240, 233]);
    this.pdf.roundedRect(x + 0.3, y + 0.5, w, h, 2.6, 2.6, "F");
    this.fill(fill);
    this.stroke(LINE);
    this.pdf.setLineWidth(0.2);
    this.pdf.roundedRect(x, y, w, h, 2.6, 2.6, "FD");
  }

  h1(text: string) {
    this.ensure(30);
    this.fill(BRAND);
    this.pdf.roundedRect(ML, this.y + 0.8, 1.4, 7.6, 0.7, 0.7, "F");
    this.font(18, "bold", "times");
    this.ink(INK);
    this.pdf.text(clean(text), ML + 4.5, this.y + 6.8);
    this.y += 13;
  }
  h2(text: string) {
    this.ensure(26); // never leave a heading alone at the bottom of a page
    this.font(13, "bold", "times");
    this.ink(INK);
    this.pdf.text(clean(text), ML, this.y + 5);
    this.y += 8;
  }
  h3(text: string, color: RGB = BRAND) {
    this.ensure(22);
    this.font(7.5, "bold");
    this.ink(color);
    this.pdf.text(clean(text).toUpperCase(), ML, this.y + 3.2);
    this.y += 5.5;
  }
  p(text: string, o: { size?: number; color?: RGB; bold?: boolean; x?: number; w?: number; gap?: number } = {}) {
    const size = o.size ?? 9.5;
    const w = o.w ?? CW;
    const x = o.x ?? ML;
    this.font(size, o.bold ? "bold" : "normal");
    this.ink(o.color ?? INK);
    const lh = size * 0.46;
    for (const line of this.pdf.splitTextToSize(clean(text), w) as string[]) {
      this.ensure(lh + 1);
      this.pdf.text(line, x, this.y + lh * 0.8);
      this.y += lh;
    }
    this.y += o.gap ?? 1.5;
  }
  bullets(items: string[], size = 9.2) {
    for (const t of items) {
      this.ensure(size * 0.46 + 1);
      this.fill(BRAND);
      this.pdf.circle(ML + 1.2, this.y + size * 0.3, 0.6, "F");
      this.p(t, { size, x: ML + 4, w: CW - 4, gap: 0.6 });
    }
    this.y += 1.2;
  }
  /** Text in a card with an accent edge. */
  box(text: string, accent: RGB = BRAND, fill: RGB = WHITE, textColor: RGB = INK) {
    this.font(9.3);
    const lines = this.pdf.splitTextToSize(clean(text), CW - 10) as string[];
    const h = lines.length * 4.2 + 6;
    this.ensure(h + 2);
    this.card(ML, this.y, CW, h, fill);
    this.fill(accent);
    this.pdf.roundedRect(ML + 1.6, this.y + 2.4, 1.1, h - 4.8, 0.55, 0.55, "F");
    this.font(9.3);
    this.ink(textColor);
    lines.forEach((l, i) => this.pdf.text(l, ML + 6, this.y + 5 + i * 4.2));
    this.y += h + 2.6;
  }

  /** A row of small bento cards: label above, value below. */
  tiles(items: [string, string][], cols = 4, h = 14) {
    const gap = 3;
    const w = (CW - gap * (cols - 1)) / cols;
    for (let i = 0; i < items.length; i += cols) {
      this.ensure(h + 3);
      items.slice(i, i + cols).forEach(([label, value], j) => {
        const x = ML + j * (w + gap);
        this.card(x, this.y, w, h);
        this.font(6.8);
        this.ink(MUTED);
        this.pdf.text(this.trunc(label, w - 5), x + 3, this.y + 4.6);
        this.font(10.5, "bold");
        this.ink(INK);
        this.pdf.text(this.trunc(value, w - 5), x + 3, this.y + h - 3.6);
      });
      this.y += h + gap;
    }
  }

  /** Simple table. `widths` are fractions of the content width. */
  table(head: string[], rows: string[][], widths: number[], o: { size?: number; highlight?: (r: number) => boolean; align?: ("l" | "r")[] } = {}) {
    const size = o.size ?? 8.2;
    const rh = size * 0.52 + 2.4;
    const xs: number[] = [];
    let acc = ML;
    for (const w of widths) {
      xs.push(acc);
      acc += w * CW;
    }
    const cell = (t: string, i: number, y: number) => {
      const right = o.align?.[i] === "r";
      this.pdf.text(this.trunc(t, widths[i] * CW - 3), right ? xs[i] + widths[i] * CW - 1.5 : xs[i] + 1.5, y, { align: right ? "right" : "left" });
    };
    const header = () => {
      this.ensure(rh * 2);
      this.fill(INK);
      this.pdf.roundedRect(ML, this.y, CW, rh, 1, 1, "F");
      this.font(size, "bold");
      this.ink(WHITE);
      head.forEach((h, i) => cell(h, i, this.y + rh * 0.68));
      this.y += rh;
    };
    header();
    rows.forEach((r, ri) => {
      if (this.y + rh > PH - MB) {
        this.newPage();
        header();
      }
      this.fill(o.highlight?.(ri) ? TINT : ri % 2 === 1 ? SOFT : WHITE);
      this.pdf.rect(ML, this.y, CW, rh, "F");
      this.font(size, o.highlight?.(ri) ? "bold" : "normal");
      this.ink(INK);
      r.forEach((c, i) => cell(c, i, this.y + rh * 0.68));
      this.y += rh;
    });
    this.stroke(LINE);
    this.pdf.setLineWidth(0.2);
    this.pdf.line(ML, this.y, ML + CW, this.y);
    this.y += 3;
  }

  /** Horizontal bars. */
  bars(items: { label: string; value: number; text?: string; color?: RGB }[], o: { max?: number; labelW?: number; w?: number; x?: number } = {}) {
    const x0 = o.x ?? ML;
    const total = o.w ?? CW;
    const lw = o.labelW ?? 46;
    const bw = total - lw - 16;
    const max = o.max ?? Math.max(...items.map((i) => i.value), 1e-9);
    const rh = 5.6;
    for (const it of items) {
      this.ensure(rh + 1);
      this.font(7.8);
      this.ink(INK);
      this.pdf.text(this.trunc(it.label, lw - 2), x0 + lw - 2, this.y + 4, { align: "right" });
      this.fill([235, 232, 224]);
      this.pdf.roundedRect(x0 + lw, this.y + 0.9, bw, rh - 2.2, 0.8, 0.8, "F");
      this.fill(it.color ?? BLUE);
      this.pdf.roundedRect(x0 + lw, this.y + 0.9, Math.max(1, (Math.max(0, it.value) / max) * bw), rh - 2.2, 0.8, 0.8, "F");
      this.font(7.3);
      this.ink(MUTED);
      this.pdf.text(clean(it.text ?? num(it.value)), x0 + lw + bw + 1.5, this.y + 4);
      this.y += rh;
    }
    this.y += 2;
  }

  /** Axes box for line / scatter charts; returns a mapper from data to page coordinates. */
  plot(x: number, y: number, w: number, h: number, title: string, xl: string, yl: string, xr: [number, number], yr: [number, number]) {
    this.font(8.3, "bold");
    this.ink(INK);
    this.pdf.text(clean(title), x, y - 2.5);
    this.fill(WHITE);
    this.stroke(LINE);
    this.pdf.setLineWidth(0.25);
    this.pdf.rect(x, y, w, h, "FD");
    this.font(6.3);
    this.ink(MUTED);
    for (let i = 0; i <= 4; i++) {
      const gx = x + (w * i) / 4;
      const gy = y + h - (h * i) / 4;
      if (i > 0 && i < 4) {
        this.stroke([238, 236, 229]);
        this.pdf.line(gx, y, gx, y + h);
        this.pdf.line(x, gy, x + w, gy);
      }
      this.pdf.text(num(xr[0] + ((xr[1] - xr[0]) * i) / 4, 2), gx, y + h + 3.2, { align: "center" });
      this.pdf.text(num(yr[0] + ((yr[1] - yr[0]) * i) / 4, 2), x - 1.2, gy + 0.8, { align: "right" });
    }
    this.font(6.8);
    this.pdf.text(clean(xl), x + w / 2, y + h + 6.4, { align: "center" });
    this.pdf.text(clean(yl), x - 8.5, y + h / 2, { angle: 90, align: "center" });
    const mx = (v: number) => x + ((v - xr[0]) / (xr[1] - xr[0] || 1)) * w;
    const my = (v: number) => y + h - ((v - yr[0]) / (yr[1] - yr[0] || 1)) * h;
    return { mx, my };
  }
}

// --------------------------------------------------------------------------- brand pieces
/** The Auto ML mark: rising line in a rounded square. */
function drawLogo(wr: Writer, x: number, y: number, s: number) {
  const p = wr.pdf;
  wr.fill(BRAND);
  p.roundedRect(x, y, s, s, s * 0.28, s * 0.28, "F");
  p.setDrawColor(255, 255, 255);
  p.setLineWidth(s * 0.075);
  p.setLineCap("round");
  p.setLineJoin("round");
  const pt = (a: number, b: number): [number, number] => [x + (a / 32) * s, y + (b / 32) * s];
  const pts = [pt(7, 22), pt(13, 15), pt(18, 19), pt(25, 9)];
  for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  p.setFillColor(255, 255, 255);
  p.circle(pts[3][0], pts[3][1], s * 0.075, "F");
  p.setLineCap("butt");
}

/** Outlined pill, e.g. "AUTO DISM · BETA". Returns its width. */
function drawChip(wr: Writer, text: string, x: number, y: number): number {
  wr.font(6.4, "bold");
  const w = wr.pdf.getTextWidth(clean(text)) + 7;
  wr.fill(TINT);
  wr.stroke(BRAND);
  wr.pdf.setLineWidth(0.25);
  wr.pdf.roundedRect(x, y, w, 4.6, 2.3, 2.3, "FD");
  wr.fill(BRAND);
  wr.pdf.circle(x + 2.4, y + 2.3, 0.7, "F");
  wr.ink(BRAND);
  wr.pdf.text(clean(text), x + 4.2, y + 3.2);
  return w;
}

function drawLinkedIn(wr: Writer, x: number, y: number, s: number) {
  wr.fill(LINKEDIN);
  wr.pdf.roundedRect(x, y, s, s, s * 0.2, s * 0.2, "F");
  wr.font(s * 2.1, "bold");
  wr.ink(WHITE);
  wr.pdf.text("in", x + s / 2, y + s * 0.76, { align: "center" });
}

// --------------------------------------------------------------------------- charts
function confusion(wr: Writer, m: ModelResult, x: number, y: number, size: number) {
  const c = m.confusion;
  if (!c || c.labels.length === 0 || c.labels.length > 10) return;
  const n = c.labels.length;
  const cell = Math.min(size / n, 14);
  const gx = x + 14;
  const gy = y + 4;
  wr.font(8.3, "bold");
  wr.ink(INK);
  wr.pdf.text("Confusion matrix", x, y);
  const rowMax = c.matrix.map((r) => Math.max(1, r.reduce((a, b) => a + b, 0)));
  c.matrix.forEach((row, i) =>
    row.forEach((v, j) => {
      const t = v / rowMax[i];
      wr.fill(i === j ? [Math.round(235 - 150 * t), Math.round(243 - 80 * t), Math.round(250 - 20 * t)] : [Math.round(252 - 8 * t), Math.round(246 - 120 * t), Math.round(242 - 140 * t)]);
      wr.pdf.rect(gx + j * cell, gy + i * cell, cell, cell, "F");
      wr.stroke(WHITE);
      wr.pdf.setLineWidth(0.3);
      wr.pdf.rect(gx + j * cell, gy + i * cell, cell, cell, "S");
      wr.font(Math.min(8, cell * 0.7));
      wr.ink(t > 0.55 && i === j ? WHITE : INK);
      wr.pdf.text(String(v), gx + j * cell + cell / 2, gy + i * cell + cell / 2 + 1, { align: "center" });
    }),
  );
  wr.font(6.3);
  wr.ink(MUTED);
  c.labels.forEach((l, i) => {
    const s = clean(l).slice(0, 8);
    wr.pdf.text(s, gx - 1.2, gy + i * cell + cell / 2 + 0.8, { align: "right" });
    wr.pdf.text(s, gx + i * cell + cell / 2, gy + n * cell + 3, { align: "center" });
  });
  wr.pdf.text("actual (rows) vs predicted (columns)", gx, gy + n * cell + 6.5);
}

function rocChart(wr: Writer, m: ModelResult, x: number, y: number, w: number, h: number) {
  const curves = (m.roc ?? []).slice(0, 6);
  if (!curves.length) return;
  const { mx, my } = wr.plot(x, y, w, h, "ROC curve", "False positive rate", "True positive rate", [0, 1], [0, 1]);
  wr.stroke(LINE);
  wr.pdf.setLineDashPattern([1.5, 1.5], 0);
  wr.pdf.line(mx(0), my(0), mx(1), my(1));
  wr.pdf.setLineDashPattern([], 0);
  curves.forEach((c, k) => {
    wr.stroke(SERIES[k % SERIES.length]);
    wr.pdf.setLineWidth(0.5);
    const step = Math.max(1, Math.floor(c.fpr.length / 120));
    for (let i = step; i < c.fpr.length; i += step) wr.pdf.line(mx(c.fpr[i - step]), my(c.tpr[i - step]), mx(c.fpr[i]), my(c.tpr[i]));
    wr.font(6.3);
    wr.ink(SERIES[k % SERIES.length]);
    wr.pdf.text(`${clean(c.label).slice(0, 12)} AUC ${num(c.auc, 3)}`, x + w - 1.5, y + h - 3 - k * 3, { align: "right" });
  });
}

function regPlot(wr: Writer, m: ModelResult, x: number, y: number, w: number, h: number) {
  const r = m.reg_plot;
  if (!r || !r.actual.length) return;
  const lo = Math.min(r.min, ...r.actual, ...r.pred);
  const hi = Math.max(r.max, ...r.actual, ...r.pred);
  const { mx, my } = wr.plot(x, y, w, h, "Predicted vs actual", "Actual", "Predicted", [lo, hi], [lo, hi]);
  wr.stroke(AMBER);
  wr.pdf.setLineWidth(0.4);
  wr.pdf.line(mx(lo), my(lo), mx(hi), my(hi));
  wr.fill(BLUE);
  const step = Math.max(1, Math.floor(r.actual.length / 300));
  for (let i = 0; i < r.actual.length; i += step) wr.pdf.circle(mx(r.actual[i]), my(r.pred[i]), 0.5, "F");
}

function cvBars(wr: Writer, m: ModelResult, x: number, y: number, w: number) {
  const cv = m.cv;
  if (!cv) return;
  wr.font(8.3, "bold");
  wr.ink(INK);
  wr.pdf.text(`${cv.k}-fold cross-validation`, x, y);
  wr.font(7.3);
  wr.ink(MUTED);
  wr.pdf.text(clean(`${cv.metric}: mean ${num(cv.mean)} +/- ${num(cv.std)}${cv.sampled ? " (on a sample)" : ""}`), x, y + 4.5);
  const folds = cv.folds.slice(0, 10);
  const lo = Math.min(...folds, 0);
  const hi = Math.max(...folds, 1e-9);
  folds.forEach((f, i) => {
    const by = y + 8 + i * 4.6;
    wr.font(6.8);
    wr.ink(MUTED);
    wr.pdf.text(`Fold ${i + 1}`, x, by + 2.9);
    wr.fill([235, 232, 224]);
    wr.pdf.roundedRect(x + 12, by, w - 28, 3.2, 0.7, 0.7, "F");
    wr.fill(BLUE);
    wr.pdf.roundedRect(x + 12, by, Math.max(0.8, ((f - lo) / (hi - lo || 1)) * (w - 28)), 3.2, 0.7, 0.7, "F");
    wr.ink(INK);
    wr.pdf.text(num(f), x + w - 15, by + 2.9);
  });
}

// --------------------------------------------------------------------------- decision tree
const BOX_H = 15;
const GAP_H = 8;
const levelsOf = (n: TreeNode): number => 1 + Math.max(0, n.left ? levelsOf(n.left) : 0, n.right ? levelsOf(n.right) : 0);

/** Draws `levels` levels of a tree, root at the top, inside the width `w`. Returns the figure height. */
function drawTree(wr: Writer, root: TreeNode, x: number, y: number, w: number, levels: number, task: string, tags?: Map<TreeNode, string>): number {
  const p = wr.pdf;
  const bw = Math.min(w / 2 ** (levels - 1) - 2, 34);
  const cx = (level: number, idx: number) => x + ((idx + 0.5) * w) / 2 ** level;
  const walk = (n: TreeNode, level: number, idx: number) => {
    const px = cx(level, idx);
    const py = y + level * (BOX_H + GAP_H);
    const kids = level + 1 < levels ? ([n.left, n.right] as (TreeNode | undefined)[]) : [];
    kids.forEach((k, ci) => {
      if (!k) return;
      const kx = cx(level + 1, idx * 2 + ci);
      const mid = py + BOX_H + GAP_H / 2;
      wr.stroke([170, 166, 154]);
      p.setLineWidth(0.3);
      p.line(px, py + BOX_H, px, mid);
      p.line(px, mid, kx, mid);
      p.line(kx, mid, kx, py + BOX_H + GAP_H);
      walk(k, level + 1, idx * 2 + ci);
    });
    // the box is drawn after its connectors so nothing runs over the text
    const leaf = n.feature == null;
    wr.fill(leaf ? TINT : [233, 240, 251]);
    wr.stroke(leaf ? [226, 190, 175] : [190, 208, 236]);
    p.setLineWidth(0.25);
    p.roundedRect(px - bw / 2, py, bw, BOX_H, 1.4, 1.4, "FD");
    const pct = n.share != null ? ` ${Math.round(n.share * 100)}%` : "";
    const head = leaf ? (task === "classification" ? clean(n.label ?? "") : `value ${num(n.value, 2)}`) : `${n.feature} <= ${num(n.threshold, 2)}`;
    const sub = !leaf && task === "classification" ? `class ${n.label ?? ""}${pct}` : `impurity ${num(n.impurity, 2)}`;
    wr.font(5.4, "bold");
    wr.ink(INK);
    const headLines = (p.splitTextToSize(clean(head), bw - 2) as string[]).slice(0, 2);
    headLines.forEach((l, i) => p.text(l, px, py + 3.6 + i * 2.5, { align: "center" }));
    wr.font(5.1);
    wr.ink(MUTED);
    p.text(`n=${n.n}${leaf ? pct : ""}`, px, py + 9.2, { align: "center" });
    p.text(wr.trunc(n.cut ? "more levels below" : sub, bw - 2), px, py + 12.4, { align: "center" });
    const tag = tags?.get(n);
    if (tag) {
      wr.fill(BRAND);
      p.circle(px + bw / 2 - 0.4, py + 0.4, 2, "F");
      wr.font(6, "bold");
      wr.ink(WHITE);
      p.text(tag, px + bw / 2 - 0.4, py + 1.4, { align: "center" });
    }
  };
  walk(root, 0, 0);
  return levels * BOX_H + (levels - 1) * GAP_H;
}

/** The whole tree if it fits one figure; otherwise an overview plus one separate figure per branch. */
function treeSection(wr: Writer, m: ModelResult, task: string) {
  const t = m.tree;
  if (!t?.root) return;
  const total = levelsOf(t.root);
  wr.h3("Decision tree");
  const frame = (h: number, draw: (top: number) => number, title?: string) => {
    wr.ensure(h + 12);
    wr.card(ML, wr.y, CW, h + 10 + (title ? 5 : 0));
    if (title) {
      wr.font(8.3, "bold");
      wr.ink(INK);
      wr.pdf.text(clean(title), ML + 4, wr.y + 5.4);
    }
    draw(wr.y + 5 + (title ? 5 : 0));
    wr.y += h + 13 + (title ? 5 : 0);
  };
  if (total <= 4) {
    frame(total * BOX_H + (total - 1) * GAP_H, (top) => drawTree(wr, t.root, ML + 4, top, CW - 8, total, task));
  } else {
    // overview: top three levels; each branch that continues gets a letter and its own figure below
    const tags = new Map<TreeNode, string>();
    const branches: TreeNode[] = [];
    const collect = (n: TreeNode, level: number) => {
      if (level === 2 && (n.left || n.right)) {
        tags.set(n, String.fromCharCode(65 + branches.length));
        branches.push(n);
      }
      if (level < 2) [n.left, n.right].forEach((k) => k && collect(k, level + 1));
    };
    collect(t.root, 0);
    frame(3 * BOX_H + 2 * GAP_H, (top) => drawTree(wr, t.root, ML + 8, top, CW - 16, 3, task, tags), "Overview: first three levels");
    for (let i = 0; i < branches.length; i += 2) {
      const pair = branches.slice(i, i + 2);
      const lv = Math.min(3, Math.max(...pair.map(levelsOf)));
      const h = lv * BOX_H + (lv - 1) * GAP_H;
      wr.ensure(h + 18);
      const top = wr.y;
      pair.forEach((b, k) => {
        const x = ML + k * (CW / 2 + 1.5);
        const w = CW / 2 - 1.5;
        wr.card(x, top, w, h + 15);
        wr.font(8.3, "bold");
        wr.ink(INK);
        wr.pdf.text(wr.trunc(`Branch ${tags.get(b)}: ${b.feature} <= ${num(b.threshold, 2)}`, w - 8), x + 4, top + 5.4);
        drawTree(wr, b, x + 5, top + 9, w - 10, Math.min(lv, levelsOf(b)), task);
      });
      wr.y = top + h + 18;
    }
  }
  wr.p(
    `Left branch: the condition is true; right branch: false. Boxes in blue are splits, boxes in orange are final answers. ${
      t.depth > t.shown_depth ? `The fitted tree is ${t.depth} levels deep with ${t.leaves} leaves; the first ${t.shown_depth} levels are drawn so every box stays readable.` : `The tree has ${t.leaves} leaves and is drawn in full.`
    }`,
    { size: 7.5, color: MUTED, gap: 2.5 },
  );
}

// --------------------------------------------------------------------------- model block
const TUNING_LABEL = (t?: string) => (!t || t === "default" ? "Default settings" : `${cap(t)} tuning`);

/** Hyperparameters, tuning method and search grid of one model, in one card. */
function paramsCard(wr: Writer, m: ModelResult) {
  const used = m.best_params && Object.keys(m.best_params).length ? m.best_params : m.params ?? {};
  const all = Object.entries(used).map(([k, v]) => [k, fmtVal(v)] as [string, string]);
  const shown = all.slice(0, 24);
  const rows = Math.ceil(shown.length / 2);
  const grid = m.user_grid && Object.keys(m.user_grid).length ? Object.entries(m.user_grid).map(([k, v]) => `${k}: ${fmtVal(v)}`) : [];
  const top = (m.grid_top ?? []).slice(0, 4);
  const lh = 4.1;
  const h = 9 + Math.max(rows, 1) * lh + (all.length > shown.length ? 4 : 0) + (grid.length ? 5 + grid.length * lh : 0) + (top.length ? 5 + top.length * lh : 0) + 2;
  wr.ensure(h + 3);
  const y0 = wr.y;
  wr.card(ML, y0, CW, h);
  wr.font(7.3, "bold");
  wr.ink(BRAND);
  wr.pdf.text("METHOD AND HYPERPARAMETERS", ML + 4, y0 + 5);
  wr.font(7.3);
  wr.ink(MUTED);
  const tag = `${TUNING_LABEL(m.tuning)}${m.cv_score != null ? `  -  tuning CV score ${num(m.cv_score)}` : ""}`;
  wr.pdf.text(clean(tag), ML + CW - 4, y0 + 5, { align: "right" });
  let y = y0 + 9;
  const colW = (CW - 12) / 2;
  if (!shown.length) {
    wr.font(7.8);
    wr.ink(MUTED);
    wr.pdf.text("Library defaults (no parameters were changed).", ML + 4, y + 2.6);
    y += lh;
  }
  shown.forEach(([k, v], i) => {
    const x = ML + 4 + (i % 2) * (colW + 4);
    const yy = y + Math.floor(i / 2) * lh;
    wr.font(7.2);
    wr.ink(MUTED);
    wr.pdf.text(wr.trunc(k, 36), x, yy + 2.6);
    wr.font(7.6, "bold");
    wr.ink(INK);
    wr.pdf.text(wr.trunc(v, colW - 38), x + 38, yy + 2.6);
  });
  y += Math.max(rows, shown.length ? rows : 0) * lh;
  if (all.length > shown.length) {
    wr.font(6.8);
    wr.ink(MUTED);
    wr.pdf.text(`+ ${all.length - shown.length} more parameters`, ML + 4, y + 2.6);
    y += 4;
  }
  if (grid.length) {
    wr.font(6.8, "bold");
    wr.ink(MUTED);
    wr.pdf.text("SEARCH GRID", ML + 4, y + 3.2);
    y += 5;
    grid.forEach((g, i) => {
      wr.font(7.2);
      wr.ink(INK);
      wr.pdf.text(wr.trunc(g, CW - 8), ML + 4, y + i * lh + 2.4);
    });
    y += grid.length * lh;
  }
  if (top.length) {
    wr.font(6.8, "bold");
    wr.ink(MUTED);
    wr.pdf.text("BEST COMBINATIONS TRIED", ML + 4, y + 3.2);
    y += 5;
    top.forEach((g, i) => {
      wr.font(7.2);
      wr.ink(INK);
      wr.pdf.text(`${num(g.score)}`, ML + 4, y + i * lh + 2.4);
      wr.pdf.text(wr.trunc(Object.entries(g.params).map(([k, v]) => `${k}=${fmtVal(v)}`).join(", "), CW - 24), ML + 20, y + i * lh + 2.4);
    });
  }
  wr.y = y0 + h + 3;
}

function modelBlock(wr: Writer, m: ModelResult, task: string, winner: boolean, diagnostics: boolean) {
  wr.ensure(58);
  const hy = wr.y;
  wr.card(ML, hy, CW, 10, winner ? TINT : WHITE);
  wr.font(12, "bold", "times");
  wr.ink(INK);
  wr.pdf.text(clean(m.name), ML + 4, hy + 6.8);
  wr.font(7.3);
  wr.ink(MUTED);
  wr.pdf.text(clean(`${winner ? "BEST MODEL  -  " : ""}${TUNING_LABEL(m.tuning)}  -  trained in ${num(m.train_seconds, 1)}s`), ML + CW - 4, hy + 6.3, { align: "right" });
  wr.y += 13;

  const entries = Object.entries(m.metrics ?? {}).filter(([, v]) => v != null).slice(0, 8) as [string, number][];
  wr.tiles(entries.map(([k, v]) => [mlabel(k), num(v)] as [string, string]), Math.min(4, Math.max(entries.length, 1)), 13);
  if (m.train_primary != null && m.primary != null) wr.p(`Train score ${num(m.train_primary)} vs test ${num(m.primary)}${m.train_primary - m.primary > 0.1 ? " - a large gap suggests overfitting." : "."}`, { size: 8, color: MUTED, gap: 1.2 });
  paramsCard(wr, m);
  for (const n of m.notes ?? []) wr.p(n, { size: 7.8, color: MUTED, gap: 0.8 });

  if (!diagnostics) {
    if (m.tree) treeSection(wr, m, task);
    wr.space(3);
    return;
  }
  if (task === "classification") {
    if (m.report?.rows?.length) {
      wr.h3("Classification report");
      wr.table(
        ["Class", "Precision", "Recall", "F1", "Support"],
        [...m.report.rows.slice(0, 14).map((r) => [r.label, num(r.precision), num(r.recall), num(r.f1), String(r.support)]), ["Accuracy", "", "", num(m.report.accuracy), ""]],
        [0.32, 0.17, 0.17, 0.17, 0.17],
        { size: 7.8, align: ["l", "r", "r", "r", "r"] },
      );
    }
    wr.ensure(72);
    const top = wr.y;
    wr.card(ML, top, 89, 68);
    wr.card(ML + 93, top, 89, 68);
    confusion(wr, m, ML + 5, top + 8, 56);
    rocChart(wr, m, ML + 93 + 14, top + 11, 66, 46);
    wr.y = top + 71;
    if (m.cv) {
      const k = Math.min(m.cv.folds.length, 10);
      const h = 13 + k * 4.6;
      wr.ensure(h + 3);
      wr.card(ML, wr.y, CW, h);
      cvBars(wr, m, ML + 5, wr.y + 5.5, CW * 0.7);
      wr.y += h + 3;
    }
  } else {
    wr.ensure(72);
    const top = wr.y;
    wr.card(ML, top, 89, 68);
    wr.card(ML + 93, top, 89, 68);
    regPlot(wr, m, ML + 15, top + 11, 66, 46);
    if (m.cv) cvBars(wr, m, ML + 98, top + 8, 78);
    if (m.reg_plot) {
      wr.font(7.2);
      wr.ink(MUTED);
      wr.pdf.text(`Residuals: mean ${num(m.reg_plot.residual_mean)}, std ${num(m.reg_plot.residual_std)}`, ML + 98, top + 64);
    }
    wr.y = top + 71;
  }
  if (m.tree) treeSection(wr, m, task);
  wr.space(3);
}

// --------------------------------------------------------------------------- data analysis
function edaSection(wr: Writer, eda: EdaData) {
  wr.h2("Exploratory data analysis");
  const o = eda.overview;
  wr.tiles(
    [
      ["Rows", String(o.rows ?? "-")],
      ["Columns", String(o.cols ?? "-")],
      ["Numeric", String(o.numeric_cols ?? "-")],
      ["Categorical", String(o.categorical_cols ?? "-")],
      ["Duplicate rows", String(o.duplicates ?? 0)],
      ["Missing cells", `${o.missing_pct ?? 0}%`],
    ],
    3,
    13,
  );
  if (eda.inference.length) {
    wr.h3("What the data says");
    wr.bullets(eda.inference.map((i) => `${i.level === "warn" ? "Warning: " : ""}${i.text}`));
  }
  if (eda.target.classes?.length) {
    wr.h3(`Target distribution: ${eda.target.column}`);
    wr.bars(eda.target.classes.slice(0, 10).map((c) => ({ label: c.label, value: c.count, text: `${c.count} (${c.pct.toFixed(0)}%)`, color: BRAND })));
    if (eda.target.imbalance_ratio) wr.p(`Largest class is ${eda.target.imbalance_ratio.toFixed(1)}x the smallest.`, { size: 8, color: MUTED });
  } else if (eda.target.bins?.length) {
    wr.h3(`Target distribution: ${eda.target.column}`);
    wr.bars(eda.target.bins.map((b) => ({ label: b.label, value: b.count, color: BRAND })), { labelW: 30 });
    wr.p(`Mean ${num(eda.target.mean)}, std ${num(eda.target.std)}, skew ${num(eda.target.skew)}.`, { size: 8, color: MUTED });
  }
  if (eda.target_correlation.length) {
    wr.h3("Strongest links with the target (correlation)");
    wr.bars(
      eda.target_correlation.slice(0, 8).map((c) => ({ label: c.column, value: Math.abs(c.r), text: num(c.r, 2), color: c.r >= 0 ? BLUE : BRAND })),
      { max: 1 },
    );
  }
  const miss = eda.missing.filter((m) => m.missing > 0).slice(0, 8);
  if (miss.length) {
    wr.h3("Columns with missing values");
    wr.table(["Column", "Missing", "Share"], miss.map((m) => [m.column, String(m.missing), `${m.pct.toFixed(1)}%`]), [0.6, 0.2, 0.2], { size: 7.8, align: ["l", "r", "r"] });
  }
  if (eda.top_pairs.length) {
    wr.h3("Most correlated feature pairs");
    wr.table(["Feature A", "Feature B", "r"], eda.top_pairs.slice(0, 6).map((p) => [p.a, p.b, num(p.r, 2)]), [0.4, 0.4, 0.2], { size: 7.8, align: ["l", "l", "r"] });
  }
}

// --------------------------------------------------------------------------- one run
type Meths = Record<string, { tried: { method: string; score?: number; error?: string }[]; chosen: string | null; metric?: string }>;

function resultSection(wr: Writer, v: JobView, heading: string, kpis: boolean) {
  const verdict: Verdict | null = v.verdict;
  wr.h1(heading);
  if (kpis) {
    // the cover already shows this for a single run; a combined report needs it per type
    wr.tiles(
      [
        ["Best model", verdict?.winner?.name ?? "-"],
        [verdict?.metric ?? "Score", num(verdict?.winner?.score)],
        ["Models compared", String(v.models.filter((m) => !m.locked && m.status !== "error").length)],
        ["Target", v.config.target],
      ],
      4,
      14,
    );
  }
  if (verdict) {
    wr.h2("Conclusion");
    verdict.text.forEach((t) => wr.p(t, { size: 9.5 }));
    if (v.narrative?.source === "llm") wr.box(v.narrative.text);
    verdict.warnings.forEach((w) => wr.box(`Warning: ${w}`, AMBER, [253, 245, 224], [110, 70, 10]));
  }

  // every method chosen for this dataset, as a bento grid
  wr.ensure(70);
  wr.h2("Methods and settings used");
  const pp = v.config.preprocess;
  const meths = (v.meta as { methods?: Meths } | null)?.methods;
  const tunings = [...new Set(v.config.models.map((m) => m.tuning || "default"))].map((t) => (t === "default" ? "Default" : cap(t))).join(", ");
  const cvK = v.models.find((m) => m.cv)?.cv?.k;
  wr.tiles(
    [
      ["Train / test split", `${cap(v.config.split)}, ${Math.round(v.config.test_size * 100)}% test`],
      ["Missing values", String(pp.impute)],
      ["Scaling", String(pp.scale)],
      ["Encoding", String(pp.encode)],
      ["Feature selection", meths?.selection?.chosen ? NAMES[meths.selection.chosen] ?? meths.selection.chosen : String(pp.feature_selection ?? "none")],
      ["Dimension reduction", String(pp.reduction ?? "none")],
      ["Class balancing", meths?.balancing?.chosen ? NAMES[meths.balancing.chosen] ?? meths.balancing.chosen : "none"],
      ["Hyperparameter tuning", tunings || "Default"],
      ["Cross-validation", cvK ? `${cvK}-fold` : "off"],
    ],
    3,
    13,
  );

  const shown = v.models.filter((m) => !m.locked && m.status !== "error" && m.status !== "skipped");
  if (verdict?.ranking.length) {
    wr.h2("Leaderboard");
    const top = Math.max(...verdict.ranking.map((r) => r.score), 1e-9);
    const nb = Math.min(verdict.ranking.length, 12);
    wr.ensure(nb * 5.6 + 8);
    wr.card(ML, wr.y, CW, nb * 5.6 + 5);
    wr.y += 2.5;
    wr.bars(verdict.ranking.slice(0, 12).map((r, i) => ({ label: r.name, value: Math.max(0, r.score), text: num(r.score), color: i === 0 ? BRAND : BLUE })), { max: Math.max(top, 1), x: ML + 3, w: CW - 6 });
    wr.y += 1;
    const byId = new Map(v.models.map((m) => [m.id, m]));
    wr.table(
      ["#", "Model", verdict.metric, "Train", "Time (s)", "CV mean"],
      verdict.ranking.slice(0, 25).map((r) => {
        const m = byId.get(r.id);
        return [String(r.rank), r.name, num(r.score), num(m?.train_primary), num(m?.train_seconds, 1), m?.cv ? num(m.cv.mean) : "-"];
      }),
      [0.07, 0.35, 0.15, 0.15, 0.14, 0.14],
      { size: 7.8, highlight: (i) => i === 0, align: ["l", "l", "r", "r", "r", "r"] },
    );
  }

  const tried = [["Balancing", meths?.balancing], ["Feature selection", meths?.selection]] as const;
  for (const [label, t] of tried) {
    if (t && t.tried?.length > 1) {
      wr.h3(`${label} methods compared (${t.metric ?? "score"})`);
      wr.table(["Method", "Score"], t.tried.map((x) => [NAMES[x.method] ?? x.method, x.score != null ? num(x.score) : "could not run"]), [0.7, 0.3], { size: 7.8, highlight: (i) => t.tried[i].method === t.chosen, align: ["l", "r"] });
    }
  }

  wr.h2("Model results");
  const order = new Map((verdict?.ranking ?? []).map((r, i) => [r.id, i]));
  const sorted = [...shown].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  sorted.forEach((m, i) => modelBlock(wr, m, v.config.task, verdict?.winner?.id === m.id, i < 6));
  if (sorted.length > 6) wr.p("Charts are shown for the six best models; the rest list their scores and settings only.", { size: 8, color: MUTED });
  if (v.models.some((m) => m.locked)) wr.p(`${v.models.filter((m) => m.locked).length} model(s) are locked until payment and are not included.`, { size: 8, color: MUTED });

  if (v.eda) edaSection(wr, v.eda);
}

function codeAppendix(wr: Writer, script: string, heading: string) {
  wr.newPage();
  wr.h2(heading);
  const lh = 2.9;
  const lines: string[] = [];
  wr.font(6.6, "normal", "courier");
  for (const raw of script.split("\n")) lines.push(...(wr.pdf.splitTextToSize(clean(raw).replace(/\t/g, "    ") || " ", CW - 8) as string[]));
  let i = 0;
  while (i < lines.length) {
    const fit = Math.max(1, Math.floor((PH - MB - wr.y - 6) / lh));
    const chunk = lines.slice(i, i + fit);
    const h = chunk.length * lh + 5;
    wr.card(ML, wr.y, CW, h, [250, 249, 245]);
    wr.font(6.6, "normal", "courier");
    wr.ink(INK);
    chunk.forEach((l, k) => wr.pdf.text(l, ML + 4, wr.y + 4.4 + k * lh));
    wr.y += h + 3;
    i += fit;
    if (i < lines.length) wr.newPage();
  }
}

function comparisonSection(wr: Writer, runs: JobView[]) {
  wr.h1("Classification vs regression");
  wr.p("The same dataset was analysed twice: once as a classification problem and once as a regression problem. Scores are not comparable across the two (accuracy-type scores vs error-type scores), so judge each against its own baseline.", { size: 9, color: MUTED });
  const best = (v: JobView) => v.models.find((m) => m.id === v.verdict?.winner?.id);
  const rows: [string, (v: JobView) => string][] = [
    ["Target", (v) => v.config.target],
    ["Best model", (v) => v.verdict?.winner?.name ?? "-"],
    ["Headline score", (v) => `${num(v.verdict?.winner?.score)} (${v.verdict?.metric ?? ""})`],
    ["Models compared", (v) => String(v.models.filter((m) => !m.locked && m.status !== "error").length)],
    ["Test split", (v) => `${Math.round(v.config.test_size * 100)}%`],
    ["Train time (best)", (v) => `${num(best(v)?.train_seconds, 1)} s`],
    ["K-fold CV (best)", (v) => (best(v)?.cv ? `${num(best(v)!.cv!.mean)} +/- ${num(best(v)!.cv!.std)}` : "-")],
  ];
  const metricKeys = [...new Set(runs.flatMap((v) => Object.keys(best(v)?.metrics ?? {})))];
  for (const k of metricKeys) rows.push([`${mlabel(k)} (best model)`, (v) => num(best(v)?.metrics?.[k] ?? null)]);
  wr.table(["", ...runs.map((v) => cap(v.config.task))], rows.map(([l, f]) => [l, ...runs.map(f)]), [0.34, ...runs.map(() => 0.66 / runs.length)], { size: 8.5 });
}

// --------------------------------------------------------------------------- entry point
export interface PdfProgress {
  (stage: string): void;
}
export interface PdfOptions {
  /** Printed on the cover and in the file's properties. The caller turns it into the file name. */
  title: string;
  filename: string;
}

/** One report (single run) or several (the two task types of a main chat). */
export async function buildReportPdf(runs: JobView[], opt: PdfOptions, onStage?: PdfProgress): Promise<void> {
  if (!runs.length) throw new Error("Nothing to export yet.");
  onStage?.("Loading PDF engine");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: clean(opt.title), subject: "Auto ML report", author: REPORT_BRAND.maker, creator: "Auto ML" });
  const wr = new Writer(pdf, opt.title);
  const both = runs.length > 1;

  // ---- cover: logo + title, then a bento grid. No colored band, no wasted page.
  onStage?.("Laying out the report");
  drawLogo(wr, ML, 13, 11);
  wr.font(15, "bold", "times");
  wr.ink(INK);
  pdf.text("Auto ML", ML + 14, 21);
  drawChip(wr, REPORT_BRAND.chip, ML + 14 + pdf.getTextWidth("Auto ML") + 3, 17.6);
  wr.font(8);
  wr.ink(MUTED);
  pdf.text(clean(REPORT_BRAND.platformLine), PW - ML, 20.5, { align: "right" });
  wr.font(26, "bold", "times");
  wr.ink(INK);
  const titleLines = (pdf.splitTextToSize(clean(opt.title), CW) as string[]).slice(0, 3);
  titleLines.forEach((l, i) => pdf.text(l, ML, 42 + i * 11));
  let y = 42 + (titleLines.length - 1) * 11;
  wr.font(10);
  wr.ink(MUTED);
  pdf.text(clean(`${runs[0].dataset}  -  ${runs[0].config.domain}`), ML, y + 8);
  wr.fill(BRAND);
  pdf.roundedRect(ML, y + 12, 22, 0.9, 0.45, 0.45, "F");
  y += 20;

  const when = new Date((runs[0].generated_at ?? Date.now() / 1000) * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  // hero card: best model(s) / small cards: task, target
  const heroW = 112;
  const sideW = CW - heroW - 3;
  wr.card(ML, y, heroW, 36, TINT);
  const colW = heroW / runs.length;
  runs.forEach((v, i) => {
    const x = ML + i * colW + 5;
    wr.font(6.8, "bold");
    wr.ink(BRAND);
    pdf.text(clean(`BEST ${both ? cap(v.config.task).toUpperCase() + " " : ""}MODEL`), x, y + 7);
    wr.font(both ? 13 : 17, "bold", "times");
    wr.ink(INK);
    const nameLines = (pdf.splitTextToSize(clean(v.verdict?.winner?.name ?? "-"), colW - 9) as string[]).slice(0, 2);
    nameLines.forEach((l, k) => pdf.text(l, x, y + 16 + k * (both ? 5.5 : 7)));
    wr.font(8.5);
    wr.ink(MUTED);
    pdf.text(clean(`${num(v.verdict?.winner?.score)} ${v.verdict?.metric ?? ""}`), x, y + (nameLines.length > 1 ? 31 : 25));
    if (i > 0) {
      wr.stroke(LINE);
      pdf.setLineWidth(0.25);
      pdf.line(ML + i * colW, y + 5, ML + i * colW, y + 31);
    }
  });
  const small = (x: number, yy: number, w: number, h: number, label: string, value: string) => {
    wr.card(x, yy, w, h);
    wr.font(6.8);
    wr.ink(MUTED);
    pdf.text(label, x + 3.5, yy + 5);
    wr.font(10, "bold");
    wr.ink(INK);
    pdf.text(wr.trunc(value, w - 7), x + 3.5, yy + h - 3.8);
  };
  small(ML + heroW + 3, y, sideW, 16.5, "Task", both ? "Both types" : cap(runs[0].config.task));
  small(ML + heroW + 3, y + 19.5, sideW, 16.5, "Target", runs[0].config.target);
  y += 40;
  const third = (CW - 6) / 3;
  const sizeText = runs[0].eda?.overview ? `${runs[0].eda.overview.rows ?? "-"} rows x ${runs[0].eda.overview.cols ?? "-"} cols` : "-";
  small(ML, y, third, 15, "Generated", when);
  small(ML + third + 3, y, third, 15, "Data size", sizeText);
  small(ML + (third + 3) * 2, y, third, 15, "Prepared for", runs[0].user_email ?? "-");
  y += 19;

  // contents card
  const toc = [
    ...(both ? ["Classification vs regression comparison"] : []),
    ...runs.map((v) => `${both ? cap(v.config.task) + ": " : ""}conclusion, methods, leaderboard, model results with hyperparameters${v.eda ? ", data analysis" : ""}${v.script ? ", code" : ""}`),
  ];
  wr.card(ML, y, CW, 9 + toc.length * 5);
  wr.font(6.8, "bold");
  wr.ink(BRAND);
  pdf.text("INSIDE THIS REPORT", ML + 4, y + 5.2);
  toc.forEach((t, i) => {
    wr.fill(BRAND);
    pdf.circle(ML + 5, y + 9.4 + i * 5, 0.6, "F");
    wr.font(8.6);
    wr.ink(INK);
    pdf.text(wr.trunc(t, CW - 14), ML + 8, y + 10.3 + i * 5);
  });
  wr.y = y + 14 + toc.length * 5;

  // ---- body: flows straight after the cover, no forced blank space
  if (both) comparisonSection(wr, runs);
  runs.forEach((v, i) => {
    if (i > 0) wr.newPage();
    onStage?.(`Drawing ${v.config.task} results`);
    resultSection(wr, v, both ? `${cap(v.config.task)} results` : "Results", both);
    if (v.script) codeAppendix(wr, v.script, `${both ? cap(v.config.task) + " " : ""}code (Python, scikit-learn)`);
  });

  // ---- running header (not on the cover) and footer on every page
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    if (i > 1) {
      drawLogo(wr, ML, 9.5, 6.4);
      wr.font(10, "bold", "times");
      wr.ink(INK);
      pdf.text("Auto ML", ML + 8.5, 14.4);
      const cw = drawChip(wr, REPORT_BRAND.chip, ML + 8.5 + pdf.getTextWidth("Auto ML") + 2.5, 11.3);
      wr.font(7.8);
      wr.ink(MUTED);
      pdf.text(wr.trunc(opt.title, PW - ML * 2 - 8.5 - 28 - cw - 6), PW - ML, 14, { align: "right" });
      wr.stroke(LINE);
      pdf.setLineWidth(0.25);
      pdf.line(ML, 18.5, PW - ML, 18.5);
    }
    wr.stroke(LINE);
    pdf.setLineWidth(0.25);
    pdf.line(ML, PH - 14.5, PW - ML, PH - 14.5);
    wr.font(7.5);
    wr.ink(MUTED);
    const made = `Designed & developed by ${REPORT_BRAND.maker}`;
    pdf.text(made, ML, PH - 9.2);
    const ix = ML + pdf.getTextWidth(made) + 3;
    drawLinkedIn(wr, ix, PH - 12.6, 4.2);
    wr.font(7.5);
    wr.ink(LINKEDIN);
    const lt = clean(REPORT_BRAND.linkedinLabel);
    pdf.text(lt, ix + 5.6, PH - 9.2);
    pdf.link(ix, PH - 12.8, 5.6 + pdf.getTextWidth(lt), 5, { url: REPORT_BRAND.linkedinUrl });
    wr.font(7.5);
    wr.ink(MUTED);
    pdf.text(`Page ${i} of ${pages}`, PW - ML, PH - 9.2, { align: "right" });
  }
  onStage?.("Saving");
  pdf.save(opt.filename);
}
