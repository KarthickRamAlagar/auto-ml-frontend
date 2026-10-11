// Build-time pre-rendering of public pages for SEO. Runs after `vite build`.
// For each public route we write dist/<route>/index.html with its own <title>, description, canonical and
// crawlable fallback content inside #root (React replaces it on load). Also writes sitemap.xml and robots.txt.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const site = (process.env.VITE_SITE_URL || "https://auto-ml.example.com").replace(/\/$/, "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Search engines still get the text, but people never see it: it is visually hidden, never blocks clicks, and
// main.tsx removes it as soon as the app has started. (It sits next to #root, so React does not clear it itself.)
const wrap = (body) =>
  `<div id="seo-fallback" style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;pointer-events:none">${body}</div>`;

const pages = [
  {
    path: "/",
    title: "Auto ML · Train and compare machine learning models by chatting",
    description: "A guided AutoML workspace: pick a dataset, answer a few questions, and watch classification and regression models train with live code, EDA and a clear conclusion.",
    body: `<main style="max-width:44rem;margin:4rem auto;padding:0 1rem;font-family:system-ui,sans-serif"><h1>Train and compare machine learning models by chatting</h1><p>Pick a dataset, answer a few questions, and watch real models train, with live code, EDA charts and a plain-English conclusion.</p><ul><li>Guided like a chat, with a recommended option at every step</li><li>Live scikit-learn code you can copy or download</li><li>EDA with plain-English inference</li><li>Compare up to 25 classification or regression models</li><li>Quiz arena discounts</li><li>Your datasets are never stored</li></ul><p><a href="/pricing">Pricing</a> · <a href="/login">Sign in</a></p></main>`,
  },
  {
    path: "/pricing",
    title: "Pricing · Auto ML",
    description: "10 models free per window, then ₹2 per model. Quiz discounts, optional video lectures and ₹5 reports.",
    body: `<main style="max-width:44rem;margin:4rem auto;padding:0 1rem;font-family:system-ui,sans-serif"><h1>Pricing</h1><ul><li>10 models free per 5h 40m window</li><li>15 more models at ₹2 each (25 per window)</li><li>Video lecture for a model: ₹2</li><li>Team of 2: +5%</li><li>Report download: ₹5 after 2 free</li></ul><p><a href="/">Home</a></p></main>`,
  },
];

const tpl = readFileSync(join(dist, "index.html"), "utf8");

for (const p of pages) {
  const canonical = `${site}${p.path === "/" ? "/" : p.path}`;
  let html = tpl
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(p.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(p.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(p.description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`)
    .replace("<!--seo-fallback-->", wrap(p.body))
    .replaceAll("__SITE_URL__", site);
  if (!/<link rel="canonical"/.test(html)) html = html.replace("</head>", `<link rel="canonical" href="${canonical}" /></head>`);
  const dir = p.path === "/" ? dist : join(dist, p.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

// Private routes must not be indexed; the app shell also sets noindex at runtime.
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${site}${p.path === "/" ? "/" : p.path}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /auto-ml\nDisallow: /admin\nDisallow: /report/\nSitemap: ${site}/sitemap.xml\n`);
console.log(`prerendered ${pages.length} pages for ${site}`);
