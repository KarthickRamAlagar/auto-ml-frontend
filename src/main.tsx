import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./lib/install";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ChatsProvider } from "./lib/chats";
import { MeProvider } from "./lib/me";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MeProvider>
          <ChatsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ChatsProvider>
        </MeProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

// The pre-rendered search-engine text is no longer needed once the app is running.
document.getElementById("seo-fallback")?.remove();

// Service worker: lets Auto ML be installed as an app and open its shell offline. Production builds only.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
