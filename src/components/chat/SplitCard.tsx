import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/input";
import { getPrefs } from "@/lib/prefs";

export interface SplitChoice {
  split: "random" | "chronological";
  test_size: number;
  time_column: string | null;
  cv_folds: number;
}

export function SplitCard({ datetimeColumns, done, onSubmit }: { datetimeColumns: string[]; done?: boolean; onSubmit: (c: SplitChoice, summary: string) => void }) {
  const [split, setSplit] = useState<"random" | "chronological">(getPrefs().split);
  const [testSize, setTestSize] = useState("0.2");
  const [timeCol, setTimeCol] = useState(datetimeColumns[0] ?? "");
  const [cv, setCv] = useState("3");
  if (done) return null;
  const rec = <Badge className="ml-1">Recommended</Badge>;
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <p className="font-serif text-[16px] font-medium">How should I split train and test data?</p>
      <div className="space-y-1.5">
        <Segmented
          label="Split type"
          value={split}
          onChange={setSplit}
          options={[
            { v: "random", label: "Random", badge: datetimeColumns.length === 0 ? rec : undefined },
            { v: "chronological", label: "Chronological", badge: datetimeColumns.length > 0 ? rec : undefined },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {split === "random"
            ? "Shuffles rows (stratified for classification). Good when rows are independent."
            : "Trains on older rows and tests on the newest. Use for time-ordered data so the model never sees the future."}
        </p>
      </div>
      {split === "chronological" && datetimeColumns.length === 0 && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          This dataset has no date column, so rows are assumed to be in time order. If the rows are sorted by the target (common in public datasets), a chronological split can't work and I'll switch to a random split automatically. Random is the safer choice here.
        </p>
      )}
      {split === "chronological" && (
        <div className="max-w-xs space-y-1.5">
          <label className="text-[13px] font-medium" htmlFor="timecol">
            Date/time column
          </label>
          <Select id="timecol" value={timeCol} onChange={(e) => setTimeCol(e.target.value)}>
            <option value="">None (rows are already in time order)</option>
            {datetimeColumns.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium">Test size</p>
          <Segmented
            label="Test size"
            value={testSize}
            onChange={setTestSize}
            options={[
              { v: "0.1", label: "10%" },
              { v: "0.2", label: "20%", badge: rec },
              { v: "0.3", label: "30%" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium">Cross-validation folds (tuning)</p>
          <Segmented
            label="Folds"
            value={cv}
            onChange={setCv}
            options={[
              { v: "3", label: "3", badge: rec },
              { v: "5", label: "5" },
            ]}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() =>
            onSubmit(
              { split, test_size: Number(testSize), time_column: split === "chronological" && timeCol ? timeCol : null, cv_folds: Number(cv) },
              `${split} split, ${Math.round(Number(testSize) * 100)}% test`,
            )
          }
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
