export type Task = "classification" | "regression";

export interface Usage {
  unlimited: boolean;
  free_limit: number;
  paid_limit: number;
  free_used: number;
  paid_used: number;
  free_remaining: number;
  paid_remaining: number;
  total_remaining: number;
  window_seconds: number;
  window_start: number | null;
  resets_at: number | null;
  now: number;
  verified_spend: number;
  reports_used: number;
  paid_blocked: boolean;
}

export interface Me {
  uid: string;
  email: string;
  is_admin: boolean;
  is_vip: boolean;
  usage: Usage;
  limits: { free: number; paid: number; quiz_seconds: number; report_price: number; free_reports: number; free_methods: number; method_price: number };
}

export interface DatasetCardInfo {
  id: string;
  name: string;
  source: "builtin" | "kaggle" | "huggingface" | "uci" | string;
  description: string;
  rows: number | null;
  cols: number | null;
  size_mb: number | null;
  domains: string[];
  tasks: string[];
  license: string;
  synthetic: boolean;
  url: string | null;
  default_target: string | null;
  match: boolean;
  shape_checked?: boolean;
  downloads?: number;
}

export type DatasetSource = "recommended" | "kaggle" | "huggingface" | "uci";

export interface SuggestResult {
  items: DatasetCardInfo[];
  warnings: string[];
  source: DatasetSource;
  rule: { min_rows: number; min_cols: number };
}

export interface ColumnInfo {
  name: string;
  kind: "numeric" | "categorical" | "datetime" | "boolean" | "text";
  dtype: string;
  missing: number;
  unique: number;
}

export interface DatasetSession {
  dataset_id: string;
  name: string;
  source: string;
  ref?: string | null;
  profile: { rows: number; cols: number; columns: ColumnInfo[] };
  suggested_target: string;
  datetime_columns: string[];
}

export interface ParamSpec {
  name: string;
  label: string;
  type: "int" | "float" | "choice";
  default: number | string | null;
  min: number | null;
  max: number | null;
  options: (string | number)[];
  help: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  blurb: string;
  recommended: boolean;
  why: string;
  params: ParamSpec[];
  has_grid: boolean;
  slow: boolean;
}

export interface Preprocess {
  impute: "median_mode" | "mean_mode" | "drop_rows";
  encode: "onehot" | "ordinal";
  scale: "none" | "standard" | "minmax" | "robust";
  feature_selection: "none" | "kbest" | "variance"; // legacy single choice, kept for old saved chats
  selection: SelectionMethod[];
  balancing: BalancingMethod[];
  k_best: number;
  reduction: "none" | "pca";
  pca_variance: number;
  drop_columns: string[];
}

export type SelectionMethod = "kbest" | "variance" | "mutual_info" | "rfe" | "lasso" | "tree";
export type BalancingMethod = "class_weight" | "oversample" | "smote" | "undersample";

export interface ModelSpec {
  id: string;
  tuning: "default" | "grid" | "grid_user" | "custom";
  /** custom: one value per parameter. grid_user: a list of values per parameter. */
  params: Record<string, number | string | null | (number | string | null)[]>;
}

export interface MethodInfo {
  name: string;
  blurb: string;
}

export interface MethodAdvice {
  features: number;
  rows: number;
  free_methods: number;
  method_price: number;
  balancing: { required: boolean; recommended: BalancingMethod[]; reason: string; ratio: number | null; distribution: { label: string; count: number }[] };
  selection: { required: boolean; recommended: SelectionMethod[]; reason: string };
  info: { balancing: Record<string, MethodInfo>; selection: Record<string, MethodInfo> };
}

