import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import cors from 'cors';
import http, { createServer, type Server } from 'http';
import os from 'os';
import { isLoopbackOrigin, listenLoopback, refuseForeignOrigin } from '../utils/loopback.js';

function lanAddress(): string | undefined {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return undefined;
}

function get(host: string, port: number, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: string; acao?: string }>((resolve, reject) => {
    const req = http.get({ host, port, path: '/api/ping', headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, body, acao: res.headers['access-control-allow-origin'] as string | undefined }),
      );
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
  });
}

describe('isLoopbackOrigin', () => {
  it('accepts no origin and loopback pages on any port', () => {
    for (const o of [undefined, 'http://localhost:5100', 'http://127.0.0.1:5173', 'http://[::1]:5100', 'https://localhost'])
      expect(isLoopbackOrigin(o)).toBe(true);
  });
  it('refuses remote, Tailscale, file and garbage origins', () => {
    for (const o of ['http://evil.com', 'http://100.64.1.2:5100', 'http://mac-mini-m4.local:5100', 'http://localhost.evil.com', 'file://', 'null', 'x'])
      expect(isLoopbackOrigin(o)).toBe(false);
  });
});

describe('loopback-only server', () => {
  let server: Server;
  const PORT = 5199;

  afterEach(() => new Promise<void>((r) => server.close(() => r())));

  async function start() {
    const app = express();
    app.use(refuseForeignOrigin);
    app.use(cors({ origin: (origin, cb) => cb(null, isLoopbackOrigin(origin)) }));
    app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    server = createServer(app);
    await new Promise<void>((r) => listenLoopback(server, PORT, r));
    await new Promise((r) => setTimeout(r, 50)); // ::1 binds just after
  }

  it('answers on 127.0.0.1 and ::1', async () => {
    await start();
    expect((await get('127.0.0.1', PORT)).status).toBe(200);
    expect((await get('::1', PORT)).status).toBe(200);
  });

  it('echoes a loopback origin (FliHub client) and 403s a foreign one', async () => {
    await start();
    const ok = await get('127.0.0.1', PORT, { Origin: 'http://localhost:5100' });
    expect(ok.status).toBe(200);
    expect(ok.acao).toBe('http://localhost:5100');
    const bad = await get('127.0.0.1', PORT, { Origin: 'http://evil.com' });
    expect(bad.status).toBe(403);
    expect(JSON.parse(bad.body).reason).toBe('foreign-origin');
  });

  it('refuses a connection on the LAN address', async () => {
    const lan = lanAddress();
    if (!lan) return; // no external interface on this runner
    await start();
    await expect(get(lan, PORT)).rejects.toThrow(/ECONNREFUSED/);
  });
});
