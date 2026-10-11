import { useEffect, useRef } from "react";
import type { TreeNode, TreePicture } from "@/lib/types";
import { fmtNum } from "@/lib/utils";

const W = 128;
const H = 52;
const GX = 10;
const GY = 34;

interface Placed {
  n: TreeNode;
  x: number;
  y: number;
  parent?: Placed;
  side?: "yes" | "no";
}

/** Draws the top levels of the fitted decision tree as an SVG (leaves at the bottom, left = condition true). */
export function TreeView({ tree }: { tree: TreePicture }) {
  const placed: Placed[] = [];
  let slot = 0;
  const place = (n: TreeNode, depth: number, parent?: Placed, side?: "yes" | "no"): Placed => {
    const y = depth * (H + GY) + 8;
    let p: Placed;
    if (n.left && n.right) {
      const tmp: Placed = { n, x: 0, y, parent, side };
      const a = place(n.left, depth + 1, tmp, "yes");
      const b = place(n.right, depth + 1, tmp, "no");
      tmp.x = (a.x + b.x) / 2;
      p = tmp;
    } else {
      p = { n, x: slot * (W + GX) + 8, y, parent, side };
      slot += 1;
    }
    placed.push(p);
    return p;
  };
  place(tree.root, 0);
  const width = Math.max(slot, 1) * (W + GX) + 8;
  const maxY = Math.max(...placed.map((p) => p.y)) + H + 8;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, [width]);
  const clip = (s: string, k: number) => (s.length > k ? `${s.slice(0, k - 1)}…` : s);

  return (
    <div>
      <div ref={box} className="overflow-x-auto rounded-md border bg-[var(--viz-surface)]">
        <svg width={width} height={maxY} role="img" aria-label={`Decision tree, depth ${tree.depth}, ${tree.leaves} leaves`} className="block">
          {placed.map((p, i) =>
            p.parent ? (
              <g key={`e${i}`}>
                <path
                  d={`M ${p.parent.x + W / 2} ${p.parent.y + H} C ${p.parent.x + W / 2} ${p.parent.y + H + GY / 2}, ${p.x + W / 2} ${p.y - GY / 2}, ${p.x + W / 2} ${p.y}`}
                  fill="none"
                  stroke="var(--viz-axis)"
                  strokeWidth={1.5}
                />
                <text x={(p.parent.x + p.x) / 2 + W / 2 + (p.side === "yes" ? -6 : 6)} y={p.y - 8} textAnchor={p.side === "yes" ? "end" : "start"} fontSize={10} fill="var(--viz-muted)">
                  {p.side === "yes" ? "yes" : "no"}
                </text>
              </g>
            ) : null,
          )}
          {placed.map((p, i) => {
            const leaf = !p.n.feature;
            const title = leaf ? (tree.task === "classification" ? String(p.n.label) : fmtNum(p.n.value ?? null, 2)) : `${clip(String(p.n.feature), 16)} ≤ ${fmtNum(p.n.threshold ?? null, 2)}`;
            const sub = tree.task === "classification" ? `${p.n.n.toLocaleString("en-IN")} rows · ${Math.round((p.n.share ?? 0) * 100)}% ${clip(String(p.n.label), 8)}` : `${p.n.n.toLocaleString("en-IN")} rows`;
            return (
              <g key={`n${i}`} transform={`translate(${p.x},${p.y})`}>
                <title>{`${p.n.feature ? `${p.n.feature} ≤ ${p.n.threshold}` : "leaf"} · ${sub} · impurity ${p.n.impurity}`}</title>
                <rect width={W} height={H} rx={8} fill="var(--viz-surface)" stroke={leaf ? "var(--series-1)" : "var(--viz-axis)"} strokeWidth={leaf ? 2 : 1.25} />
                <text x={W / 2} y={21} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--viz-ink)">
                  {title}
                </text>
                <text x={W / 2} y={38} textAnchor="middle" fontSize={10} fill="var(--viz-ink-2)">
                  {sub}
                </text>
                {p.n.cut && (
                  <text x={W / 2} y={H + 14} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">
                    ⋯ more levels
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Fitted tree: depth {tree.depth}, {tree.leaves} leaves. Showing the top {tree.shown_depth} levels. Follow “yes” when the condition is true. Outlined boxes are final decisions.
      </p>
    </div>
  );
}