export interface JobConfig {
  dataset_id: string;
  task: Task;
  domain: string;
  target: string;
  eda: boolean;
  eda_columns?: string[] | null;
  preprocess: Preprocess;
  split: "random" | "chronological";
  test_size: number;
  time_column: string | null;
  cv_folds: number;
  models: ModelSpec[];
  videos: boolean;
  team: boolean;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface Quote {
  models: number;
  free_models: number;
  paid_models: number;
  video_models: number;
  methods: number;
  paid_methods: number;
  team: boolean;
  quiz_correct: number;
  lines: QuoteLine[];
  subtotal: number;
  gross: number;
  quiz_discount: number;
  total: number;
  needs_payment: boolean;
  within_cap?: boolean;
  usage?: Usage;
}

export interface Step {
  id: string;
  title: string;
  code: string | null;
  logs: string[];
  status: "running" | "done" | "error" | "skipped";
  ms?: number | null;
  error?: string | null;
  model_id?: string | null;
  locked?: boolean;
}

export interface ModelResult {
  id: string;
  name: string;
  status?: "done" | "error" | "skipped";
  locked?: boolean;
  error?: string;
  tuning?: string;
  params?: Record<string, unknown>;
  best_params?: Record<string, unknown>;
  cv_score?: number | null;
  grid_top?: { params: Record<string, unknown>; score: number | null }[];
  curve?: { k: number; score: number | null }[];
  metrics?: Record<string, number | null>;
  primary?: number | null;
  train_primary?: number | null;
  train_seconds?: number;
  confusion?: { labels: string[]; matrix: number[][] };
  notes?: string[];
  tree?: TreePicture | null;
  user_grid?: Record<string, unknown[]>;
  cv?: { folds: number[]; mean: number; std: number; k: number; metric: string; sampled: boolean } | null;
  report?: { rows: { label: string; precision: number; recall: number; f1: number; support: number }[]; accuracy: number } | null;
  roc?: { label: string; auc: number; fpr: number[]; tpr: number[] }[] | null;
  reg_plot?: { actual: number[]; pred: number[]; residual_mean: number; residual_std: number; min: number; max: number } | null;
}

export interface MethodsMeta {
  locked?: boolean;
  selection?: { tried: { method: string; score?: number; error?: string }[]; chosen: string | null; metric?: string };
  balancing?: { tried: { method: string; score?: number; error?: string }[]; chosen: string | null; metric?: string };
}

export interface TreeNode {
  n: number;
  label?: string;
  share?: number;
  value?: number;
  impurity?: number;
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  cut?: boolean;
}

export interface TreePicture {
  root: TreeNode;
  depth: number;
  leaves: number;
  shown_depth: number;
  task: Task;
}

export interface Verdict {
  winner: { id: string; name: string; score: number } | null;
  ranking: { id: string; name: string; score: number; rank: number }[];
  text: string[];
  warnings: string[];
  metric: string;
  locked_models: number;
}

export interface EdaData {
  overview: Record<string, number>;
  missing: { column: string; missing: number; pct: number }[];
  numeric_summary: Record<string, number | string | null>[];
  histograms: { column: string; bins: { label: string; start: number; count: number }[] }[];
  target: {
    column: string;
    task: Task;
    classes?: { label: string; count: number; pct: number }[];
    imbalance_ratio?: number | null;
    bins?: { label: string; start: number; count: number }[];
    mean?: number | null;
    std?: number | null;
    skew?: number | null;
  };
  correlation: { columns: string[]; matrix: (number | null)[][] };
  top_pairs: { a: string; b: string; r: number }[];
  target_correlation: { column: string; r: number }[];
  categorical: { column: string; unique: number; values: { label: string; count: number }[] }[];
  inference: { level: "info" | "warn" | "good"; text: string }[];
  columns?: { name: string; kind: string; role: "target" | "feature"; missing: number; unique: number; explored: boolean }[];
}

export interface Lecture {
  model_id: string;
  name: string;
  video_ids: string[];
  videos: { id: string; title: string; channel: string }[];
  search_url: string;
  status?: string;
  reason?: string;
  detail?: string;
  note?: string;
  lang?: string;
}

export interface LectureSet {
  lang: string;
  languages: { code: string; name: string }[];
  lectures: Lecture[];
}

export interface JobView {
  id: string;
  status: "queued" | "running" | "done" | "error";
  error: string | null;
  dataset: string;
  config: {
    task: Task;
    domain: string;
    target: string;
    split: string;
    test_size: number;
    preprocess: Preprocess;
    models: { id: string; tuning: string }[];
    eda: boolean;
    videos: boolean;
    team: boolean;
  };
  steps: Step[];
  eda: EdaData | null;
  models: ModelResult[];
  verdict: Verdict | null;
  meta: Record<string, unknown> | null;
  script: string | null;
  lectures: Lecture[];
  locks: {
    needs_payment: boolean;
    unlocked: boolean;
    locked_models: number;
    videos_locked: boolean;
    methods_locked?: boolean;
    paid_methods?: number;
    payment_id: string | null;
    rejected: boolean;
    free_remaining_before: number;
  };
  project_id: string;
  narrative?: { text: string; source: string } | null;
  generated_at?: number;
  user_email?: string;
}

export interface Payment {
  id: string;
  ref: string;
  kind: "models" | "report";
  job_id: string;
  amount: number;
  breakdown: Quote | { lines: QuoteLine[]; total: number };
  status: "created" | "claimed" | "approved" | "rejected";
  created_at: number;
  claimed_at: number | null;
  decided_at: number | null;
  upi_uri: string;
  payee: string;
  reminded_at?: number | null;
  reminders?: number;
  project_id?: string | null;
  remind_after: number;
  now: number;
  context?: { domain?: string; task?: string; models?: string[] };
}

export interface Project {
  id: string;
  job_id: string;
  title: string;
  domain: string;
  task: Task;
  dataset: string;
  models: string[];
  winner: { id: string; name: string; score: number } | null;
  status: string;
  created_at: number;
  updated_at?: number;
  expires_at?: number;
  group_id: string | null;
  /** "main" groups the classification and regression sub-chats of one dataset; "run" (or absent) is a single run. */
  kind?: "main" | "run";
  parent_id?: string | null;
  children?: string[];
}

/** A chat is one saved run, or a main chat holding up to two runs (one per ML type) as sub-chats. */
export type Chat = Project;

export interface PaymentRow extends Payment {
  chat: { id: string; title: string; dataset: string } | null;
}

export interface Group {
  id: string;
  name: string;
  created_at: number;
  chat_count: number;
  domain: string | null;
  task: Task | null;
}

export interface EdaColumn {
  column: string;
  kind: string;
  score: number;
  missing_pct: number;
  recommended: boolean;
}

export interface EdaColumns {
  columns: EdaColumn[];
  recommended: string[];
  skipped: Record<string, string>;
  wide: boolean;
  threshold: number;
}

export interface QuizQuestion {
  finished: false;
  quiz_id: string;
  index: number;
  total: number;
  qid: string;
  domain: string;
  text: string;
  options: { id: string; text: string }[];
  seconds_left: number;
  question_seconds: number;
}

export interface QuizDone {
  finished: true;
  score: number;
  total: number;
  per_question: { domain: string; correct: boolean; timed_out: boolean }[];
}

export type ServerEvent =
  | { type: "job_start" }
  | { type: "step_start"; id: string; title: string; code: string | null; model_id: string | null; locked?: boolean }
  | { type: "step_code"; id: string; code: string }
  | { type: "log"; step: string; text: string }
  | { type: "step_end"; id: string; status: "done" | "error" | "skipped"; ms: number; error?: string; model_id?: string | null }
  | { type: "eda"; data: EdaData }
  | { type: "model_result"; model_id: string; result: ModelResult }
  | { type: "job_end"; status: "done" | "error"; error: string | null };

export interface PlanParam extends ParamSpec {
  recommended: number | string | null;
  reason: string;
  ask: boolean;
}

export interface ModelPlan {
  facts: { rows: number; cols: number; task: string; classes?: number; imbalance?: number };
  plans: Record<string, { id: string; name: string; params: PlanParam[]; measured: boolean }>;
  summary: { text: string; source: "rules" | "llm" };
}

export interface ParsedModels {
  model_ids: string[];
  not_for_task: string[];
  not_offered: string[];
  source: "rules" | "llm";
}
