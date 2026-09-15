// W3 review R2: shared is the bottom of the dependency graph. It never imports from server/ or client/, and every
// package it imports is declared in shared/package.json — so the client typecheck does not lean on the server's
// dependencies being hoisted.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { builtinModules } from 'module';

const dir = path.dirname(new URL(import.meta.url).pathname);
const sources = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));

function specifiers(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

describe('shared import direction (R2)', () => {
  it('shared never imports from server/ or client/, and declares every package it imports', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
    const builtins = new Set(builtinModules);

    const upward: string[] = [];
    const undeclared: string[] = [];
    for (const { file, text } of sources) {
      for (const spec of specifiers(text)) {
        if (spec.startsWith('.')) {
          const target = path.resolve(dir, spec);
          if (!target.startsWith(dir + path.sep)) upward.push(`${file} → ${spec}`);
        } else {
          const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
          if (!builtins.has(name.replace(/^node:/, '')) && !declared.has(name)) undeclared.push(`${file} → ${spec}`);
        }
      }
    }
    expect(upward).toEqual([]);
    expect(undeclared).toEqual([]);
    expect(sources.map((s) => s.file)).toContain('contextSchemas.ts'); // the door-3 schemas live here
  });
});
