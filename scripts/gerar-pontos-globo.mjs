// Gera src/data/globo-pontos.json: pontos (lat, lon) sobre terra firme,
// distribuídos de forma uniforme na esfera (espiral de Fibonacci).
// Uso: node scripts/gerar-pontos-globo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const N = 26000; // candidatos na esfera inteira; sobra ~30% em terra
const pontos = [];
const dourado = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2; // -1..1
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = (((i * dourado) % (2 * Math.PI)) * 180) / Math.PI - 180;
  if (geoContains(land, [lon, lat])) pontos.push(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10);
}

writeFileSync("src/data/globo-pontos.json", JSON.stringify(pontos));
console.log(`pontos em terra: ${pontos.length / 2} (de ${N} candidatos)`);
