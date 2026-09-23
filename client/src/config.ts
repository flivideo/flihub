/**
 * NFR-12: Centralized client configuration
 *
 * API_URL uses the page's own hostname (localhost or 127.0.0.1), so API calls stay same-host.
 * Both the UI and the API bind loopback only; other machines can't reach FliHub.
 */

function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5101`;
}

export const API_URL = getApiUrl();
