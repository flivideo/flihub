/**
 * NFR-12: Centralized client configuration
 *
 * API_URL derives from the current browser hostname so FliHub works
 * both on localhost and when accessed via Tailscale from other machines.
 */

function getApiUrl(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5101`;
}

export const API_URL = getApiUrl();
