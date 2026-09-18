/**
 * Convert Corvette FBX → compact but COMPLETE colored GLB.
 * No stride-decimation (that punched holes). Keeps wheels + paint colors.
 * Run: node scripts/convert-corvette.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const g = globalThis;
if (!g.document) {
  g.document = {
    createElementNS: () => ({ style: {}, width: 1, height: 1, addEventListener() {}, removeEventListener() {}, setAttribute() {}, getContext: () => null }),
    createElement: () => ({ style: {}, addEventListener() {}, removeEventListener() {} }),
  };
}
if (!g.window) g.window = g;
if (!g.self) g.self = g;
if (!g.URL) g.URL = { createObjectURL: () => 'blob:node', revokeObjectURL() {} };

const THREE = await import('three');
const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
const { mergeVertices } = await import('three/addons/utils/BufferGeometryUtils.js');
const { SimplifyModifier } = await import('three/addons/modifiers/SimplifyModifier.js');
const simplify = new SimplifyModifier();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'Corvette_Stingray_FBX_Low_Poly_File.fbx');
const output = path.join(root, 'public', 'corvette-stingray.glb');

const buffer = fs.readFileSync(input);
const loader = new FBXLoader();
loader.manager.setURLModifier((url) => (/\.(png|jpe?g|webp|tga|bmp|tif)$/i.test(url) ? 'data:,' : url));

const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const source = loader.parse(ab, '');
source.updateMatrixWorld(true);

/** @type {import('three').Mesh[]} */
const allMeshes = [];
source.traverse((obj) => {
  if (obj.isMesh && obj.geometry?.attributes?.position) allMeshes.push(obj);
});

const sizeOf = (mesh) => new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).length();
allMeshes.sort((a, b) => sizeOf(b) - sizeOf(a));

const isWheel = (m) => /wheel|tire|tyre|rim|rubber|brake|disc/i.test(m.name || '');
const isGlass = (m) => /glass|window|windshield|windscreen|lens|light/i.test(m.name || '');
const isChrome = (m) => /chrome|metal|exhaust|grille|trim/i.test(m.name || '');
const isInterior = (m) => /seat|interior|cabin|dash|steer/i.test(m.name || '');

// Always keep wheels + largest body parts
const picked = [];
const seen = new Set();
for (const m of allMeshes) {
  if (isWheel(m) && !seen.has(m.uuid)) {
    picked.push(m);
    seen.add(m.uuid);
  }
}
for (const m of allMeshes) {
  if (seen.has(m.uuid)) continue;
  picked.push(m);
  seen.add(m.uuid);
  if (picked.length >= 60) break;
}

/**
 * @typedef {{ name: string, geometry: import('three').BufferGeometry, color: number[], metal: number, rough: number }} Part
 * @type {Part[]}
 */
const parts = [];
let totalTris = 0;
const MAX_TRIS = 48000;

for (const mesh of picked) {
  if (totalTris >= MAX_TRIS && parts.length > 16) break;

  let geometry = mesh.geometry.clone();
  mesh.updateWorldMatrix(true, false);
  geometry.applyMatrix4(mesh.matrixWorld);

  for (const attr of Object.keys(geometry.attributes)) {
    if (attr !== 'position' && attr !== 'normal') geometry.deleteAttribute(attr);
  }
  try {
    geometry = mergeVertices(geometry, 1e-3);
  } catch {
    // keep unmerged
  }
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  if (!geometry.index) {
    const count = geometry.getAttribute('position').count;
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  }

  const pos = geometry.getAttribute('position');
  if (!Number.isFinite(pos.array[0])) continue;

  let tris = geometry.index.count / 3;
  if (tris < 12 && !isWheel(mesh)) continue;

  // Soft simplify only oversized parts — keeps shape, no hole-punching stride
  if (tris > 8000 && !isWheel(mesh)) {
    const remove = Math.floor(pos.count * 0.55);
    try {
      const simplified = simplify.modify(geometry, remove);
      if (simplified?.attributes?.position) {
        geometry.dispose();
        geometry = simplified;
        if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
        if (!geometry.index) {
          const c = geometry.getAttribute('position').count;
          const idx = new Uint32Array(c);
          for (let i = 0; i < c; i++) idx[i] = i;
          geometry.setIndex(new THREE.BufferAttribute(idx, 1));
        }
        tris = geometry.index.count / 3;
      }
    } catch {
      // keep original
    }
  }

  totalTris += tris;

  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const srcColor = srcMat?.color ? srcMat.color.clone() : new THREE.Color(0xb0b0b0);
  let color = [srcColor.r, srcColor.g, srcColor.b];
  let metal = 0.55;
  let rough = 0.28;

  if (isWheel(mesh)) {
    color = [0.08, 0.08, 0.09];
    metal = 0.15;
    rough = 0.82;
    if (/rim|chrome|alloy/i.test(mesh.name || '')) {
      color = [0.75, 0.75, 0.78];
      metal = 0.95;
      rough = 0.22;
    }
  } else if (isGlass(mesh)) {
    color = [0.12, 0.16, 0.2];
    metal = 0.85;
    rough = 0.08;
  } else if (isChrome(mesh)) {
    color = [0.82, 0.82, 0.85];
    metal = 1;
    rough = 0.18;
  } else if (isInterior(mesh)) {
    color = [0.12, 0.1, 0.1];
    metal = 0.05;
    rough = 0.75;
  } else {
    // Body paint — classic Corvette stingray red-orange if source is grey/white
    const lum = (color[0] + color[1] + color[2]) / 3;
    if (lum > 0.55 || lum < 0.12) {
      color = [0.72, 0.08, 0.1]; // racing red
    }
    metal = 0.35;
    rough = 0.22;
  }

  parts.push({
    name: mesh.name || `part_${parts.length}`,
    geometry,
    color,
    metal,
    rough,
  });
}

