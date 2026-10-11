/** Browser notifications (permission is asked once, when a run starts, like Claude.ai). */
export const notifySupported = () => typeof window !== "undefined" && "Notification" in window;

export function notifyState(): NotificationPermission | "unsupported" {
  return notifySupported() ? Notification.permission : "unsupported";
}

export async function askNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notifySupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notify(title: string, body: string, onClick?: () => void, always = false) {
  if (!notifySupported() || Notification.permission !== "granted") return;
  if (!always && document.visibilityState === "visible" && document.hasFocus()) return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.ico", tag: "auto-ml" });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch {
    /* some mobile browsers only allow service-worker notifications */
  }
}
