import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'http';
import request from 'supertest';
import { DescribeDocument } from '@flivideo/core';
import { createDoorRouter } from '../door/router.js';

async function buildApp(context: { brand: string; project: string } | null = null) {
  const app = express();
  app.use(express.json());
  app.use('/api', createDoorRouter({ identity: { gitSha: 'abc1234', startedAt: '2026-11-19T00:00:00.000Z', port: 0 }, context: async () => context }));
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return server;
}

describe('FliHub door, slice 1', () => {
  it('GET /api/describe is a valid describe/1 document naming FliHub and its two verbs', async () => {
    const server = await buildApp();
    try {
      const res = await request(server).get('/api/describe');
      expect(res.status).toBe(200);
      const doc = DescribeDocument.parse(res.body);
      expect(doc.app.name).toBe('flihub');
      const names = doc.parts.flatMap((p) => p.commands.map((c) => c.name)).sort();
      expect(names).toEqual(['system.describe', 'system.status']);
    } finally {
      server.close();
    }
  });

  it('system.describe over JSON-RPC answers the same document', async () => {
    const server = await buildApp();
    try {
      const rpc = await request(server).post('/api/rpc').send({ jsonrpc: '2.0', id: 1, method: 'system.describe', params: {} });
      const get = await request(server).get('/api/describe');
      expect({ ...rpc.body.result, generatedAt: null }).toEqual({ ...get.body, generatedAt: null });
    } finally {
      server.close();
    }
  });

  it('system.status says which run it is and what it is pointed at', async () => {
    const server = await buildApp({ brand: 'joy', project: 'b99-x' });
    try {
      const res = await request(server).post('/api/rpc').send({ jsonrpc: '2.0', id: 2, method: 'system.status', params: {} });
      expect(res.body.result).toMatchObject({ app: 'flihub', pid: process.pid, context: { brand: 'joy', project: 'b99-x' }, busy: [] });
    } finally {
      server.close();
    }
  });

  it('an unknown verb is a named refusal, not a crash', async () => {
    const server = await buildApp();
    try {
      const res = await request(server).post('/api/rpc').send({ jsonrpc: '2.0', id: 3, method: 'recordings.list', params: {} });
      expect(res.body.error.data.failureMode).toBe('unknown-capability');
    } finally {
      server.close();
    }
  });
});
