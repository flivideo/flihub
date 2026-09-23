/**
 * Loopback-only exposure (2026-09-23).
 *
 * The API has no auth and destructive routes (delete local, empty trash, hold, archive), so it
 * listens on 127.0.0.1 and ::1 only, and refuses any browser request whose Origin is not a
 * loopback page. Requests with no Origin (curl, FliStudio's main process, Teletubby) pass —
 * they can only arrive from this machine anyway.
 */
import net from 'net';
import type { Server as HttpServer } from 'http';
import type { RequestHandler } from 'express';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** True when there is no Origin, or the Origin is an http(s) page on a loopback host (any port). */
export function isLoopbackOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Express middleware: 403 any request carrying a non-loopback Origin. */
export const refuseForeignOrigin: RequestHandler = (req, res, next) => {
  if (isLoopbackOrigin(req.headers.origin)) return next();
  res.status(403).json({ success: false, error: 'FliHub only accepts requests from this machine', reason: 'foreign-origin' });
};

/**
 * Listen on 127.0.0.1, and hand ::1 connections to the same server so clients that resolve
 * "localhost" to IPv6 keep working. A missing IPv6 stack is not fatal.
 */
export function listenLoopback(httpServer: HttpServer, port: number, onListening: () => void): net.Server {
  const v6 = net.createServer((socket) => httpServer.emit('connection', socket));
  v6.on('error', (err) => console.warn(`[loopback] ::1:${port} not bound: ${err.message}`));
  httpServer.listen(port, '127.0.0.1', () => {
    v6.listen(port, '::1');
    onListening();
  });
  httpServer.on('close', () => v6.close());
  return v6;
}
