// Procedural cannabis-plant renderer (canvas), ported from the GROVERS Grow
// Chamber v4 prototype and driven by live plant state instead of sliders.
//
// The key idea the prototype got right: the calyx pod IS the particle. We shape
// one teardrop bract, then lay copies down in botanical order to grow a cluster,
// stack clusters into a flower site, and put a flower site at EVERY node (plus a
// fat apical cola) — so buds run up the whole stem the way a real plant flowers,
// not just a blob at the top.
//
// This module owns drawing only. It reads a PlantRenderProps snapshot each frame
// via a getter; the React wrapper decides when state changes and rebuilds.

export type RenderStage =
  | "seed"
  | "germination"
  | "seedling"
  | "vegetative"
  | "flowering"
  | "harvest";

export interface PlantRenderProps {
  stage: RenderStage;
  /** 0..100 instantaneous health; drives colour vitality + droop. */
  health: number;
  /** 0..1 indica share; selects budding morphology (nodal / hybrid / spiral). */
  indicaRatio: number;
  /** ISO timestamp; used to estimate the grow day within the current stage. */
  plantedAt: string | null;
  /** Dominant stress symptom, mapped to a visual deformation. */
  symptom: Symptom;
  alive: boolean;
  /** Stable seed (plant id) so a plant always renders identically. */
  seed: string;
  /** "card" = plant only; "chamber" = subtle halo + glowing soil ring + brush. */
  mode: "card" | "chamber";
}

export type Symptom =
  | "none"
  | "overwater"
  | "underwater"
  | "wilt"
  | "nDef"
  | "nuteBurn"
  | "pests"
  | "mildew"
  | "rot"
  | "dead";

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---- morphology presets, keyed by budding pattern (from the prototype) -------
type Pattern = "nodal" | "hybrid" | "spiral";
interface Morph {
  hue: number;
  sat: number;
  lit: number;
  leafW: number;
  leafletMax: number;
  heightMul: number;
  internode: number;
  branchMul: number;
  stretch: number;
  bracts: number;
  clusterLen: number;
  clusterFat: number;
  pattern: Pattern;
  flowerFrom: number;
}
const MORPHS: Record<Pattern, Morph> = {
  nodal: {
    hue: 122, sat: 44, lit: 31, leafW: 1.3, leafletMax: 9, heightMul: 0.74,
    internode: 0.08, branchMul: 1.26, stretch: 1.12, bracts: 11, clusterLen: 0.85,
    clusterFat: 1.3, pattern: "nodal", flowerFrom: 0.18,
  },
  hybrid: {
    hue: 107, sat: 47, lit: 34, leafW: 1.0, leafletMax: 7, heightMul: 1.0,
    internode: 0.09, branchMul: 1.0, stretch: 1.34, bracts: 10, clusterLen: 1.0,
    clusterFat: 1.0, pattern: "hybrid", flowerFrom: 0.3,
  },
  spiral: {
    hue: 95, sat: 53, lit: 41, leafW: 0.62, leafletMax: 9, heightMul: 1.22,
    internode: 0.112, branchMul: 0.8, stretch: 1.58, bracts: 9, clusterLen: 1.45,
    clusterFat: 0.74, pattern: "spiral", flowerFrom: 0.3,
  },
};

function patternFor(indicaRatio: number): Pattern {
  if (indicaRatio >= 0.6) return "nodal";
  if (indicaRatio <= 0.4) return "spiral";
  return "hybrid";
}

const STAGE_WINDOW: Record<RenderStage, [number, number]> = {
  seed: [1, 3],
  germination: [3, 8],
  seedling: [8, 18],
  vegetative: [18, 34],
  flowering: [40, 64],
  harvest: [66, 70],
};

function deriveDay(stage: RenderStage, plantedAt: string | null): number {
  const [lo, hi] = STAGE_WINDOW[stage];
  if (plantedAt) {
    const ms = Date.parse(plantedAt);
    if (!Number.isNaN(ms)) {
      const ageDays = (Date.now() - ms) / 86400000;
      return clamp(ageDays, lo, hi);
    }
  }
  return (lo + hi) / 2;
}

function devParams(d: number) {
  return {
    budDev: clamp((d - 34) / 32, 0, 1),
    ripe: clamp((d - 40) / 22, 0, 1),
    brown: clamp((d - 58) / 12, 0, 1),
    trich: clamp((d - 48) / 18, 0, 1),
    blush: clamp((d - 55) / 15, 0, 1) * 0.5,
  };
}
type Dev = ReturnType<typeof devParams>;

