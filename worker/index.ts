/**
 * Front door for the React app. Static files are served by Workers Static Assets before this code runs;
 * only /api/* reaches it, and it is passed untouched to the backend Worker (service binding: private, no extra public hop).
 * The request keeps this site's host, so the backend's same-site (CSRF) check and the cookies it sets belong to this origin.
 */
interface Env {
  API: Fetcher;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return env.API.fetch(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
