import { ArrowRight, BarChart3, Database, FileSearch, GitCompare, Layers, SkipForward, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { DatasetSession, EdaData, Task } from "@/lib/types";
import { fmtInt } from "@/lib/utils";
import { EdaView } from "./EdaView";

/** What has been finalised so far, as tabs, with the question "proceed to EDA?". */
export function RequirementsCard({
  task,
  domain,
  session,
  target,
  onProceed,
  onSkip,
}: {
  task: Task;
  domain: string;
  session: DatasetSession;
  target: string;
  onProceed: () => void;
  onSkip: () => void;
}) {
  const col = session.profile.columns.find((c) => c.name === target);
  const missing = session.profile.columns.filter((c) => c.missing > 0).length;
  return (
    <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div>
        <p className="font-serif text-[16px] font-medium">Your requirements are finalised</p>
        <p className="text-[13px] text-muted-foreground">Check each tab. Shall I proceed to exploratory data analysis (EDA)?</p>
      </div>
      <Tabs defaultValue="problem">
        <TabsList>
          <TabsTrigger value="problem">
            <Layers /> Problem
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database /> Data
          </TabsTrigger>
          <TabsTrigger value="target">
            <Target /> Target
          </TabsTrigger>
        </TabsList>
        <TabsContent value="problem" className="mt-3">
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Type of learning</dt>
            <dd className="font-medium capitalize">{task}</dd>
            <dt className="text-muted-foreground">Domain</dt>
            <dd className="font-medium">{domain}</dd>
          </dl>
        </TabsContent>
        <TabsContent value="data" className="mt-3">
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Dataset</dt>
            <dd className="font-medium">{session.name}</dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium">
              {fmtInt(session.profile.rows)} rows × {session.profile.cols} columns
            </dd>
            <dt className="text-muted-foreground">Missing values</dt>
            <dd className="font-medium">{missing ? `${missing} column(s) have gaps` : "none found"}</dd>
          </dl>
        </TabsContent>
        <TabsContent value="target" className="mt-3">
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Predicting</dt>
            <dd className="font-medium">{target}</dd>
            <dt className="text-muted-foreground">Column type</dt>
            <dd className="font-medium">{col ? `${col.kind}, ${col.unique} unique value(s)` : ""}</dd>
          </dl>
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onSkip}>
          <SkipForward /> Skip EDA
        </Button>
        <Button onClick={onProceed}>
          Proceed to EDA <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

/** Runs the EDA before training so the balancing and feature-selection advice can follow it. */
export function EdaStage({
  datasetId,
  target,
  task,
  columns,
  onDone,
}: {
  datasetId: string;
  target: string;
  task: Task;
  columns: string[] | null;
  onDone: (eda: EdaData) => void;
}) {
  const [eda, setEda] = useState<EdaData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .post<EdaData>("/api/datasets/eda", { dataset_id: datasetId, target, task, columns })
      .then((r) => alive && setEda(r))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (err)
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <p className="text-sm text-destructive">Couldn't run the EDA: {err}</p>
        <Button size="sm" variant="outline" onClick={() => onDone({} as EdaData)}>
          Continue without it
        </Button>
      </div>
    );
  if (!eda)
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Spinner /> Exploring your data…
      </div>
    );
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 font-serif text-[16px] font-medium">
        <BarChart3 className="size-4 text-primary" /> Exploratory data analysis
      </p>
      <EdaView eda={eda} />
      <div className="flex justify-end">
        <Button onClick={() => onDone(eda)}>
          <FileSearch /> Continue to data preparation <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

/** A finished step collapsed to one line, with a way to change it (and everything after it). */
export function StageRow({ label, value, onChange }: { label: string; value: string; onChange?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={value}>
        {value}
      </span>
      {onChange && (
        <button type="button" onClick={onChange} className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-primary/10">
          Change
        </button>
      )}
    </div>
  );
}

/** After a run: offer the other ML type on the same dataset. */
export function AnotherTypeCard({ task, dataset, busy, error, onYes, onNo }: { task: Task; dataset: string; busy?: boolean; error?: string | null; onYes: () => void; onNo: () => void }) {
  const other = task === "classification" ? "regression" : "classification";
  return (
    <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <GitCompare className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="font-serif text-[16px] font-medium">
            Want to run <span className="capitalize">{other}</span> on the same dataset too?
          </p>
          <p className="text-[13px] text-muted-foreground">
            {dataset} can be used for both types of learning. If you say yes, this {task} run moves into a sub-chat, and you go through the whole flow again for {other}. At the end the main chat shows both side by side, with a comparison table, interpretations and separate code downloads.
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onNo} disabled={busy}>
          No, I'm done
        </Button>
        <Button onClick={onYes} disabled={busy}>
          {busy && <Spinner />} Yes, run {other} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