function stageGroup(d: number): "seedling" | "veg" | "flower" | "harvest" {
  return d <= 10 ? "seedling" : d <= 34 ? "veg" : d <= 64 ? "flower" : "harvest";
}

// ---- leaflet geometry (built once) ------------------------------------------
const LEAF_OUT: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const SEG = 13;
  for (let i = 1; i < SEG; i++) {
    const t = i / SEG;
    const env = Math.sin(Math.PI * Math.pow(t, 0.85));
    const serr = t > 0.1 && t < 0.94 ? (i % 2 ? 1 : 0.68) : 1;
    pts.push([env * serr * 0.5, t]);
  }
  return pts;
})();

function leafletPath(c: CanvasRenderingContext2D, L: number, Wd: number) {
  c.beginPath();
  c.moveTo(0, 0);
  for (const [hw, t] of LEAF_OUT) c.lineTo(hw * Wd, -t * L);
  c.lineTo(0, -L);
  for (let i = LEAF_OUT.length - 1; i >= 0; i--) {
    const [hw, t] = LEAF_OUT[i];
    c.lineTo(-hw * Wd, -t * L);
  }
  c.closePath();
}

function podPath(c: CanvasRenderingContext2D, w: number, h: number) {
  c.beginPath();
  c.moveTo(0, h * 0.5);
  c.bezierCurveTo(-w * 0.92, h * 0.3, -w * 0.74, -h * 0.4, 0, -h * 0.6);
  c.bezierCurveTo(w * 0.74, -h * 0.4, w * 0.92, h * 0.3, 0, h * 0.5);
  c.closePath();
}

