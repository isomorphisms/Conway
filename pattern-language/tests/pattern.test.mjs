import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compilePattern,
  composeTransforms,
  conwayOrbifoldGenerators,
  identityTransform,
  inverseTransform,
  parsePattern,
} from '../pattern.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patternFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...patternFiles(full));
    else if (entry.name.endsWith('.pattern')) files.push(full);
  }
  return files.sort();
}

function nearlyIdentity(matrix) {
  const expected = identityTransform();
  assert.equal(matrix.length, expected.length);
  matrix.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6, `${value} != ${expected[index]} at ${index}`));
}

test('every checked-in example parses and renders to SVG', () => {
  const files = patternFiles(path.join(root, 'examples'));
  assert.ok(files.length >= 10, 'expected the Conway example corpus');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const program = parsePattern(source);
    assert.ok(program.commands.length > 0, `${file} has nothing to draw`);
    const svg = compilePattern(source);
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /<use\b/);
    assert.match(svg, /<\/svg>\n$/);
  }
});

test('documented Conway shorthands expand', () => {
  const expectedCounts = new Map([
    ['o', 2], ['2222', 3], ['442', 3], ['*442', 4],
    ['333', 3], ['*333', 4], ['632', 3], ['*632', 4],
  ]);
  for (const [symbol, count] of expectedCounts) {
    assert.equal(conwayOrbifoldGenerators(symbol, 84).length, count, symbol);
  }
});

test('generator inverses compose back to identity', () => {
  for (const symbol of ['o', '2222', '442', '*442', '333', '*333', '632', '*632']) {
    for (const generator of conwayOrbifoldGenerators(symbol, 84)) {
      nearlyIdentity(composeTransforms(generator.matrix, inverseTransform(generator.matrix)));
    }
  }
});

test('explicit generator syntax from the language draft runs', () => {
  const source = `
canvas 200 200
viewport -100 -100 100 100
motif mark
  segment 0 0 20 0
end
generator east translate 40 0
generator north translate 0 40
generator quarter_turn rotate 90
generator mirror reflect 0 0 1 0
generator glide glide 0 0 1 0 20
orbit mark
`;
  const svg = compilePattern(source);
  assert.match(svg, /<use\b/);
});

test('CLI writes an SVG file', () => {
  const output = path.join(os.tmpdir(), `conway-pattern-${process.pid}.svg`);
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'pattern.mjs'), path.join(root, 'examples/conway-442.pattern'), output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(output, 'utf8'), /^<svg\b/);
  } finally {
    fs.rmSync(output, { force: true });
  }
});
