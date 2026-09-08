// Inventory of the Bali road export. Usage: node scripts/osm-inventory.mjs data/processed/bali-roads.geojsonseq
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const file = process.argv[2];
const R = 6371008.8;
const toRad = d => d * Math.PI / 180;
function haversine(a, b) {
  const dLat = toRad(b[1] - a[1]), dLon = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const TAGS = ['name','surface','oneway','lanes','width','maxspeed','bridge','tunnel','lit','access','motorcycle','motor_vehicle','junction','smoothness','layer','ref'];
const byClass = new Map();
const tagCount = Object.fromEntries(TAGS.map(t => [t, 0]));
const surfaceVals = new Map(), onewayVals = new Map(), lanesVals = new Map(), widthVals = [], maxspeedVals = new Map(), motorcycleVals = new Map();
let ways = 0, coords = 0, totalLen = 0, segMax = 0;
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

const rl = createInterface({ input: createReadStream(file) });
for await (let line of rl) {
  if (line.charCodeAt(0) === 0x1e) line = line.slice(1);
  if (!line.trim()) continue;
  const f = JSON.parse(line);
  if (f.geometry?.type !== 'LineString') continue;
  const p = f.properties, c = f.geometry.coordinates;
  ways++; coords += c.length;
  let len = 0;
  for (let i = 1; i < c.length; i++) { const d = haversine(c[i-1], c[i]); len += d; if (d > segMax) segMax = d; }
  totalLen += len;
  const cls = p.highway || '(none)';
  const e = byClass.get(cls) || { ways: 0, km: 0, nodes: 0 };
  e.ways++; e.km += len / 1000; e.nodes += c.length; byClass.set(cls, e);
  for (const t of TAGS) if (p[t] != null) tagCount[t]++;
  if (p.surface) bump(surfaceVals, p.surface);
  if (p.oneway) bump(onewayVals, p.oneway);
  if (p.lanes) bump(lanesVals, p.lanes);
  if (p.width) { const w = parseFloat(p.width); if (!isNaN(w)) widthVals.push(w); }
  if (p.maxspeed) bump(maxspeedVals, p.maxspeed);
  if (p.motorcycle) bump(motorcycleVals, `${cls}:${p.motorcycle}`);
}
const rows = [...byClass.entries()].sort((a, b) => b[1].km - a[1].km);
const pct = (n, d) => (100 * n / d).toFixed(1) + '%';
console.log(`ways ${ways}  coordinates ${coords}  total ${(totalLen/1000).toFixed(0)} km  longest segment ${segMax.toFixed(0)} m\n`);
console.log('| highway | ways | share | km | share | avg m/way | coords |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const [k, v] of rows) console.log(`| ${k} | ${v.ways} | ${pct(v.ways, ways)} | ${v.km.toFixed(0)} | ${pct(v.km*1000, totalLen)} | ${(v.km*1000/v.ways).toFixed(0)} | ${v.nodes} |`);
console.log('\n| tag | ways with tag | share |\n|---|---:|---:|');
for (const t of TAGS) console.log(`| ${t} | ${tagCount[t]} | ${pct(tagCount[t], ways)} |`);
const top = (m, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join(', ');
console.log(`\nsurface: ${top(surfaceVals)}`);
console.log(`oneway: ${top(onewayVals)}`);
console.log(`lanes: ${top(lanesVals)}`);
console.log(`maxspeed: ${top(maxspeedVals)}`);
widthVals.sort((a, b) => a - b);
const q = f => widthVals[Math.floor(f * (widthVals.length - 1))];
console.log(`width: n=${widthVals.length} p10=${q(.1)} p50=${q(.5)} p90=${q(.9)} m`);
console.log(`motorcycle by class: ${top(motorcycleVals, 12)}`);
