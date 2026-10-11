import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const Ctx = createContext<{ theme: ThemeChoice; setTheme: (t: ThemeChoice) => void; resolved: "light" | "dark" } | null>(null);

function resolve(t: ThemeChoice): "light" | "dark" {
  if (t === "system") return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(() => (localStorage.getItem("automl-theme") as ThemeChoice) || "system");
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(theme));

  useEffect(() => {
    const apply = () => {
      const r = resolve(theme);
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
      document.documentElement.dataset.theme = r;
    };
    apply();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme: (t: ThemeChoice) => {
        localStorage.setItem("automl-theme", t);
        setThemeState(t);
      },
    }),
    [theme, resolved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
};
