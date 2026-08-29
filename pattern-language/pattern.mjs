#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EPSILON = 1e-7;
const DEFAULT_ORBIT_LIMIT = 12000;

export class PatternError extends Error {
  constructor(message, lineNumber = undefined) {
    super(lineNumber == null ? message : `line ${lineNumber}: ${message}`);
    this.name = 'PatternError';
    this.lineNumber = lineNumber;
  }
}

export function identityTransform() {
  return [1, 0, 0, 1, 0, 0];
}

export function composeTransforms(left, right) {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function translation(x, y) {
  return [1, 0, 0, 1, x, y];
}

export function rotation(degrees, centerX = 0, centerY = 0) {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const turn = [cosine, sine, -sine, cosine, 0, 0];
  return composeTransforms(
    translation(centerX, centerY),
    composeTransforms(turn, translation(-centerX, -centerY)),
  );
}

export function reflection(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.hypot(dx, dy) < EPSILON) {
    throw new PatternError('a reflection line needs two different points');
  }
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return composeTransforms(
    translation(x1, y1),
    composeTransforms(
      rotation(angle),
      composeTransforms([1, 0, 0, -1, 0, 0], composeTransforms(rotation(-angle), translation(-x1, -y1))),
    ),
  );
}

export function glideReflection(x1, y1, x2, y2, distance) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < EPSILON) {
    throw new PatternError('a glide line needs two different points');
  }
  return composeTransforms(
    translation(distance * dx / length, distance * dy / length),
    reflection(x1, y1, x2, y2),
  );
}

export function inverseTransform(matrix) {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < EPSILON) {
    throw new PatternError('non-invertible transform');
  }
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

function finiteNumber(word, lineNumber, description) {
  const value = Number(word);
  if (!Number.isFinite(value)) {
    throw new PatternError(`${description} must be a number, got ${word}`, lineNumber);
  }
  return value;
}

function positiveNumber(word, lineNumber, description) {
  const value = finiteNumber(word, lineNumber, description);
  if (!(value > 0)) {
    throw new PatternError(`${description} must be positive, got ${word}`, lineNumber);
  }
  return value;
}

function wordsOnLine(line) {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('//')) return [];
  let source = line;
  let quote = null;
  for (let i = 0; i < source.length - 1; i += 1) {
    const character = source[i];
    if (quote != null) {
      if (character === '\\') i += 1;
      else if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '/' && source[i + 1] === '/') {
      source = source.slice(0, i);
      break;
    }
  }
  const matches = source.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S+/g) || [];
  return matches.map((word) => {
    if ((word.startsWith('"') && word.endsWith('"')) || (word.startsWith("'") && word.endsWith("'"))) {
      return word.slice(1, -1);
    }
    return word;
  });
}

