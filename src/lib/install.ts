// The browser fires `beforeinstallprompt` once, soon after load, usually BEFORE the sidebar exists
// (the login page and auth check come first). So it is captured here at startup and the sidebar button reads it later.
export interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let saved: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    notify();
  });
}

export const getInstallEvent = () => saved;
export const clearInstallEvent = () => {
  saved = null;
  notify();
};
export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
