import type { Preprocess } from "./types";

export interface Prefs {
  scale: Preprocess["scale"];
  split: "random" | "chronological";
  eda: boolean;
}

const KEY = "automl-prefs";
const DEFAULTS: Prefs = { scale: "standard", split: "random", eda: true };

export function getPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function setPrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable */
  }
}

export const DEFAULT_PREPROCESS = (scale: Preprocess["scale"]): Preprocess => ({
  impute: "median_mode",
  encode: "onehot",
  scale,
  feature_selection: "none",
  selection: [],
  balancing: [],
  k_best: 10,
  reduction: "none",
  pca_variance: 0.95,
  drop_columns: [],
});
