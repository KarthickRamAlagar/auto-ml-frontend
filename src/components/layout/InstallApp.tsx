import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { clearInstallEvent, getInstallEvent, onInstallChange, type InstallEvent } from "@/lib/install";

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** Sidebar button that installs Auto ML as an app (PWA). Chrome/Edge/Android show the install prompt; iPhone/iPad get the Add to Home Screen steps. */
export function InstallApp() {
  const [evt, setEvt] = useState<InstallEvent | null>(() => getInstallEvent());
  const [installed, setInstalled] = useState(() => (typeof window === "undefined" ? false : isStandalone()));
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEvt(getInstallEvent());
      if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    };
    sync();
    return onInstallChange(sync);
  }, []);

  if (installed) return null;
  const ios = isIos();
  if (!evt && !ios) return null;

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            const r = await evt.userChoice;
            if (r.outcome === "accepted") setInstalled(true);
            clearInstallEvent();
          } else setHelp((h) => !h);
        }}
        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Download className="size-4" /> Install Auto ML app
      </button>
      {help && (
        <p className="mx-2 mb-1 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          On iPhone or iPad: tap <Share className="mx-0.5 inline size-3.5" /> Share, then <b>Add to Home Screen</b>.
        </p>
      )}
    </div>
  );
}