if (!parts.length) {
  console.error('No meshes extracted');
  process.exit(1);
}

// Normalize whole car to unit box centered at origin
const temp = new THREE.Group();
for (const p of parts) {
  temp.add(new THREE.Mesh(p.geometry));
}
const box = new THREE.Box3().setFromObject(temp);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
const maxDim = Math.max(size.x, size.y, size.z) || 1;
const s = 1 / maxDim;

for (const p of parts) {
  p.geometry.translate(-center.x, -center.y, -center.z);
  p.geometry.scale(s, s, s);
  p.geometry.computeVertexNormals();
  p.geometry.computeBoundingBox();
}

console.log(`Parts: ${parts.length}, tris: ~${Math.round(totalTris)}, wheels: ${parts.filter((p) => isWheel({ name: p.name })).length}`);

const glb = buildMultiMeshGlb(parts);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, glb);
console.log(`Wrote ${output} (${(glb.length / 1024).toFixed(1)} KB)`);

/** @param {Part[]} parts */
function buildMultiMeshGlb(parts) {
  const align4 = (n) => (4 - (n % 4)) % 4;
  /** @type {Uint8Array[]} */
  const chunks = [];
  let cursor = 0;

  const pushBytes = (typed) => {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    const info = { byteOffset: cursor, byteLength: bytes.byteLength };
    chunks.push(bytes);
    cursor += bytes.byteLength;
    const pad = align4(bytes.byteLength);
    if (pad) {
      chunks.push(new Uint8Array(pad));
      cursor += pad;
    }
    return info;
  };

  const bufferViews = [];
  const accessors = [];
  const materials = [];
  const meshes = [];
  const nodes = [];
  const sceneNodes = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const posAttr = part.geometry.getAttribute('position');
    const normAttr = part.geometry.getAttribute('normal');
    const idxAttr = part.geometry.index;

    const posArr = new Float32Array(posAttr.array);
    const normArr = new Float32Array(normAttr.array);
    const idxSrc = idxAttr.array;
    const idxArr = posAttr.count > 65535 || idxSrc.length > 65535
      ? new Uint32Array(idxSrc)
      : new Uint16Array(idxSrc);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let v = 0; v < posArr.length; v += 3) {
      minX = Math.min(minX, posArr[v]); maxX = Math.max(maxX, posArr[v]);
      minY = Math.min(minY, posArr[v + 1]); maxY = Math.max(maxY, posArr[v + 1]);
      minZ = Math.min(minZ, posArr[v + 2]); maxZ = Math.max(maxZ, posArr[v + 2]);
    }

    const posView = pushBytes(posArr);
    const normView = pushBytes(normArr);
    const idxView = pushBytes(idxArr);

    const posAccessor = accessors.length;
    bufferViews.push({ buffer: 0, byteOffset: posView.byteOffset, byteLength: posView.byteLength, target: 34962 });
    accessors.push({
      bufferView: bufferViews.length - 1,
      componentType: 5126,
      count: posAttr.count,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });

    const normAccessor = accessors.length;
    bufferViews.push({ buffer: 0, byteOffset: normView.byteOffset, byteLength: normView.byteLength, target: 34962 });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: normAttr.count, type: 'VEC3' });

    const idxAccessor = accessors.length;
    bufferViews.push({ buffer: 0, byteOffset: idxView.byteOffset, byteLength: idxView.byteLength, target: 34963 });
    accessors.push({
      bufferView: bufferViews.length - 1,
      componentType: idxArr instanceof Uint32Array ? 5125 : 5123,
      count: idxArr.length,
      type: 'SCALAR',
    });

    const matIndex = materials.length;
    materials.push({
      name: `${part.name}_mat`,
      pbrMetallicRoughness: {
        baseColorFactor: [...part.color, 1],
        metallicFactor: part.metal,
        roughnessFactor: part.rough,
      },
    });

    const meshIndex = meshes.length;
    meshes.push({
      name: part.name,
      primitives: [{
        attributes: { POSITION: posAccessor, NORMAL: normAccessor },
        indices: idxAccessor,
        material: matIndex,
      }],
    });

    const nodeIndex = nodes.length;
    nodes.push({ mesh: meshIndex, name: part.name });
    sceneNodes.push(nodeIndex);
  }

  // Root empty node parenting all parts keeps a single scene root
  nodes.push({ name: 'CorvetteStingray', children: sceneNodes });
  const rootIndex = nodes.length - 1;

  const binSize = cursor;
  const bin = new Uint8Array(binSize);
  let o = 0;
  for (const c of chunks) {
    bin.set(c, o);
    o += c.byteLength;
  }

  const json = {
    asset: { version: '2.0', generator: 'xanox-corvette-convert' },
    scene: 0,
    scenes: [{ nodes: [rootIndex] }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.byteLength }],
  };

  let jsonText = JSON.stringify(json);
  jsonText += ' '.repeat(align4(jsonText.length));
  const jsonBytes = Buffer.from(jsonText, 'utf8');

  const total = 12 + 8 + jsonBytes.length + 8 + bin.byteLength;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546C67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonBytes.length, 12);
  out.writeUInt32LE(0x4E4F534A, 16);
  jsonBytes.copy(out, 20);
  const binOffset = 20 + jsonBytes.length;
  out.writeUInt32LE(bin.byteLength, binOffset);
  out.writeUInt32LE(0x004E4942, binOffset + 4);
  Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength).copy(out, binOffset + 8);
  return out;
}
