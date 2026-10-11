import { useEffect } from "react";

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

interface Seo {
  title: string;
  description?: string;
  noindex?: boolean;
  path?: string;
}

/** Per-route title / description / robots / canonical. Public pages are also pre-rendered at build time. */
export function useSeo({ title, description, noindex, path }: Seo) {
  useEffect(() => {
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', "content", description, () => {
        const m = document.createElement("meta");
        m.name = "description";
        return m;
      });
    }
    setMeta('meta[name="robots"]', "content", noindex ? "noindex, nofollow" : "index, follow", () => {
      const m = document.createElement("meta");
      m.name = "robots";
      return m;
    });
    const site = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || window.location.origin;
    setMeta('link[rel="canonical"]', "href", `${site}${path ?? window.location.pathname}`, () => {
      const l = document.createElement("link");
      l.rel = "canonical";
      return l;
    });
  }, [title, description, noindex, path]);
}