function pistilFiber(w: number, brown: number) {
  let r = lerp(244, 226, w), g = lerp(238, 138, w), b = lerp(220, 58, w);
  r = lerp(r, 152, brown); g = lerp(g, 88, brown); b = lerp(b, 48, brown);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function pistilBall(w: number, brown: number) {
  let r = lerp(250, 246, w), g = lerp(244, 170, w), b = lerp(230, 86, w);
  r = lerp(r, 188, brown); g = lerp(g, 116, brown); b = lerp(b, 60, brown);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function trichHead(p: number) {
  if (p < 0.45) return "rgba(248,252,255,0.5)";
  if (p < 0.82) return "rgba(250,250,246,0.92)";
  return "rgba(226,178,92,0.92)";
}

// ---- flower-site model -------------------------------------------------------
interface Pod {
  ring: number; a: number; rad: number; k: number; sz: number;
  dl: number; dh: number; blushK: number;
}
interface Hair { a: number; len: number; bend: number; ball: number; k: number }
interface Tri { a: number; len: number; headR: number; k: number; mat: number }
interface Cluster {
  yf: number; along: number; lateral: number; fat: number; tipTaper: number;
  centerBias: number; pods: Pod[]; hairs: Hair[]; tris: Tri[]; ph: number;
  leaf: boolean; leafSide: number;
}
interface FlowerSite { axisLen: number; baseW: number; clusters: Cluster[]; pat: Pattern }

function buildFlowerSite(
  rnd: () => number,
  axisLen: number,
  baseW: number,
  opt: { pattern: Pattern; nClusters: number; bracts: number; fatMul: number },
): FlowerSite {
  const pat = opt.pattern;
  const nClusters = opt.nClusters;
  const clusters: Cluster[] = [];
  for (let i = 0; i < nClusters; i++) {
    const yf = nClusters === 1 ? 0.5 : i / (nClusters - 1);
    let along: number, lateral: number, fat: number;
    if (pat === "spiral") {
      along = yf;
      lateral = Math.sin(i * 2.39) * baseW * 0.55;
      fat = 0.7 + 0.3 * Math.sin(Math.PI * yf);
    } else if (pat === "nodal") {
      along = Math.pow(yf, 0.85) * 0.74;
      lateral = (rnd() - 0.5) * baseW * 0.22;
      fat = 1.0 * (0.8 + 0.4 * (1 - Math.abs(yf - 0.4) * 1.3));
    } else {
      along = yf * 0.92;
      lateral = Math.sin(i * 1.7) * baseW * 0.3 + (rnd() - 0.5) * baseW * 0.12;
      fat = 0.85 + 0.3 * Math.sin(Math.PI * yf);
    }
    const tipTaper = 1 - 0.55 * smooth(clamp((yf - 0.68) / 0.32, 0, 1));
    const centerBias = 1 - Math.abs(yf - (pat === "spiral" ? 0.45 : 0.5)) * 1.2;
    const nPods = opt.bracts + 2;
    const pods: Pod[] = [];
    for (let j = 0; j < nPods; j++) {
      const ring = j < 3 ? 0 : j < 7 ? 1 : 2;
      const a = (j * 2.399) % TAU;
      const rad = ring * 0.42 + rnd() * 0.12;
      pods.push({
        ring, a, rad, k: ring / 2 + rnd() * 0.3,
        sz: (ring === 0 ? 1.0 : ring === 1 ? 0.85 : 0.7) * (0.85 + rnd() * 0.3),
        dl: (rnd() - 0.5) * 12, dh: (rnd() - 0.5) * 8, blushK: rnd(),
      });
    }
    pods.sort((p, q) => p.ring - q.ring);
    const hairs: Hair[] = [];
    const nH = pat === "spiral" ? 8 : 10;
    for (let j = 0; j < nH; j++)
      hairs.push({
        a: -Math.PI / 2 + (rnd() - 0.5) * 2.2, len: 0.55 + rnd() * 0.6,
        bend: (rnd() - 0.5) * 1.3, ball: 0.7 + rnd() * 0.4, k: rnd() * 0.85,
      });
    const tris: Tri[] = [];
    for (let j = 0; j < 6; j++)
      tris.push({ a: rnd() * TAU, len: 0.5 + rnd() * 0.5, headR: 0.7 + rnd() * 0.5, k: rnd(), mat: rnd() });
    clusters.push({
      yf, along, lateral, fat: fat * opt.fatMul, tipTaper, centerBias, pods, hairs,
      tris, ph: rnd() * TAU, leaf: pat !== "nodal" && i % 3 === 0 && yf < 0.75,
      leafSide: i % 2 ? 1 : -1,
    });
  }
  return { axisLen, baseW, clusters, pat };
}

function clusterDev(cl: Cluster, budDev: number) {
  return (
    clamp(budDev * (0.4 + 0.9 * Math.max(0, cl.centerBias)), 0, 1) *
    (budDev > 0.02 ? 1 : 0)
  );
}

// ---- node / plant model ------------------------------------------------------
interface Node {
  x: number; y: number; f: number; side: number; tilt: number; len: number;
  leafSize: number; leaflets: number; phase: number; tipX: number; tipY: number;
  site: FlowerSite | null; budRot: number;
}
interface Spring { ao: number; av: number }
interface Plant {
  d: number; P: Dev; group: string; cx: number; baseY: number; A: number;
  stemH: number; spine: { x: number; y: number; t: number }[]; nodes: Node[];
  cola: { site: FlowerSite; x: number; y: number } | null;
  windAmp: number; claw: number; droop: number;
}

// =====================================================================
// The renderer instance: owns its canvas, RNG, geometry and rAF loop.
// =====================================================================
export function createPlantRenderer(
  canvas: HTMLCanvasElement,
  getProps: () => PlantRenderProps,
) {
  const ctx = canvas.getContext("2d")!;
  const motionOK =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let M: Morph = MORPHS.hybrid;
  let plant: Plant | null = null;
  let nodeSprings: Spring[] = [];
  const colaSpring: Spring = { ao: 0, av: 0 };
  const SPRING_K = 30, SPRING_C = 5.2;
  let windPhase = 0;
  let raf = 0;
  let last = 0;
  let lastKey = "";

  // dust + pointer (chamber mode only)
  interface Dust { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; gold: boolean }
  const dust: Dust[] = [];
  const DUST_MAX = 70;
  const ptr = { x: -999, y: -999, vx: 0, active: false, lastT: 0 };

  function vitalityTint(base: Morph, health: number, symptom: Symptom): Morph {
    const v = clamp(health / 100, 0, 1);
    let hue = base.hue;
    let sat = base.sat * (0.45 + 0.55 * v);
    let lit = base.lit;
    if (symptom === "nDef") { hue = lerp(hue, 58, 0.5 * (1 - v)); sat *= 0.85; lit += 6; }
    else if (symptom === "nuteBurn") { hue = lerp(hue, 28, 0.4 * (1 - v)); }
    else if (symptom === "rot" || symptom === "wilt") { sat *= 0.6; lit -= 4; }
    else if (symptom === "dead") { sat = 8; lit = 30; hue = 70; }
    return { ...base, hue, sat: clamp(sat, 6, 70), lit: clamp(lit, 22, 52) };
  }

  function symptomDeform(symptom: Symptom, health: number) {
    const stress = clamp((100 - health) / 100, 0, 1);
    let claw = 0, droop = 0;
    if (symptom === "nuteBurn" || symptom === "wilt") claw = 0.2 + 0.3 * stress;
    if (symptom === "overwater" || symptom === "rot") droop = 0.25 + 0.4 * stress;
    if (symptom === "underwater") claw = 0.15 + 0.45 * stress;
    if (symptom === "dead") { droop = 0.6; claw = 0.2; }
    return { claw, droop, windAmp: 0.004 + 0.03 * (1 - stress * 0.5) };
  }

  // ---- builders -------------------------------------------------------------
  function buildPlant() {
    const p = getProps();
    M = vitalityTint(MORPHS[patternFor(p.indicaRatio)], p.health, p.symptom);
    const def = symptomDeform(p.symptom, p.health);
    const rnd = mulberry32(hashSeed(p.seed) ^ 0x9e3779b9);
    const d = deriveDay(p.stage, p.plantedAt);
    const P = devParams(d);

    const padX = W * 0.12;
    const cx = W / 2;
    const baseY = H * 0.9;
    const ceil = H * 0.08;
    const A = baseY - ceil;

    let hN: number;
    if (d <= 10) hN = lerp(0.05, 0.13, smooth(d / 10));
    else if (d <= 34) hN = lerp(0.13, 0.6, Math.pow((d - 10) / 24, 0.75));
    else hN = lerp(0.6, clamp(0.6 * M.stretch, 0, 0.97), smooth(clamp((d - 34) / 14, 0, 1)));
    hN = clamp(hN * M.heightMul * (0.8 + 0.2 * clamp(p.health / 100, 0, 1)), 0.05, 0.97);
    const stemH = A * hN;

    const wob1 = (rnd() - 0.5) * stemH * 0.13, wob2 = (rnd() - 0.5) * stemH * 0.08;
    const spine: { x: number; y: number; t: number }[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      spine.push({
        x: cx + wob1 * Math.sin(Math.PI * t) + wob2 * Math.sin(TAU * t) * 0.5,
        y: baseY - stemH * t, t,
      });
    }

    const nodes: Node[] = [];
    const maxNodes = Math.min(13, Math.max(d <= 10 ? 1 : 2, Math.floor(hN / M.internode)));
    const grow = smooth(clamp((d - 8) / 22, 0, 1));
    for (let i = 0; i < maxNodes; i++) {
      const f = (i + 1) / (maxNodes + 1);
      const sp = spine[Math.round(f * 24)];
      const low = Math.pow(1 - f, 0.75);
      const side = i % 2 ? 1 : -1;
      const tilt = (0.92 + rnd() * 0.25) * (1 - f * 0.22);
      const baseLen = A * 0.27 * M.branchMul * (0.35 + 0.65 * low) * grow;
      // keep branches inside the frame
      const len = Math.min(baseLen, (W / 2 - padX) / Math.max(0.3, Math.sin(tilt)));
      const nd: Node = {
        x: sp.x, y: sp.y, f, side, tilt, len,
        leafSize: A * (0.08 + 0.05 * low) * (0.55 + 0.45 * grow) * (1 - 0.4 * P.budDev * f),
        leaflets: Math.min(M.leafletMax, 3 + 2 * Math.floor(d / 14)),
        phase: rnd() * TAU, tipX: 0, tipY: 0, site: null, budRot: 0,
      };
      nd.tipX = Math.sin(nd.tilt) * nd.side * nd.len;
      nd.tipY = -Math.cos(nd.tilt) * nd.len * 0.55;
      if (P.budDev > 0 && f > M.flowerFrom) {
        const sizeUp = lerp(0.55, 1.15, f);
        const axis = A * (0.05 + 0.09 * f) * M.clusterLen * sizeUp * (0.5 + 0.5 * P.budDev);
        const baseW = axis * 0.42 * M.clusterFat;
        const nC = Math.max(2, Math.round(M.bracts * 0.55 * (0.6 + 0.5 * f)));
        nd.site = buildFlowerSite(rnd, axis, baseW, { pattern: M.pattern, nClusters: nC, bracts: M.bracts, fatMul: 1 });
        nd.budRot = nd.side * 0.1;
      }
      nodes.push(nd);
    }

    let cola: Plant["cola"] = null;
    if (P.budDev > 0) {
      const axis = stemH * (0.15 + 0.16 * P.budDev) * M.clusterLen;
      const baseW = axis * (M.pattern === "spiral" ? 0.3 : 0.46) * M.clusterFat;
      const nC = Math.round(M.bracts * (M.pattern === "spiral" ? 1.6 : 1.0));
      cola = {
        site: buildFlowerSite(rnd, axis, baseW, { pattern: M.pattern, nClusters: nC, bracts: M.bracts, fatMul: 1.05 }),
        x: spine[24].x, y: spine[24].y + axis * 0.06,
      };
    }

    plant = {
      d, P, group: stageGroup(d), cx, baseY, A, stemH, spine, nodes, cola,
      windAmp: def.windAmp, claw: def.claw, droop: def.droop,
    };
    nodeSprings = nodes.map(() => ({ ao: 0, av: 0 }));
  }

  // ---- drawing --------------------------------------------------------------
  function drawFan(size: number, n: number, topBoost: number, claw: number) {
    const FAN_A = [0, 0.42, -0.42, 0.85, -0.85, 1.22, -1.22, 1.5, -1.5];
    const FAN_M = [1, 0.86, 0.86, 0.7, 0.7, 0.52, 0.52, 0.36, 0.36];
    for (let i = 0; i < n; i++) {
      const L = size * FAN_M[i], Wd = L * 0.32 * M.leafW;
      const a = FAN_A[i] + (claw ? Math.sign(FAN_A[i] || 1) * claw * (0.2 + Math.abs(FAN_A[i]) * 0.5) : 0);
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = `hsl(${M.hue}, ${M.sat}%, ${M.lit + topBoost * 6}%)`;
      ctx.strokeStyle = `hsl(${M.hue}, ${M.sat * 0.7}%, ${(M.lit + topBoost * 6) * 0.8}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 0.12);
      ctx.stroke();
      ctx.translate(0, -size * 0.12);
      leafletPath(ctx, L, Wd);
      ctx.fillStyle = `hsl(${M.hue}, ${M.sat}%, ${M.lit + topBoost * 6}%)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.20)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -L * 0.96);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawFlowerSite(site: FlowerSite, P: Dev, jig: number, tt: number) {
    ctx.strokeStyle = `hsl(${M.hue - 12}, 32%, 30%)`;
    ctx.lineWidth = Math.max(1.5, site.baseW * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -site.axisLen * 0.98);
    ctx.stroke();

    for (let i = 0; i < site.clusters.length; i++) {
      const cl = site.clusters[i];
      const dev = clusterDev(cl, P.budDev);
      if (dev <= 0.01) continue;
      const cyc = jig ? Math.sin(tt * 30 + cl.ph) * jig : 0;
      const cx = cl.lateral * (0.4 + 0.6 * dev) + cyc * 0.5;
      const cy = -cl.along * site.axisLen + (jig ? Math.cos(tt * 26 + cl.ph) * jig * 0.5 : 0);
      const cw = site.baseW * cl.fat * cl.tipTaper * (0.55 + 0.45 * dev);
      const podW = Math.max(1.2, cw * 0.2);
      const podH = podW * 1.5;
      const hue = M.hue + 3;
      const baseLit = 38 - (1 - cl.yf) * 5;
      const detailed = podW > 1.8;

      if (cl.leaf && dev > 0.25 && detailed) {
        const ls = cw * (1.1 - dev * 0.5);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(cl.leafSide * (1.0 + 0.2 * Math.sin(cl.ph)));
        const col = `hsl(${M.hue}, ${M.sat}%, ${M.lit + 6}%)`;
        for (const la of [-0.28, 0, 0.28]) {
          ctx.save();
          ctx.rotate(la);
          ctx.fillStyle = col;
          leafletPath(ctx, ls, ls * 0.24 * M.leafW);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      const reveal = clamp((dev - 0.05) / 0.95, 0, 1);
      let drawn = 0;
      for (const pod of cl.pods) {
        if (pod.k > reveal) continue;
        const g = 0.5 + 0.5 * dev;
        const px = cx + Math.cos(pod.a) * pod.rad * cw * 0.55;
        const py = cy + Math.sin(pod.a) * pod.rad * cw * 0.35 + pod.ring * podH * 0.18;
        const hueP = hue + pod.dh + (pod.blushK < P.blush ? 26 : 0);
        const litP = baseLit + pod.dl + (2 - pod.ring) * 2;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.cos(pod.a) * 0.4);
        ctx.fillStyle = `hsl(${hueP}, 40%, ${litP}%)`;
        podPath(ctx, podW * pod.sz * g, podH * pod.sz * g);
        ctx.fill();
        if (podW > 2.4) {
          ctx.strokeStyle = "rgba(0,0,0,0.20)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
        ctx.translate(0, -podH * pod.sz * g * 0.14);
        ctx.scale(0.55, 0.48);
        ctx.fillStyle = `hsla(${hueP}, 36%, ${Math.min(72, litP + 15)}%, 0.42)`;
        podPath(ctx, podW * pod.sz * g, podH * pod.sz * g);
        ctx.fill();
        ctx.restore();
        drawn++;
      }
      if (drawn === 0) continue;

      const fiberCol = pistilFiber(P.ripe, P.brown), ballCol = pistilBall(P.ripe, P.brown);
      for (const h of cl.hairs) {
        if (h.k > dev) continue;
        const stretch = clamp((dev - h.k * 0.5) / 0.6, 0.35, 1);
        const L = cw * 0.4 * h.len * stretch;
        const x0 = cx + Math.cos(h.a) * cw * 0.18, y0 = cy + Math.sin(h.a) * cw * 0.14 - podH * 0.2;
        const x1 = x0 + Math.cos(h.a) * L, y1 = y0 + Math.sin(h.a) * L;
        ctx.strokeStyle = fiberCol;
        ctx.lineWidth = Math.max(0.6, cw * 0.015);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + h.bend * (2.5 + P.brown * 3), (y0 + y1) / 2 - 2, x1, y1);
        ctx.stroke();
        if (detailed) {
          ctx.fillStyle = ballCol;
          ctx.beginPath();
          ctx.arc(x1, y1, h.ball * Math.max(0.8, cw * 0.02), 0, TAU);
          ctx.fill();
        }
      }
      if (P.trich > 0 && detailed) {
        for (const tr of cl.tris) {
          if (tr.k > P.trich) continue;
          const L = cw * 0.26 * (0.5 + tr.len * P.trich);
          const x0 = cx + Math.cos(tr.a) * cw * 0.22, y0 = cy + Math.sin(tr.a) * cw * 0.18;
          const x1 = x0 + Math.cos(tr.a) * L, y1 = y0 + Math.sin(tr.a) * L;
          ctx.strokeStyle = "rgba(244,250,252,0.5)";
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.fillStyle = trichHead(clamp(P.trich * 1.15 - tr.mat * 0.25, 0, 1));
          ctx.beginPath();
          ctx.arc(x1, y1, tr.headR * Math.max(0.7, cw * 0.018), 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function drawChamberBackdrop() {
    const cx = W / 2, floorY = H * 0.9;
    // halo light
    const hy = H * 0.1, hr = W * 0.3;
    let g = ctx.createLinearGradient(0, hy, 0, floorY);
    g.addColorStop(0, "rgba(140,214,244,0.10)");
    g.addColorStop(1, "rgba(140,214,244,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - hr * 0.9, hy);
    ctx.lineTo(cx + hr * 0.9, hy);
    ctx.lineTo(cx + hr * 1.3, floorY);
    ctx.lineTo(cx - hr * 1.3, floorY);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "rgba(150,222,250,0.8)";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#cfeeff";
    ctx.lineWidth = Math.max(4, W * 0.016);
    ctx.beginPath();
    ctx.ellipse(cx, hy, hr, hr * 0.24, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // glowing soil ring
    const soilR = W * 0.16;
    ctx.save();
    ctx.shadowColor = "rgba(127,212,240,0.5)";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "rgba(127,212,240,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, floorY + 6, soilR * 1.7, soilR * 0.4, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#33421f";
    ctx.beginPath();
    ctx.ellipse(cx, floorY + 4, soilR, soilR * 0.26, 0, 0, TAU);
    ctx.fill();
  }

  function drawPlant(tt: number) {
    const p = plant!;
    const wind = motionOK ? Math.sin(windPhase) * p.windAmp : 0;
    const claw = p.claw;
    const sw0 = clamp(p.A * 0.012 * (0.5 + p.stemH / p.A), 2, 8);

    // stem
    for (let i = 0; i < p.spine.length - 1; i++) {
      const a = p.spine[i], b = p.spine[i + 1];
      if (b.y < p.baseY - p.stemH) break;
      ctx.strokeStyle = `hsl(${M.hue - 12}, 34%, ${26 + a.t * 8}%)`;
      ctx.lineWidth = lerp(sw0, sw0 * 0.35, a.t);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (p.group === "seedling") {
      const top = p.spine[24], sz = p.A * 0.05 + p.stemH * 0.35;
      ctx.fillStyle = `hsl(${M.hue}, ${M.sat}%, ${M.lit + 10}%)`;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(top.x + s * sz * 0.5, top.y + 3, sz * 0.42, sz * 0.2, s * 0.3, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(top.x, top.y);
      drawFan(sz * 1.15, 3, 1, 0);
      ctx.restore();
      return;
    }

    for (let i = 0; i < p.nodes.length; i++) {
      const nd = p.nodes[i];
      const sway = motionOK ? Math.sin(tt * 1.3 + nd.phase) * p.windAmp * 2 + wind : 0;
      const spring = nodeSprings[i] ? nodeSprings[i].ao : 0;
      const jig = Math.min(3, Math.abs(nodeSprings[i] ? nodeSprings[i].av : 0) * 7);
      ctx.save();
      ctx.translate(nd.x, nd.y);
      ctx.rotate(sway + spring + p.droop * nd.side * 0.1 + p.droop * 0.15);
      ctx.strokeStyle = `hsl(${M.hue - 10}, 32%, 30%)`;
      ctx.lineWidth = clamp(sw0 * 0.5 * (1 - nd.f * 0.4), 1, 4);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(nd.tipX * 0.5, nd.tipY * 0.5 - nd.len * 0.12, nd.tipX, nd.tipY);
      ctx.stroke();
      ctx.save();
      ctx.translate(nd.tipX, nd.tipY);
      ctx.rotate(nd.side * (0.5 + nd.tilt * 0.18) + p.droop * 0.4);
      drawFan(nd.leafSize, nd.leaflets, nd.f, claw);
      ctx.restore();
      ctx.save();
      ctx.rotate(-nd.side * 0.35);
      drawFan(nd.leafSize * 0.5, Math.max(3, nd.leaflets - 2), 0, claw);
      ctx.restore();
      if (nd.site) {
        ctx.save();
        ctx.translate(nd.tipX * 0.7, nd.tipY * 0.7);
        ctx.rotate(nd.budRot);
        drawFlowerSite(nd.site, p.P, jig, tt);
        ctx.restore();
      }
      ctx.restore();
    }

    const top = p.spine[24];
    const swayT = motionOK ? Math.sin(tt * 1.1) * p.windAmp * 1.5 + wind : 0;
    if (p.cola) {
      const cjig = Math.min(3, Math.abs(colaSpring.av) * 7);
      ctx.save();
      ctx.translate(p.cola.x, p.cola.y);
      ctx.rotate(colaSpring.ao + swayT);
      ctx.save();
      ctx.translate(0, -p.cola.site.axisLen * 0.04);
      drawFan(p.A * 0.08 * (1 - 0.35 * p.P.budDev), Math.min(M.leafletMax, 5 + Math.floor(p.d / 18)), 1, claw);
      ctx.restore();
      drawFlowerSite(p.cola.site, p.P, cjig, tt);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(swayT);
      drawFan(p.A * 0.08, Math.min(M.leafletMax, 5 + Math.floor(p.d / 18)), 1, claw);
      ctx.restore();
    }
  }

  function drawDust() {
    for (const dd of dust) {
      ctx.globalAlpha = clamp(dd.life / dd.max, 0, 1) * 0.85;
      ctx.fillStyle = dd.gold ? "rgb(233,220,168)" : "rgb(168,214,176)";
      ctx.beginPath();
      ctx.arc(dd.x, dd.y, dd.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- physics --------------------------------------------------------------
  function spawnDust(x: number, y: number, fall: number, flowering: boolean) {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      if (dust.length >= DUST_MAX) dust.shift();
      dust.push({
        x: x + (Math.random() - 0.5) * 22, y: y + (Math.random() - 0.5) * 16,
        vx: ptr.vx * 0.1 * fall + (Math.random() - 0.5) * 24, vy: -14 + Math.random() * 22,
        r: 0.8 + Math.random() * 0.9, life: 0.7 + Math.random() * 0.45, max: 1.1, gold: flowering,
      });
    }
  }

  function applyPointer(dt: number) {
    if (!ptr.active || Math.abs(ptr.vx) < 30 || !plant) {
      ptr.vx *= 0.82;
      return;
    }
    const R = 95;
    const flowering = plant.P.budDev > 0.1;
    for (let i = 0; i < plant.nodes.length; i++) {
      const nd = plant.nodes[i];
      const wx = nd.x + nd.tipX, wy = nd.y + nd.tipY;
      const d = Math.min(Math.hypot(ptr.x - wx, ptr.y - wy), Math.hypot(ptr.x - nd.x, ptr.y - nd.y));
      if (d < R) {
        const fall = 1 - d / R;
        nodeSprings[i].av = clamp(nodeSprings[i].av + (ptr.vx * 0.0000792 * fall * 3600 * dt) / 60, -2.2, 2.2);
        if (Math.abs(ptr.vx) * fall > 260) spawnDust(wx, wy, fall, flowering);
      }
    }
    if (plant.cola) {
      const top = plant.spine[24];
      const d = Math.hypot(ptr.x - top.x, ptr.y - (top.y + plant.stemH * 0.08));
      if (d < R + 20) {
        const fall = 1 - d / (R + 20);
        colaSpring.av = clamp(colaSpring.av + ptr.vx * 0.000016 * fall * 3600 * dt, -1.6, 1.6);
        if (Math.abs(ptr.vx) * fall > 260) spawnDust(top.x, top.y + plant.stemH * 0.06, fall, flowering);
      }
    }
    ptr.vx *= 0.82;
  }

  function stepPhysics(dt: number) {
    applyPointer(dt);
    for (const s of nodeSprings) {
      s.ao += s.av * dt;
      s.av += (-SPRING_K * s.ao - SPRING_C * s.av) * dt;
      s.ao = clamp(s.ao, -0.5, 0.5);
    }
    colaSpring.ao += colaSpring.av * dt;
    colaSpring.av += (-SPRING_K * 1.15 * colaSpring.ao - SPRING_C * colaSpring.av) * dt;
    colaSpring.ao = clamp(colaSpring.ao, -0.35, 0.35);
    for (let i = dust.length - 1; i >= 0; i--) {
      const dd = dust[i];
      dd.life -= dt;
      if (dd.life <= 0) {
        dust.splice(i, 1);
        continue;
      }
      dd.vy += 150 * dt;
      dd.x += dd.vx * dt;
      dd.y += dd.vy * dt;
    }
    windPhase += dt;
  }

  function draw(time: number) {
    ctx.clearRect(0, 0, W, H);
    const tt = motionOK ? time / 1000 : 0;
    const p = getProps();
    if (p.mode === "chamber") drawChamberBackdrop();
    if (plant) drawPlant(tt);
    drawDust();
  }

  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    if (t - last >= 33) {
      last = t;
      // Rebuild geometry only when the meaningful inputs change.
      const p = getProps();
      const key = `${p.stage}|${Math.round(p.health)}|${p.indicaRatio.toFixed(2)}|${p.symptom}|${p.alive}|${p.seed}|${p.mode}|${W}x${H}`;
      if (key !== lastKey) {
        lastKey = key;
        buildPlant();
      }
      stepPhysics(dt);
      draw(t);
    }
    raf = requestAnimationFrame(frame);
  }

  // ---- pointer wiring (chamber only) ---------------------------------------
  function rectXY(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onDown(e: PointerEvent) {
    if (getProps().mode !== "chamber") return;
    ptr.active = true;
    const { x, y } = rectXY(e);
    ptr.x = x;
    ptr.y = y;
    ptr.vx = 0;
    ptr.lastT = performance.now();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  function onMove(e: PointerEvent) {
    if (!ptr.active) return;
    const now = performance.now();
    const { x: nx, y: ny } = rectXY(e);
    const dts = Math.max(0.004, (now - ptr.lastT) / 1000);
    ptr.vx = lerp(ptr.vx, clamp((nx - ptr.x) / dts, -2600, 2600), 0.55);
    ptr.x = nx;
    ptr.y = ny;
    ptr.lastT = now;
  }
  function onUp() {
    ptr.active = false;
  }

  // ---- lifecycle ------------------------------------------------------------
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width;
    H = r.height;
    lastKey = "";
    buildPlant();
    if (!motionOK) draw(0);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  if (motionOK) {
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
  }

  resize();
  if (motionOK) raf = requestAnimationFrame(frame);
  else draw(0);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    },
  };
}