function emptyBounds() {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function includePoint(bounds, x, y) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function includeCircle(bounds, x, y, radius) {
  includePoint(bounds, x - radius, y - radius);
  includePoint(bounds, x + radius, y + radius);
}

function normalizedBounds(bounds) {
  if (!Number.isFinite(bounds.minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { ...bounds };
}

function styleCopy(style) {
  return { stroke: style.stroke, strokeWidth: style.strokeWidth, fill: style.fill };
}

function newMotif(name, style) {
  return {
    name,
    shapes: [],
    bounds: emptyBounds(),
    x: 0,
    y: 0,
    heading: 0,
    penDown: true,
    path: '',
    pathStarted: false,
    pathStyle: styleCopy(style),
    style: styleCopy(style),
  };
}

function flushPath(motif) {
  if (motif.pathStarted && motif.path.trim() !== '') {
    motif.shapes.push({ kind: 'path', d: motif.path.trim(), ...styleCopy(motif.pathStyle) });
  }
  motif.path = '';
  motif.pathStarted = false;
}

function ensurePathAtCurrentPoint(motif) {
  if (!motif.pathStarted) {
    motif.path = `M ${motif.x} ${motif.y}`;
    motif.pathStarted = true;
    motif.pathStyle = styleCopy(motif.style);
    includePoint(motif.bounds, motif.x, motif.y);
  }
}

function moveTurtle(motif, x, y, draw) {
  if (draw) {
    ensurePathAtCurrentPoint(motif);
    motif.path += ` L ${x} ${y}`;
  } else {
    flushPath(motif);
  }
  motif.x = x;
  motif.y = y;
  includePoint(motif.bounds, x, y);
}

function arcTurtle(motif, direction, radius, degrees) {
  if (degrees < 0) return arcTurtle(motif, direction === 'left' ? 'right' : 'left', radius, -degrees);
  if (degrees === 0) return;
  const headingRadians = motif.heading * Math.PI / 180;
  const normalX = -Math.sin(headingRadians);
  const normalY = Math.cos(headingRadians);
  const sign = direction === 'left' ? 1 : -1;
  const centerX = motif.x + sign * radius * normalX;
  const centerY = motif.y + sign * radius * normalY;
  const endHeading = motif.heading + sign * degrees;
  const endRadians = endHeading * Math.PI / 180;
  const endNormalX = -Math.sin(endRadians);
  const endNormalY = Math.cos(endRadians);
  const endX = centerX - sign * radius * endNormalX;
  const endY = centerY - sign * radius * endNormalY;
  if (motif.penDown) {
    ensurePathAtCurrentPoint(motif);
    const largeArc = degrees > 180 ? 1 : 0;
    const sweep = direction === 'left' ? 1 : 0;
    motif.path += ` A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
  } else {
    flushPath(motif);
  }
  includeCircle(motif.bounds, centerX, centerY, radius);
  motif.x = endX;
  motif.y = endY;
  motif.heading = endHeading;
}

function addGenerator(program, name, matrix, lineNumber = undefined) {
  if (program.generators.some((generator) => generator.name === name)) {
    throw new PatternError(`generator ${name} is already defined`, lineNumber);
  }
  program.generators.push({ name, matrix });
}

export function conwayOrbifoldGenerators(symbol, cellSize) {
  const cell = positiveNumber(String(cellSize), undefined, 'orbifold cell size');
  const square = [
    { name: 'east', matrix: translation(cell, 0) },
    { name: 'north', matrix: translation(0, cell) },
  ];
  const hexHeight = Math.sqrt(3) * cell / 2;
  const hexagonal = [
    { name: 'east', matrix: translation(cell, 0) },
    { name: 'north_east', matrix: translation(cell / 2, hexHeight) },
  ];
  switch (symbol) {
    case 'o': return square;
    case '2222': return [...square, { name: 'half_turn', matrix: rotation(180) }];
    case '442': return [...square, { name: 'quarter_turn', matrix: rotation(90) }];
    case '*442': return [...square, { name: 'quarter_turn', matrix: rotation(90) }, { name: 'mirror', matrix: reflection(0, 0, 1, 0) }];
    case '333': return [...hexagonal, { name: 'third_turn', matrix: rotation(120) }];
    case '*333': return [...hexagonal, { name: 'third_turn', matrix: rotation(120) }, { name: 'mirror', matrix: reflection(0, 0, 1, 0) }];
    case '632': return [...hexagonal, { name: 'sixth_turn', matrix: rotation(60) }];
    case '*632': return [...hexagonal, { name: 'sixth_turn', matrix: rotation(60) }, { name: 'mirror', matrix: reflection(0, 0, 1, 0) }];
    default: throw new PatternError(`orbifold ${symbol} is not shorthand yet; use explicit generator commands`);
  }
}

function parseMotifCommand(motif, words, lineNumber) {
  const command = words[0];
  switch (command) {
    case 'move':
    case 'jump': {
      if (words.length !== 3) throw new PatternError(`${command} expects x y`, lineNumber);
      flushPath(motif);
      motif.x = finiteNumber(words[1], lineNumber, 'x');
      motif.y = finiteNumber(words[2], lineNumber, 'y');
      includePoint(motif.bounds, motif.x, motif.y);
      return;
    }
    case 'line': {
      if (words.length !== 3) throw new PatternError('line expects x y', lineNumber);
      moveTurtle(motif, finiteNumber(words[1], lineNumber, 'x'), finiteNumber(words[2], lineNumber, 'y'), motif.penDown);
      return;
    }
    case 'segment': {
      if (words.length !== 5) throw new PatternError('segment expects x1 y1 x2 y2', lineNumber);
      flushPath(motif);
      const x1 = finiteNumber(words[1], lineNumber, 'x1');
      const y1 = finiteNumber(words[2], lineNumber, 'y1');
      const x2 = finiteNumber(words[3], lineNumber, 'x2');
      const y2 = finiteNumber(words[4], lineNumber, 'y2');
      motif.shapes.push({ kind: 'path', d: `M ${x1} ${y1} L ${x2} ${y2}`, ...styleCopy(motif.style) });
      includePoint(motif.bounds, x1, y1); includePoint(motif.bounds, x2, y2);
      motif.x = x2; motif.y = y2;
      return;
    }
    case 'forward': {
      if (words.length !== 2) throw new PatternError('forward expects a distance', lineNumber);
      const distance = finiteNumber(words[1], lineNumber, 'distance');
      const radians = motif.heading * Math.PI / 180;
      moveTurtle(motif, motif.x + distance * Math.cos(radians), motif.y + distance * Math.sin(radians), motif.penDown);
      return;
    }
    case 'left':
    case 'right': {
      if (words.length !== 2) throw new PatternError(`${command} expects degrees`, lineNumber);
      const degrees = finiteNumber(words[1], lineNumber, 'degrees');
      motif.heading += command === 'left' ? degrees : -degrees;
      return;
    }
    case 'heading': {
      if (words.length !== 2) throw new PatternError('heading expects degrees', lineNumber);
      motif.heading = finiteNumber(words[1], lineNumber, 'degrees');
      return;
    }
    case 'arc_left':
    case 'arc_right': {
      if (words.length !== 3) throw new PatternError(`${command} expects radius degrees`, lineNumber);
      arcTurtle(motif, command === 'arc_left' ? 'left' : 'right', positiveNumber(words[1], lineNumber, 'radius'), finiteNumber(words[2], lineNumber, 'degrees'));
      return;
    }
    case 'circle': {
      if (words.length !== 4) throw new PatternError('circle expects x y radius', lineNumber);
      flushPath(motif);
      const cx = finiteNumber(words[1], lineNumber, 'x');
      const cy = finiteNumber(words[2], lineNumber, 'y');
      const radius = positiveNumber(words[3], lineNumber, 'radius');
      motif.shapes.push({ kind: 'circle', cx, cy, radius, ...styleCopy(motif.style) });
      includeCircle(motif.bounds, cx, cy, radius);
      return;
    }
    case 'pen_up':
      if (words.length !== 1) throw new PatternError('pen_up takes no arguments', lineNumber);
      flushPath(motif); motif.penDown = false; return;
    case 'pen_down':
      if (words.length !== 1) throw new PatternError('pen_down takes no arguments', lineNumber);
      flushPath(motif); motif.penDown = true; return;
    case 'stroke':
      if (words.length !== 3) throw new PatternError('stroke expects color width', lineNumber);
      flushPath(motif); motif.style.stroke = words[1]; motif.style.strokeWidth = positiveNumber(words[2], lineNumber, 'stroke width'); return;
    case 'fill':
      if (words.length !== 2) throw new PatternError('fill expects a color', lineNumber);
      flushPath(motif); motif.style.fill = words[1]; return;
    case 'close':
      if (words.length !== 1) throw new PatternError('close takes no arguments', lineNumber);
      ensurePathAtCurrentPoint(motif); motif.path += ' Z'; return;
    default:
      throw new PatternError(`unknown motif command ${command}`, lineNumber);
  }
}

export function parsePattern(source) {
  const program = {
    canvas: { width: 720, height: 720 },
    viewport: { minX: -360, minY: -360, maxX: 360, maxY: 360 },
    background: '#ffffff',
    style: { stroke: '#000000', strokeWidth: 1, fill: 'none' },
    motifs: new Map(),
    generators: [],
    commands: [],
  };
  let motif = null;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const words = wordsOnLine(lines[index]);
    if (words.length === 0) continue;
    if (motif != null) {
      if (words[0] === 'end') {
        if (words.length !== 1) throw new PatternError('end takes no arguments', lineNumber);
        flushPath(motif);
        motif.bounds = normalizedBounds(motif.bounds);
        program.motifs.set(motif.name, motif);
        motif = null;
      } else {
        parseMotifCommand(motif, words, lineNumber);
      }
      continue;
    }
    switch (words[0]) {
      case 'canvas': {
        if (words.length !== 3) throw new PatternError('canvas expects width height', lineNumber);
        program.canvas = { width: positiveNumber(words[1], lineNumber, 'canvas width'), height: positiveNumber(words[2], lineNumber, 'canvas height') };
        break;
      }
      case 'viewport': {
        if (words.length !== 5) throw new PatternError('viewport expects min_x min_y max_x max_y', lineNumber);
        const [minX, minY, maxX, maxY] = words.slice(1).map((word, i) => finiteNumber(word, lineNumber, ['min_x', 'min_y', 'max_x', 'max_y'][i]));
        if (!(maxX > minX && maxY > minY)) throw new PatternError('viewport max values must exceed min values', lineNumber);
        program.viewport = { minX, minY, maxX, maxY };
        break;
      }
      case 'background':
        if (words.length !== 2) throw new PatternError('background expects a color', lineNumber);
        program.background = words[1];
        break;
      case 'stroke':
        if (words.length !== 3) throw new PatternError('stroke expects color width', lineNumber);
        program.style.stroke = words[1]; program.style.strokeWidth = positiveNumber(words[2], lineNumber, 'stroke width');
        break;
      case 'fill':
        if (words.length !== 2) throw new PatternError('fill expects a color', lineNumber);
        program.style.fill = words[1];
        break;
      case 'motif': {
        if (words.length !== 2) throw new PatternError('motif expects a name', lineNumber);
        if (program.motifs.has(words[1])) throw new PatternError(`motif ${words[1]} is already defined`, lineNumber);
        motif = newMotif(words[1], program.style);
        break;
      }
      case 'lattice': {
        if (words.length !== 5) throw new PatternError('lattice expects ux uy vx vy', lineNumber);
        const values = words.slice(1).map((word) => finiteNumber(word, lineNumber, 'lattice component'));
        addGenerator(program, 'lattice_first', translation(values[0], values[1]), lineNumber);
        addGenerator(program, 'lattice_second', translation(values[2], values[3]), lineNumber);
        break;
      }
      case 'generator': {
        if (words.length < 4) throw new PatternError('generator expects name kind arguments', lineNumber);
        const name = words[1]; const kind = words[2]; let matrix;
        if (kind === 'translate' && words.length === 5) matrix = translation(finiteNumber(words[3], lineNumber, 'x'), finiteNumber(words[4], lineNumber, 'y'));
        else if (kind === 'rotate' && (words.length === 4 || words.length === 6)) matrix = rotation(finiteNumber(words[3], lineNumber, 'degrees'), words.length === 6 ? finiteNumber(words[4], lineNumber, 'center x') : 0, words.length === 6 ? finiteNumber(words[5], lineNumber, 'center y') : 0);
        else if (kind === 'reflect' && words.length === 7) matrix = reflection(...words.slice(3).map((word) => finiteNumber(word, lineNumber, 'reflection coordinate')));
        else if (kind === 'glide' && words.length === 8) matrix = glideReflection(...words.slice(3).map((word) => finiteNumber(word, lineNumber, 'glide argument')));
        else throw new PatternError(`invalid ${kind} generator arguments`, lineNumber);
        addGenerator(program, name, matrix, lineNumber);
        break;
      }
      case 'orbifold': {
        if (words.length !== 3) throw new PatternError('orbifold expects symbol cell_size', lineNumber);
        const generators = conwayOrbifoldGenerators(words[1], positiveNumber(words[2], lineNumber, 'orbifold cell size'));
        for (const generator of generators) addGenerator(program, generator.name, generator.matrix, lineNumber);
        break;
      }
      case 'draw':
      case 'orbit':
        if (words.length !== 2) throw new PatternError(`${words[0]} expects a motif name`, lineNumber);
        program.commands.push({ kind: words[0], motif: words[1], lineNumber });
        break;
      default:
        throw new PatternError(`unknown command ${words[0]}`, lineNumber);
    }
  }
  if (motif != null) throw new PatternError(`motif ${motif.name} is missing end`);
  for (const command of program.commands) {
    if (!program.motifs.has(command.motif)) throw new PatternError(`unknown motif ${command.motif}`, command.lineNumber);
    if (command.kind === 'orbit' && program.generators.length === 0) throw new PatternError('orbit requires at least one generator', command.lineNumber);
  }
  return program;
}

function applyTransform(matrix, x, y) {
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

function transformedBounds(bounds, matrix) {
  const points = [
    applyTransform(matrix, bounds.minX, bounds.minY),
    applyTransform(matrix, bounds.minX, bounds.maxY),
    applyTransform(matrix, bounds.maxX, bounds.minY),
    applyTransform(matrix, bounds.maxX, bounds.maxY),
  ];
  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

function intersects(left, right) {
  return left.maxX >= right.minX && left.minX <= right.maxX && left.maxY >= right.minY && left.minY <= right.maxY;
}

function expandedViewport(viewport) {
  const width = viewport.maxX - viewport.minX;
  const height = viewport.maxY - viewport.minY;
  const margin = 0.75 * Math.max(width, height);
  return { minX: viewport.minX - margin, minY: viewport.minY - margin, maxX: viewport.maxX + margin, maxY: viewport.maxY + margin };
}

function transformKey(matrix) {
  return matrix.map((value) => Math.abs(value) < EPSILON ? 0 : Math.round(value / EPSILON) * EPSILON).join(',');
}

export function enumerateOrbit(program, motif, limit = DEFAULT_ORBIT_LIMIT) {
  const matrices = program.generators.flatMap((generator) => [generator.matrix, inverseTransform(generator.matrix)]);
  const queue = [identityTransform()];
  const seen = new Set();
  const visible = [];
  const exploration = expandedViewport(program.viewport);
  while (queue.length > 0) {
    const current = queue.shift();
    const key = transformKey(current);
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > limit) throw new PatternError(`orbit exceeded ${limit} transforms; use a larger cell or viewport`);
    const bounds = transformedBounds(motif.bounds, current);
    if (!intersects(bounds, exploration)) continue;
    if (intersects(bounds, program.viewport)) visible.push(current);
    for (const generator of matrices) queue.push(composeTransforms(generator, current));
  }
  return visible;
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function styleAttributes(shape) {
  return `stroke="${escapeXml(shape.stroke)}" stroke-width="${shape.strokeWidth}" fill="${escapeXml(shape.fill)}"`;
}

function formatNumber(value) {
  if (Math.abs(value) < 1e-12) return '0';
  const rounded = Math.round(value * 1e9) / 1e9;
  return String(rounded);
}

function matrixAttribute(matrix) {
  return `matrix(${matrix.map(formatNumber).join(' ')})`;
}

function renderMotifDefinition(motif, id) {
  const body = motif.shapes.map((shape) => {
    if (shape.kind === 'path') return `<path d="${escapeXml(shape.d)}" ${styleAttributes(shape)}/>`;
    return `<circle cx="${formatNumber(shape.cx)}" cy="${formatNumber(shape.cy)}" r="${formatNumber(shape.radius)}" ${styleAttributes(shape)}/>`;
  }).join('');
  return `<g id="${id}">${body}</g>`;
}

export function renderSvg(program) {
  const { width, height } = program.canvas;
  const { minX, minY, maxX, maxY } = program.viewport;
  const viewportWidth = maxX - minX;
  const viewportHeight = maxY - minY;
  const motifIds = new Map();
  let motifIndex = 0;
  for (const name of program.motifs.keys()) {
    motifIds.set(name, `motif-${motifIndex}`);
    motifIndex += 1;
  }
  const definitions = [...program.motifs.entries()]
    .map(([name, motif]) => renderMotifDefinition(motif, motifIds.get(name)))
    .join('');
  const pieces = [];
  if (program.background !== 'none') pieces.push(`<rect x="${minX}" y="${minY}" width="${viewportWidth}" height="${viewportHeight}" fill="${escapeXml(program.background)}"/>`);
  for (const command of program.commands) {
    const motif = program.motifs.get(command.motif);
    const matrices = command.kind === 'draw' ? [identityTransform()] : enumerateOrbit(program, motif);
    const href = `#${motifIds.get(command.motif)}`;
    for (const matrix of matrices) pieces.push(`<use href="${href}" transform="${matrixAttribute(matrix)}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${-maxY} ${viewportWidth} ${viewportHeight}"><defs>${definitions}</defs><g transform="scale(1 -1)">${pieces.join('')}</g></svg>\n`;
}

export function compilePattern(source) {
  return renderSvg(parsePattern(source));
}

function runCli(argv) {
  const args = argv.slice(2);
  if (args.length < 1 || args.length > 2 || args.includes('--help') || args.includes('-h')) {
    const stream = args.includes('--help') || args.includes('-h') ? process.stdout : process.stderr;
    stream.write('usage: node pattern-language/pattern.mjs INPUT.pattern [OUTPUT.svg]\n');
    return args.includes('--help') || args.includes('-h') ? 0 : 2;
  }
  const [input, output] = args;
  try {
    const svg = compilePattern(fs.readFileSync(input, 'utf8'));
    if (output == null || output === '-') process.stdout.write(svg);
    else fs.writeFileSync(output, svg);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.name ?? 'Error'}: ${error.message}\n`);
    return 1;
  }
}

const isMain = process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = runCli(process.argv);
