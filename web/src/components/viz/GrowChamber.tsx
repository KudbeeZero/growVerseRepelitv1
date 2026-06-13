"use client";

// GROVERS Grow Chamber — a hand-rolled Canvas 2D render of a living cannabis
// plant inside an orbital grow pod. Ported from the standalone chamber mockup
// and bound to real plant state: morphology comes from the strain's indica_ratio,
// development is gated on the authoritative growth_stage, and condition_flags
// drive overlays/tint. Mirrors Constellation.tsx (refs + effect + ResizeObserver
// + reduced-motion + RAF cleanup) and honours the strict CSP (no eval/externals).
//
// Geometry-affecting inputs (seed/stage/day/morphology/view) rebuild the plant
// in the keyed effect; fast-changing climate/dev/flags are read from refs each
// frame so dragging a slider never rebuilds the geometry.

import { useEffect, useRef } from "react";
import type { ConditionFlag, GrowthStage } from "@/lib/types";
import {
  TAU,
  lerp,
  clamp,
  smooth,
  mulberry32,
  climateModel,
  type ClimateInput,
  type DevParams,
  type Morphology,
  type BudColor,
} from "@/lib/chamber/morphology";
import { CONDITION_VISUALS, SEVERITY_SCALE, dominantFlag } from "@/lib/conditionVisuals";

export type ChamberView = "chamber" | "macro";

interface Props {
  seed: number;
  day: number;
  stage: GrowthStage;
  morphology: Morphology;
  dev: DevParams;
  climate: ClimateInput;
  conditionFlags: ConditionFlag[];
  view: ChamberView;
  /** Per-strain calyx/pistil colouring (green→amber ↔ anthocyanin purple). */
  budColor: BudColor;
  className?: string;
}

interface LiveState {
  climate: ClimateInput;
  dev: DevParams;
  flags: ConditionFlag[];
  budColor: BudColor;
}

interface Cluster {
  yf: number;
  along: number;
  lateral: number;
  fat: number;
  tipTaper: number;
  centerBias: number;
  pods: Array<{ ring: number; a: number; rad: number; k: number; sz: number; dl: number; dh: number; blushK: number }>;
  hairs: Array<{ a: number; len: number; bend: number; ball: number; k: number }>;
  tris: Array<{ a: number; len: number; headR: number; k: number; mat: number }>;
  ph: number;
  leaf: boolean;
  leafSide: number;
}
interface FlowerSite {
  axisLen: number;
  baseW: number;
  clusters: Cluster[];
  pat: string;
}

export function GrowChamber({
  seed,
  day,
  stage,
  morphology,
  dev,
  climate,
  conditionFlags,
  view,
  budColor,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fast-changing inputs read each frame (no geometry rebuild on slider moves).
  const live = useRef<LiveState>({ climate, dev, flags: conditionFlags, budColor });
  live.current = { climate, dev, flags: conditionFlags, budColor };

  // Rebuild geometry only when these structural inputs change.
  // Macro geometry ignores `day` (buildMacro is seeded only by `seed`), so omit
  // it there — otherwise scrubbing the growth slider would rebuild identical
  // geometry on every integer-day step.
  const dayKey = view === "macro" ? "" : Math.round(day);
  const buildKey = `${seed}|${stage}|${view}|${dayKey}|${morphology.pattern}|${morphology.hue.toFixed(1)}|${morphology.heightMul.toFixed(2)}|${morphology.clusterLen.toFixed(2)}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionOK =
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const S = morphology;
    let W = 0;
    let H = 0;
    let dpr = 1;

    // ---- leaflet outline (pure shape) ----
    const LEAF_OUT: Array<[number, number]> = (() => {
      const pts: Array<[number, number]> = [];
      const SEG = 13;
      for (let i = 1; i < SEG; i++) {
        const t = i / SEG;
        const env = Math.sin(Math.PI * Math.pow(t, 0.85));
        const serr = t > 0.1 && t < 0.94 ? (i % 2 ? 1 : 0.68) : 1;
        pts.push([env * serr * 0.5, t]);
      }
      return pts;
    })();
    function leafletPath(L: number, Wd: number) {
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      for (const [hw, t] of LEAF_OUT) ctx!.lineTo(hw * Wd, -t * L);
      ctx!.lineTo(0, -L);
      for (let i = LEAF_OUT.length - 1; i >= 0; i--) {
        const [hw, t] = LEAF_OUT[i];
        ctx!.lineTo(-hw * Wd, -t * L);
      }
      ctx!.closePath();
    }

    // ---- bract pod (small teardrop) ----
    function podPath(w: number, h: number) {
      ctx!.beginPath();
      ctx!.moveTo(0, h * 0.5);
      ctx!.bezierCurveTo(-w * 0.92, h * 0.3, -w * 0.74, -h * 0.4, 0, -h * 0.6);
      ctx!.bezierCurveTo(w * 0.74, -h * 0.4, w * 0.92, h * 0.3, 0, h * 0.5);
      ctx!.closePath();
    }
    function drawPod(x: number, y: number, rot: number, w: number, h: number, hue: number, sat: number, lit: number, capA: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rot);
      if (w > 2.4) {
        // Big calyx (macro / cola): volumetric radial gradient + a glossy sheen
        // so the bract reads as a swollen, waxy 3D pod rather than a flat shape.
        const g = ctx!.createRadialGradient(-w * 0.22, -h * 0.24, w * 0.08, 0, 0, w * 1.15);
        g.addColorStop(0, `hsl(${hue}, ${sat}%, ${Math.min(80, lit + 18)}%)`);
        g.addColorStop(0.55, `hsl(${hue}, ${sat}%, ${lit}%)`);
        g.addColorStop(1, `hsl(${hue}, ${Math.min(86, sat + 12)}%, ${Math.max(12, lit - 13)}%)`);
        ctx!.fillStyle = g;
        podPath(w, h);
        ctx!.fill();
        ctx!.strokeStyle = "rgba(0,0,0,0.22)";
        ctx!.lineWidth = 0.6;
        ctx!.stroke();
        ctx!.fillStyle = "rgba(255,255,255,0.15)";
        ctx!.beginPath();
        ctx!.ellipse(-w * 0.16, -h * 0.2, w * 0.24, h * 0.16, -0.5, 0, TAU);
        ctx!.fill();
      } else {
        ctx!.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        podPath(w, h);
        ctx!.fill();
      }
      // Inner cap — the lighter, younger calyx tip peeking out.
      ctx!.translate(0, -h * 0.14);
      ctx!.scale(0.55, 0.48);
      ctx!.fillStyle = `hsla(${hue}, ${sat * 0.9}%, ${Math.min(76, lit + 16)}%, ${capA})`;
      podPath(w, h);
      ctx!.fill();
      ctx!.restore();
    }
    // Pistil colour: white → cream/amber with ripeness+browning, then blended
    // toward magenta/pink for anthocyanin phenotypes (mag 0..1).
    function pistilFiber(w: number, brown: number, mag: number) {
      let r = lerp(244, 226, w), g = lerp(238, 138, w), b = lerp(220, 58, w);
      r = lerp(r, 152, brown); g = lerp(g, 88, brown); b = lerp(b, 48, brown);
      r = lerp(r, 232, mag); g = lerp(g, 74, mag); b = lerp(b, 150, mag);
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    function pistilBall(w: number, brown: number, mag: number) {
      let r = lerp(250, 246, w), g = lerp(244, 170, w), b = lerp(230, 86, w);
      r = lerp(r, 188, brown); g = lerp(g, 116, brown); b = lerp(b, 60, brown);
      r = lerp(r, 244, mag); g = lerp(g, 120, mag); b = lerp(b, 178, mag);
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    // Resin-head colour by maturity: clear → cloudy-white (the dominant frosty
    // band) → amber only at the very end. Frost should read mostly white.
    function trichHead(p: number) {
      if (p < 0.5) return "rgba(236,250,255,0.6)";
      if (p < 0.9) return "rgba(248,250,244,0.95)";
      return "rgba(228,188,110,0.95)";
    }

    function buildFlowerSite(
      rnd: () => number,
      axisLen: number,
      baseW: number,
      opt: { pattern: string; nClusters: number; bracts: number; fatMul: number; lush?: number },
    ): FlowerSite {
      const pat = opt.pattern;
      const nClusters = opt.nClusters;
      const lush = opt.lush ?? 1;
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
        const pods = [];
        for (let j = 0; j < nPods; j++) {
          const ring = j < 3 ? 0 : j < 7 ? 1 : 2;
          const a = (j * 2.399) % TAU;
          const rad = ring * 0.42 + rnd() * 0.12;
          pods.push({
            ring, a, rad,
            k: ring / 2 + rnd() * 0.3,
            sz: (ring === 0 ? 1.0 : ring === 1 ? 0.85 : 0.7) * (0.85 + rnd() * 0.3),
            dl: (rnd() - 0.5) * 12, dh: (rnd() - 0.5) * 8, blushK: rnd(),
          });
        }
        pods.sort((p, q) => p.ring - q.ring);
        const hairs = [];
        const nH = Math.round((pat === "spiral" ? 8 : 10) * lush);
        for (let j = 0; j < nH; j++)
          hairs.push({ a: -Math.PI / 2 + (rnd() - 0.5) * 2.2, len: 0.55 + rnd() * 0.6, bend: (rnd() - 0.5) * 1.3, ball: 0.7 + rnd() * 0.4, k: rnd() * 0.85 });
        const tris = [];
        const nT = Math.round(6 * lush * lush);
        for (let j = 0; j < nT; j++)
          tris.push({ a: rnd() * TAU, len: 0.5 + rnd() * 0.5, headR: 0.7 + rnd() * 0.5, k: rnd(), mat: rnd() });
        clusters.push({
          yf, along, lateral, fat: fat * opt.fatMul, tipTaper, centerBias, pods, hairs, tris,
          ph: rnd() * TAU,
          leaf: pat !== "nodal" && i % 3 === 0 && yf < 0.75,
          leafSide: i % 2 ? 1 : -1,
        });
      }
      return { axisLen, baseW, clusters, pat };
    }

    function clusterDev(cl: Cluster, budDev: number) {
      return clamp(budDev * (0.4 + 0.9 * Math.max(0, cl.centerBias)), 0, 1) * (budDev > 0.02 ? 1 : 0);
    }

    function drawFlowerSite(site: FlowerSite, P: DevParams, jig: number, tt: number) {
      ctx!.strokeStyle = `hsl(${S.hue - 12}, 32%, 30%)`;
      ctx!.lineWidth = Math.max(1.5, site.baseW * 0.06);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.lineTo(0, -site.axisLen * 0.98);
      ctx!.stroke();

      for (let i = 0; i < site.clusters.length; i++) {
        const cl = site.clusters[i];
        const d = clusterDev(cl, P.budDev);
        if (d <= 0.01) continue;
        const cyc = jig ? Math.sin(tt * 30 + cl.ph) * jig : 0;
        const cx = cl.lateral * (0.4 + 0.6 * d) + cyc * 0.5;
        const cy = -cl.along * site.axisLen + (jig ? Math.cos(tt * 26 + cl.ph) * jig * 0.5 : 0);
        const cw = site.baseW * cl.fat * cl.tipTaper * (0.55 + 0.45 * d);
        const podW = Math.max(1.2, cw * 0.2);
        const podH = podW * 1.5;
        const bc = live.current.budColor;
        const calyxHue = bc.calyxHue + 3;
        const calyxSat = bc.calyxSat;
        const baseLit = 38 - (1 - cl.yf) * 5 + bc.anthocyanin * 3;
        const detailed = podW > 1.8;

        if (cl.leaf && d > 0.25 && detailed) {
          const ls = cw * (1.1 - d * 0.5);
          ctx!.save();
          ctx!.translate(cx, cy);
          ctx!.rotate(cl.leafSide * (1.0 + 0.2 * Math.sin(cl.ph)));
          const col = `hsl(${S.hue}, ${S.sat}%, ${S.lit + 6}%)`;
          for (const la of [-0.28, 0, 0.28]) {
            ctx!.save();
            ctx!.rotate(la);
            ctx!.fillStyle = col;
            leafletPath(ls, ls * 0.24 * S.leafW);
            ctx!.fill();
            ctx!.restore();
          }
          ctx!.restore();
        }

        const reveal = clamp((d - 0.05) / 0.95, 0, 1);
        let drawn = 0;
        for (const p of cl.pods) {
          if (p.k > reveal) continue;
          const g = 0.5 + 0.5 * d;
          const px = cx + Math.cos(p.a) * p.rad * cw * 0.55;
          const py = cy + Math.sin(p.a) * p.rad * cw * 0.35 + p.ring * podH * 0.18;
          // Some calyxes can render in an accent hue (e.g. purple accents on a
          // green bud) — chosen deterministically per pod via its blushK roll.
          const accent = bc.accentFrac != null && bc.accentHue != null && p.blushK < bc.accentFrac;
          const baseHueP = accent ? bc.accentHue! : calyxHue;
          // Accent calyxes are already a distinct hue — don't also apply the
          // ripeness blush shift, which would push violet toward pink.
          const hueP = baseHueP + p.dh + (!accent && p.blushK < P.blush ? 18 : 0);
          drawPod(px, py, Math.cos(p.a) * 0.4, podW * p.sz * g, podH * p.sz * g, hueP, calyxSat, baseLit + p.dl + (2 - p.ring) * 2, 0.42);
          drawn++;
        }
        if (drawn === 0) continue;

        const fiberCol = pistilFiber(P.ripe, P.brown, bc.pistilMagenta);
        const ballCol = pistilBall(P.ripe, P.brown, bc.pistilMagenta);
        for (const h of cl.hairs) {
          if (h.k > d) continue;
          const stretch = clamp((d - h.k * 0.5) / 0.6, 0.35, 1);
          const L = cw * 0.2 * h.len * stretch;
          const x0 = cx + Math.cos(h.a) * cw * 0.16, y0 = cy + Math.sin(h.a) * cw * 0.12 - podH * 0.2;
          const x1 = x0 + Math.cos(h.a) * L, y1 = y0 + Math.sin(h.a) * L;
          ctx!.strokeStyle = fiberCol;
          ctx!.lineWidth = Math.max(0.5, cw * 0.01);
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(x0, y0);
          // Curl grows with ripeness so spent pistils curl back over the bud.
          ctx!.quadraticCurveTo((x0 + x1) / 2 + h.bend * (1.6 + P.ripe * 2.2), (y0 + y1) / 2 - 2, x1, y1);
          ctx!.stroke();
          if (detailed) {
            ctx!.fillStyle = ballCol;
            ctx!.beginPath();
            ctx!.arc(x1, y1, h.ball * Math.max(0.5, cw * 0.011), 0, TAU);
            ctx!.fill();
          }
        }
        // Trichomes — stalked capitate glands spread across the calyx surface:
        // a clear glassy stalk, a bulbous resin head (clear→cloudy→amber with
        // maturity) and a specular sparkle. Dense coverage reads as frost.
        if (P.trich > 0 && detailed) {
          ctx!.lineCap = "round";
          for (const tr of cl.tris) {
            if (tr.k > P.trich) continue;
            // Dense, SHORT glands coating the calyx surface — a frost, not spikes.
            const rad = cw * (0.08 + 0.44 * tr.k);
            const L = cw * (0.025 + 0.05 * tr.len);
            const x0 = cx + Math.cos(tr.a) * rad, y0 = cy + Math.sin(tr.a) * rad - podH * 0.08;
            const x1 = x0 + Math.cos(tr.a) * L, y1 = y0 + Math.sin(tr.a) * L;
            ctx!.strokeStyle = "rgba(228,244,248,0.28)";
            ctx!.lineWidth = Math.max(0.4, cw * 0.007);
            ctx!.beginPath();
            ctx!.moveTo(x0, y0);
            ctx!.lineTo(x1, y1);
            ctx!.stroke();
            const hr = tr.headR * Math.max(0.55, cw * 0.013);
            ctx!.fillStyle = trichHead(clamp(P.trich - tr.mat * 0.4, 0, 1));
            ctx!.beginPath();
            ctx!.arc(x1, y1, hr, 0, TAU);
            ctx!.fill();
            ctx!.fillStyle = "rgba(255,255,255,0.65)";
            ctx!.beginPath();
            ctx!.arc(x1 - hr * 0.3, y1 - hr * 0.3, hr * 0.32, 0, TAU);
            ctx!.fill();
          }
        }
      }
    }

    // ---- plant + scene physics ----
    interface PhysNode { ao: number; av: number }
    const phys = {
      nodes: [] as PhysNode[],
      cola: { ao: 0, av: 0 } as PhysNode,
      bud: { ao: 0, av: 0 } as PhysNode,
    };
    const SPRING_K = 30, SPRING_C = 5.2;
    interface Dust { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; gold: boolean }
    const dust: Dust[] = [];
    const DUST_MAX = 90;
    const ptr = { x: -999, y: -999, vx: 0, active: false, lastT: 0 };
    let windPhase = 0;

    interface SceneCap { x: number; w: number; y: number; h: number; cx: number; floorY: number; haloY: number }
    interface Scene {
      stars: Array<{ x: number; y: number; r: number; a: number }>;
      links: Array<[number, number]>;
      cap: SceneCap;
      ringR: number;
      soilR: number;
      cracks: Array<{ a: number; r0: number; r1: number; al: number; wob: number }>;
    }
    interface Node {
      x: number; y: number; f: number; side: number; tilt: number; len: number;
      leafSize: number; leaflets: number; phase: number; tipX: number; tipY: number;
      site: FlowerSite | null; budRot: number;
    }
    interface Plant {
      P: DevParams; CL: ReturnType<typeof climateModel>; stage: string;
      cx: number; baseY: number; A: number; stemH: number;
      spine: Array<{ x: number; y: number; t: number }>; nodes: Node[];
      cola: { site: FlowerSite; x: number; y: number } | null;
    }
    let scene: Scene | null = null;
    let plant: Plant | null = null;
    let macroSite: FlowerSite | null = null;
    // Precomputed-once macro backdrop (deterministic from seed + canvas size) so
    // the per-frame draw never re-seeds PRNGs or re-allocates gradients.
    let macroBokeh: Array<{ x: number; y: number; r: number; grad: CanvasGradient }> = [];
    let macroLeaves: Array<{ lx: number; ly: number; lsz: number; rot: number }> = [];

    function stageOf(): string {
      return stage; // authoritative server stage drives discrete features
    }

    function buildScene() {
      const rnd = mulberry32(777);
      const stars = [];
      const n = 24;
      for (let i = 0; i < n; i++) stars.push({ x: rnd() * W, y: rnd() * H * 0.9, r: 0.8 + rnd() * 1.4, a: 0.05 + rnd() * 0.09 });
      const links: Array<[number, number]> = [];
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
          if (dx * dx + dy * dy < 110 * 110 && rnd() < 0.5) links.push([i, j]);
        }
      const cw = Math.min(W * 0.9, 480);
      const cap: SceneCap = { x: (W - cw) / 2, w: cw, y: H * 0.012, h: H * 0.94, cx: 0, floorY: 0, haloY: 0 };
      cap.cx = cap.x + cap.w / 2;
      cap.floorY = cap.y + cap.h * 0.875;
      cap.haloY = cap.y + cap.h * 0.1;
      const ringR = cap.w * 0.33, soilR = cap.w * 0.135;
      const cracks = [];
      for (let i = 0; i < 46; i++) {
        const a = rnd() * TAU;
        cracks.push({ a, r0: soilR * 1.06, r1: soilR * 1.1 + rnd() * (ringR - soilR) * 0.95, al: 0.15 + rnd() * 0.4, wob: (rnd() - 0.5) * 0.3 });
      }
      scene = { stars, links, cap, ringR, soilR, cracks };
    }

    function buildPlant() {
      const CL = climateModel(live.current.climate);
      const rnd = mulberry32(seed * 7919 + 13);
      const P = live.current.dev;
      const cap = scene!.cap, cx = cap.cx, baseY = cap.floorY - 6;
      const ceil = cap.haloY + cap.h * 0.1, A = baseY - ceil;
      const d = day;

      let hN: number;
      if (d <= 10) hN = lerp(0.05, 0.13, smooth(d / 10));
      else if (d <= 34) hN = lerp(0.13, 0.6, Math.pow((d - 10) / 24, 0.75));
      else hN = lerp(0.6, clamp(0.6 * S.stretch, 0, 0.97), smooth(clamp((d - 34) / 14, 0, 1)));
      hN = clamp(hN * S.heightMul * (0.85 + 0.15 * CL.growthMult), 0.05, 0.97);
      const stemH = A * hN;

      const wob1 = (rnd() - 0.5) * stemH * 0.13, wob2 = (rnd() - 0.5) * stemH * 0.08;
      const spine = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        spine.push({ x: cx + wob1 * Math.sin(Math.PI * t) + wob2 * Math.sin(TAU * t) * 0.5, y: baseY - stemH * t, t });
      }

      const nodes: Node[] = [];
      const maxNodes = Math.min(13, Math.max(d <= 10 ? 1 : 2, Math.floor(hN / S.internode)));
      const grow = smooth(clamp((d - 8) / 22, 0, 1));
      for (let i = 0; i < maxNodes; i++) {
        const f = (i + 1) / (maxNodes + 1);
        const p = spine[Math.round(f * 24)];
        const low = Math.pow(1 - f, 0.75);
        const side = i % 2 ? 1 : -1;
        const tilt = (0.92 + rnd() * 0.25) * (1 - f * 0.22);
        const len = A * 0.27 * S.branchMul * (0.35 + 0.65 * low) * grow;
        const nd: Node = {
          x: p.x, y: p.y, f, side, tilt, len,
          leafSize: A * (0.08 + 0.05 * low) * (0.55 + 0.45 * grow) * (1 - 0.4 * P.budDev * f),
          leaflets: Math.min(S.leafletMax, 3 + 2 * Math.floor(d / 14)),
          phase: rnd() * TAU,
          tipX: 0, tipY: 0, site: null, budRot: 0,
        };
        nd.tipX = Math.sin(nd.tilt) * nd.side * nd.len;
        nd.tipY = -Math.cos(nd.tilt) * nd.len * 0.55;
        if (P.budDev > 0 && f > S.flowerFrom) {
          const sizeUp = lerp(0.55, 1.15, f);
          const axis = A * (0.05 + 0.09 * f) * S.clusterLen * sizeUp * (0.5 + 0.5 * P.budDev);
          const baseW = axis * 0.42 * S.clusterFat;
          const nC = Math.max(2, Math.round(S.bracts * 0.55 * (0.6 + 0.5 * f)));
          nd.site = buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 1 });
          nd.budRot = nd.side * 0.1;
        }
        nodes.push(nd);
      }

      let cola: Plant["cola"] = null;
      if (P.budDev > 0) {
        const axis = stemH * (0.15 + 0.16 * P.budDev) * S.clusterLen;
        const baseW = axis * (S.pattern === "spiral" ? 0.3 : 0.46) * S.clusterFat;
        const nC = Math.round(S.bracts * (S.pattern === "spiral" ? 1.6 : 1.0));
        cola = {
          site: buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 1.05 }),
          x: spine[24].x, y: spine[24].y + axis * 0.06,
        };
      }

      plant = { P, CL, stage: stageOf(), cx, baseY, A, stemH, spine, nodes, cola };
      while (phys.nodes.length < nodes.length) phys.nodes.push({ ao: 0, av: 0 });
      phys.nodes.length = nodes.length;
    }

    function buildMacro() {
      const rnd = mulberry32(seed * 5077 + 7);
      const axis = H * 0.62;
      const baseW = axis * (S.pattern === "spiral" ? 0.3 : 0.46) * S.clusterFat;
      const nC = Math.round(S.bracts * (S.pattern === "spiral" ? 2.0 : 1.3));
      // High lush so the showcase cola carries dense pistils + heavy trichome
      // frost — far more than the tiny node buds out in the chamber view.
      macroSite = buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 1.08, lush: 2.2 });

      // Static backdrop, computed once (deterministic from seed + canvas size).
      const brnd = mulberry32(seed * 131 + 17);
      macroBokeh = [];
      for (let i = 0; i < 9; i++) {
        const x = brnd() * W, y = brnd() * H * 0.82, r = 26 + brnd() * 72;
        const tone = brnd() < 0.5 ? "190,232,210" : "150,208,168";
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${tone},0.16)`);
        grad.addColorStop(1, `rgba(${tone},0)`);
        macroBokeh.push({ x, y, r, grad });
      }
      const lrnd = mulberry32(seed * 911 + 3);
      macroLeaves = [];
      const nLeaf = 7;
      for (let i = 0; i < nLeaf; i++) {
        const yf = 0.12 + (i / (nLeaf - 1)) * 0.74;
        const side = i % 2 ? 1 : -1;
        macroLeaves.push({
          lx: side * baseW * (0.4 + lrnd() * 0.3),
          ly: -yf * axis,
          lsz: axis * (0.34 - 0.16 * yf) * (0.9 + lrnd() * 0.3),
          rot: side * (1.05 + lrnd() * 0.3) - 0.1,
        });
      }
    }

    // ---- leaves ----
    const FAN_A = [0, 0.42, -0.42, 0.85, -0.85, 1.22, -1.22, 1.5, -1.5];
    const FAN_M = [1, 0.86, 0.86, 0.7, 0.7, 0.52, 0.52, 0.36, 0.36];
    function drawFan(size: number, n: number, topBoost: number, claw: number) {
      for (let i = 0; i < n; i++) {
        const L = size * FAN_M[i], Wd = L * 0.32 * S.leafW;
        const a = FAN_A[i] + (claw ? Math.sign(FAN_A[i] || 1) * claw * (0.2 + Math.abs(FAN_A[i]) * 0.5) : 0);
        ctx!.save();
        ctx!.rotate(a);
        const col = `hsl(${S.hue}, ${S.sat}%, ${S.lit + topBoost * 6}%)`;
        ctx!.strokeStyle = `hsl(${S.hue}, ${S.sat * 0.7}%, ${(S.lit + topBoost * 6) * 0.8}%)`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(0, -size * 0.12);
        ctx!.stroke();
        ctx!.translate(0, -size * 0.12);
        ctx!.fillStyle = col;
        leafletPath(L, Wd);
        ctx!.fill();
        ctx!.strokeStyle = "rgba(0,0,0,0.20)";
        ctx!.lineWidth = 0.6;
        ctx!.stroke();
        ctx!.strokeStyle = "rgba(255,255,255,0.10)";
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.lineTo(0, -L * 0.96);
        ctx!.stroke();
        ctx!.restore();
      }
    }

    // ---- physics + dust ----
    function applyPointer(dt: number) {
      if (!ptr.active || Math.abs(ptr.vx) < 30) {
        ptr.vx *= 0.82;
        return;
      }
      const R = 95;
      if (view === "macro") {
        phys.bud.av = clamp(phys.bud.av + ptr.vx * 0.000012 * 3600 * dt, -1.2, 1.2);
        if (Math.abs(ptr.vx) > 420) spawnDust(ptr.x, ptr.y, 1);
      } else if (plant) {
        for (let i = 0; i < plant.nodes.length; i++) {
          const nd = plant.nodes[i];
          const wx = nd.x + nd.tipX, wy = nd.y + nd.tipY;
          const d = Math.min(Math.hypot(ptr.x - wx, ptr.y - wy), Math.hypot(ptr.x - nd.x, ptr.y - nd.y));
          if (d < R) {
            const fall = 1 - d / R;
            phys.nodes[i].av = clamp(phys.nodes[i].av + ptr.vx * 0.0000792 * fall * 3600 * dt / 60, -2.2, 2.2);
            if (Math.abs(ptr.vx) * fall > 260) spawnDust(wx, wy, fall);
          }
        }
        if (plant.cola) {
          const top = plant.spine[24];
          const d = Math.hypot(ptr.x - top.x, ptr.y - (top.y + plant.stemH * 0.08));
          if (d < R + 20) {
            const fall = 1 - d / (R + 20);
            phys.cola.av = clamp(phys.cola.av + ptr.vx * 0.000016 * fall * 3600 * dt, -1.6, 1.6);
            if (Math.abs(ptr.vx) * fall > 260) spawnDust(top.x, top.y + plant.stemH * 0.06, fall);
          }
        }
      }
      ptr.vx *= 0.82;
    }
    function spawnDust(x: number, y: number, fall: number) {
      const flowering = live.current.dev.budDev > 0.1;
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
    function stepPhysics(dt: number) {
      applyPointer(dt);
      for (const s of phys.nodes) {
        s.ao += s.av * dt;
        s.av += (-SPRING_K * s.ao - SPRING_C * s.av) * dt;
        s.ao = clamp(s.ao, -0.5, 0.5);
      }
      for (const c of [phys.cola, phys.bud]) {
        c.ao += c.av * dt;
        c.av += (-SPRING_K * 1.15 * c.ao - SPRING_C * c.av) * dt;
        c.ao = clamp(c.ao, -0.35, 0.35);
      }
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
      windPhase += dt * (1 + (live.current.climate.fan / 100) * 2.5);
    }

    function drawChamberShell(tt: number) {
      const cap = scene!.cap;
      const fan = live.current.climate.fan;
      const co2 = live.current.climate.co2;
      let g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#060d16");
      g.addColorStop(1, "#04080e");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
      ctx!.strokeStyle = "rgba(127,212,240,0.07)";
      ctx!.lineWidth = 1;
      for (const [i, j] of scene!.links) {
        ctx!.beginPath();
        ctx!.moveTo(scene!.stars[i].x, scene!.stars[i].y);
        ctx!.lineTo(scene!.stars[j].x, scene!.stars[j].y);
        ctx!.stroke();
      }
      for (const st of scene!.stars) {
        ctx!.globalAlpha = st.a;
        ctx!.fillStyle = "#bfe5f5";
        ctx!.beginPath();
        ctx!.arc(st.x, st.y, st.r, 0, TAU);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      g = ctx!.createLinearGradient(0, cap.y, 0, cap.y + cap.h);
      g.addColorStop(0, "#0c2334");
      g.addColorStop(0.55, "#0a1d2c");
      g.addColorStop(1, "#081522");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.roundRect(cap.x, cap.y, cap.w, cap.h, 34);
      ctx!.fill();
      ctx!.fillStyle = "#0a1a28";
      ctx!.beginPath();
      ctx!.roundRect(cap.x - 6, cap.y - 4, cap.w + 12, cap.h * 0.07, 20);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.roundRect(cap.x - 6, cap.y + cap.h * 0.965, cap.w + 12, cap.h * 0.05, 14);
      ctx!.fill();

      const hx = cap.cx, hy = cap.haloY, hr = cap.w * 0.3;
      g = ctx!.createLinearGradient(0, hy, 0, cap.floorY);
      g.addColorStop(0, "rgba(140,214,244,0.13)");
      g.addColorStop(1, "rgba(140,214,244,0)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.moveTo(hx - hr * 0.92, hy);
      ctx!.lineTo(hx + hr * 0.92, hy);
      ctx!.lineTo(hx + hr * 1.35, cap.floorY);
      ctx!.lineTo(hx - hr * 1.35, cap.floorY);
      ctx!.closePath();
      ctx!.fill();
      ctx!.save();
      ctx!.shadowColor = "rgba(150,222,250,0.9)";
      ctx!.shadowBlur = 26;
      ctx!.strokeStyle = "#cfeeff";
      ctx!.lineWidth = Math.max(5, cap.w * 0.022);
      ctx!.beginPath();
      ctx!.ellipse(hx, hy, hr, hr * 0.26, 0, 0, TAU);
      ctx!.stroke();
      ctx!.restore();
      ctx!.strokeStyle = "rgba(10,30,44,0.85)";
      ctx!.lineWidth = 3;
      ctx!.beginPath();
      ctx!.ellipse(hx, hy, hr * 0.55, hr * 0.13, 0, 0.4, Math.PI - 0.4);
      ctx!.stroke();

      const fy = cap.floorY;
      ctx!.fillStyle = "#0b1d2b";
      ctx!.beginPath();
      ctx!.ellipse(hx, fy + 8, cap.w * 0.4, 18, 0, 0, TAU);
      ctx!.fill();
      ctx!.save();
      ctx!.shadowColor = "rgba(127,212,240,0.6)";
      ctx!.shadowBlur = 14;
      ctx!.strokeStyle = "rgba(127,212,240,0.65)";
      ctx!.lineWidth = 2.5;
      ctx!.beginPath();
      ctx!.ellipse(hx, fy + 6, scene!.ringR, scene!.ringR * 0.24, 0, 0, TAU);
      ctx!.stroke();
      ctx!.restore();
      ctx!.strokeStyle = "rgba(127,212,240,1)";
      ctx!.lineCap = "round";
      for (const cr of scene!.cracks) {
        ctx!.globalAlpha = cr.al;
        ctx!.lineWidth = 1;
        const a = cr.a;
        ctx!.beginPath();
        ctx!.moveTo(hx + Math.cos(a) * cr.r0, fy + 6 + Math.sin(a) * cr.r0 * 0.24);
        ctx!.quadraticCurveTo(
          hx + Math.cos(a + cr.wob) * (cr.r0 + cr.r1) / 2, fy + 6 + Math.sin(a + cr.wob) * (cr.r0 + cr.r1) / 2 * 0.24,
          hx + Math.cos(a) * cr.r1, fy + 6 + Math.sin(a) * cr.r1 * 0.24,
        );
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = "#33421f";
      ctx!.beginPath();
      ctx!.ellipse(hx, fy + 4, scene!.soilR, scene!.soilR * 0.26, 0, 0, TAU);
      ctx!.fill();
      ctx!.fillStyle = "rgba(120,150,70,0.5)";
      ctx!.beginPath();
      ctx!.ellipse(hx, fy + 2.5, scene!.soilR * 0.92, scene!.soilR * 0.22, 0, 0, TAU);
      ctx!.fill();

      // CO2 rig — glow scales with co2 level
      const tx = cap.x + cap.w * 0.085, ty = cap.y + cap.h * 0.135, tw = cap.w * 0.1, th = cap.h * 0.19;
      ctx!.fillStyle = "#13293a";
      ctx!.beginPath();
      ctx!.roundRect(tx, ty, tw, th, tw * 0.45);
      ctx!.fill();
      const co2glow = clamp((co2 - 400) / 1100, 0, 1);
      ctx!.strokeStyle = `rgba(127,212,240,${0.15 + co2glow * 0.4})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
      ctx!.fillStyle = "rgba(207,238,255,0.85)";
      ctx!.font = `700 ${Math.max(9, tw * 0.3)}px ui-monospace, Menlo, monospace`;
      ctx!.textAlign = "center";
      ctx!.fillText("CO₂", tx + tw / 2, ty + th * 0.56);

      // FAN — blade rotation speed driven by fan
      const fxc = cap.x + cap.w * 0.86, fyc = cap.y + cap.h * 0.18, fr = cap.w * 0.085;
      ctx!.fillStyle = "#0d2030";
      ctx!.beginPath();
      ctx!.arc(fxc, fyc, fr * 1.22, 0, TAU);
      ctx!.fill();
      ctx!.strokeStyle = fan > 78 ? "rgba(232,138,92,0.7)" : "rgba(127,212,240,0.3)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.arc(fxc, fyc, fr * 1.22, 0, TAU);
      ctx!.stroke();
      ctx!.fillStyle = "#091723";
      ctx!.beginPath();
      ctx!.arc(fxc, fyc, fr * 1.02, 0, TAU);
      ctx!.fill();
      const fanRot = (motionOK ? tt : 0) * (0.2 + (fan / 100) * 7);
      ctx!.save();
      ctx!.translate(fxc, fyc);
      ctx!.rotate(fanRot);
      ctx!.fillStyle = "#13293a";
      for (let b = 0; b < 5; b++) {
        ctx!.rotate(TAU / 5);
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.bezierCurveTo(fr * 0.5, -fr * 0.18, fr * 0.95, -fr * 0.42, fr * 0.92, -fr * 0.05);
        ctx!.bezierCurveTo(fr * 0.85, fr * 0.3, fr * 0.3, fr * 0.18, 0, 0);
        ctx!.fill();
      }
      ctx!.restore();
      ctx!.fillStyle = "#16303f";
      ctx!.beginPath();
      ctx!.arc(fxc, fyc, fr * 0.22, 0, TAU);
      ctx!.fill();
      if (fan > 55 && motionOK) {
        ctx!.strokeStyle = `rgba(127,212,240,${(fan - 55) / 100})`;
        ctx!.lineWidth = 1;
        for (let s = 0; s < 3; s++) {
          const sy = fyc + (s - 1) * fr * 0.5;
          const off = (tt * 120 * (fan / 100)) % 60;
          ctx!.beginPath();
          ctx!.moveTo(fxc - fr * 1.4 - off, sy);
          ctx!.lineTo(fxc - fr * 1.4 - off + 18, sy);
          ctx!.stroke();
        }
      }
    }

    function drawPlant(tt: number) {
      const p = plant!;
      // Recompute climate live so dragging FAN/temp affects sway + windburn now
      // (without rebuilding the plant geometry).
      const CL = climateModel(live.current.climate);
      const flag = dominantFlag(live.current.flags);
      const vis = CONDITION_VISUALS[flag.condition];
      const sev = SEVERITY_SCALE[flag.severity] ?? 0;
      const condClaw = vis.bodyAnim === "wilt-hard" ? 0.5 * sev : vis.bodyAnim === "droop" ? 0.3 * sev : 0;
      const wind = Math.sin(windPhase) * CL.windAmp;
      const claw = (CL.tooMuchFan ? 0.35 : 0) + condClaw;
      const sw0 = clamp(p.A * 0.012 * (0.5 + p.stemH / p.A), 2, 8) * (CL.tooLowFan ? 0.8 : 1);
      for (let i = 0; i < p.spine.length - 1; i++) {
        const a = p.spine[i], b = p.spine[i + 1];
        if (b.y < p.baseY - p.stemH) break;
        ctx!.strokeStyle = `hsl(${S.hue - 12}, 34%, ${26 + a.t * 8}%)`;
        ctx!.lineWidth = lerp(sw0, sw0 * 0.35, a.t);
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
      if (p.stage === "seed" || p.stage === "germination" || p.stage === "seedling") {
        const top = p.spine[24], sz = p.A * 0.05 + p.stemH * 0.35;
        ctx!.fillStyle = `hsl(${S.hue}, ${S.sat}%, ${S.lit + 10}%)`;
        for (const s of [-1, 1]) {
          ctx!.beginPath();
          ctx!.ellipse(top.x + s * sz * 0.5, top.y + 3, sz * 0.42, sz * 0.2, s * 0.3, 0, TAU);
          ctx!.fill();
        }
        ctx!.save();
        ctx!.translate(top.x, top.y);
        drawFan(sz * 1.15, 3, 1, 0);
        ctx!.restore();
        return;
      }
      for (let i = 0; i < p.nodes.length; i++) {
        const nd = p.nodes[i];
        const sway = motionOK ? Math.sin(tt * 1.3 + nd.phase) * CL.windAmp * 2 + wind : 0;
        const spring = phys.nodes[i] ? phys.nodes[i].ao : 0;
        const jig = Math.min(3, Math.abs(phys.nodes[i] ? phys.nodes[i].av : 0) * 7);
        ctx!.save();
        ctx!.translate(nd.x, nd.y);
        ctx!.rotate(sway + spring + nd.side * condClaw * 0.4);
        ctx!.strokeStyle = `hsl(${S.hue - 10}, 32%, 30%)`;
        ctx!.lineWidth = clamp(sw0 * 0.5 * (1 - nd.f * 0.4), 1, 4);
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.quadraticCurveTo(nd.tipX * 0.5, nd.tipY * 0.5 - nd.len * 0.12, nd.tipX, nd.tipY);
        ctx!.stroke();
        ctx!.save();
        ctx!.translate(nd.tipX, nd.tipY);
        ctx!.rotate(nd.side * (0.5 + nd.tilt * 0.18));
        drawFan(nd.leafSize, nd.leaflets, nd.f, claw);
        ctx!.restore();
        ctx!.save();
        ctx!.rotate(-nd.side * 0.35);
        drawFan(nd.leafSize * 0.5, Math.max(3, nd.leaflets - 2), 0, claw);
        ctx!.restore();
        if (nd.site) {
          ctx!.save();
          ctx!.translate(nd.tipX * 0.7, nd.tipY * 0.7);
          ctx!.rotate(nd.budRot);
          drawFlowerSite(nd.site, p.P, jig, tt);
          ctx!.restore();
        }
        ctx!.restore();
      }
      const top = p.spine[24];
      const swayT = motionOK ? Math.sin(tt * 1.1) * CL.windAmp * 1.5 + wind : 0;
      if (p.cola) {
        const cjig = Math.min(3, Math.abs(phys.cola.av) * 7);
        ctx!.save();
        ctx!.translate(p.cola.x, p.cola.y);
        ctx!.rotate(phys.cola.ao + swayT);
        ctx!.save();
        ctx!.translate(0, -p.cola.site.axisLen * 0.04);
        drawFan(p.A * 0.08 * (1 - 0.35 * p.P.budDev), Math.min(S.leafletMax, 5 + Math.floor(day / 18)), 1, claw);
        ctx!.restore();
        drawFlowerSite(p.cola.site, p.P, cjig, tt);
        ctx!.restore();
      } else {
        ctx!.save();
        ctx!.translate(top.x, top.y);
        ctx!.rotate(swayT);
        drawFan(p.A * 0.08, Math.min(S.leafletMax, 5 + Math.floor(day / 18)), 1, claw);
        ctx!.restore();
      }
      drawConditionOverlay(p);
    }

    // Condition flags -> canvas overlays, reusing conditionVisuals semantics.
    function drawConditionOverlay(p: Plant) {
      const flag = dominantFlag(live.current.flags);
      const vis = CONDITION_VISUALS[flag.condition];
      const sev = SEVERITY_SCALE[flag.severity] ?? 0;
      if (vis.overlay === "none" || sev <= 0) return;
      const cx = p.cx, midY = p.baseY - p.stemH * 0.5;
      const rnd = mulberry32(seed + 99);
      if (vis.overlay === "bugs") {
        ctx!.fillStyle = "#1a1a1a";
        for (let i = 0; i < Math.round(12 * sev); i++) {
          const x = cx + (rnd() - 0.5) * p.stemH * 0.7;
          const y = midY + (rnd() - 0.5) * p.stemH * 0.8;
          ctx!.beginPath();
          ctx!.arc(x, y, 1.6, 0, TAU);
          ctx!.fill();
        }
      } else if (vis.overlay === "mildew") {
        ctx!.fillStyle = `rgba(232,237,242,${0.5 * sev})`;
        for (let i = 0; i < Math.round(14 * sev); i++) {
          const x = cx + (rnd() - 0.5) * p.stemH * 0.7;
          const y = midY + (rnd() - 0.5) * p.stemH * 0.8;
          ctx!.beginPath();
          ctx!.arc(x, y, 3 + rnd() * 3, 0, TAU);
          ctx!.fill();
        }
      } else if (vis.overlay === "rot") {
        ctx!.fillStyle = `rgba(59,47,35,${0.8 * sev})`;
        ctx!.beginPath();
        ctx!.ellipse(cx, p.baseY, p.stemH * 0.18, 6, 0, 0, TAU);
        ctx!.fill();
      } else if (vis.overlay === "water-sheen") {
        ctx!.fillStyle = `rgba(140,200,235,${0.18 * sev})`;
        ctx!.beginPath();
        ctx!.ellipse(cx, p.baseY + 2, p.stemH * 0.25, 8, 0, 0, TAU);
        ctx!.fill();
      }
    }

    function drawMacro(tt: number) {
      // ---- grow-tent depth-of-field backdrop ----
      let g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b1a12");
      g.addColorStop(0.5, "#0a1410");
      g.addColorStop(1, "#070d0a");
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
      // Soft out-of-focus bokeh — blurred grow-light glints behind the subject
      // (precomputed once in buildMacro; gradients reused frame to frame).
      for (const b of macroBokeh) {
        ctx!.fillStyle = b.grad;
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r, 0, TAU);
        ctx!.fill();
      }
      // Top light cone from the grow lamp.
      g = ctx!.createLinearGradient(0, 0, 0, H * 0.9);
      g.addColorStop(0, "rgba(196,242,222,0.10)");
      g.addColorStop(1, "rgba(196,242,222,0)");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.moveTo(W * 0.34, 0);
      ctx!.lineTo(W * 0.66, 0);
      ctx!.lineTo(W * 0.86, H * 0.9);
      ctx!.lineTo(W * 0.14, H * 0.9);
      ctx!.closePath();
      ctx!.fill();

      const P = live.current.dev;
      const baseX = W * 0.5, baseY = H * 0.9;
      const axis = macroSite!.axisLen;
      const jig = Math.min(3, Math.abs(phys.bud.av) * 7);

      ctx!.save();
      ctx!.translate(baseX, baseY);
      ctx!.rotate(phys.bud.ao + (motionOK ? Math.sin(tt * 0.8) * 0.008 : 0));

      // ---- framing fan leaves behind the cola (precomputed; kept green; they
      // frame the bud as the reference photo's sugar/fan leaves do).
      ctx!.save();
      ctx!.globalAlpha = 0.92;
      for (const lf of macroLeaves) {
        ctx!.save();
        ctx!.translate(lf.lx, lf.ly);
        ctx!.rotate(lf.rot);
        drawFan(lf.lsz, Math.min(S.leafletMax, 7), 0.2, 0);
        ctx!.restore();
      }
      ctx!.restore();

      // ---- stalk below the cola ----
      ctx!.strokeStyle = `hsl(${S.hue - 12}, 34%, 28%)`;
      ctx!.lineWidth = Math.max(4, macroSite!.baseW * 0.08);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(0, H * 0.06);
      ctx!.lineTo(0, 0);
      ctx!.stroke();

      // ---- the cola itself ----
      drawFlowerSite(macroSite!, P, jig, tt);
      ctx!.restore();

      // ---- frost bloom: a soft additive glow over the cola once trichomes
      // mature, giving the whole bud that sugary, light-catching shimmer.
      if (P.trich > 0.25) {
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        const gg = ctx!.createRadialGradient(baseX, baseY - axis * 0.5, axis * 0.08, baseX, baseY - axis * 0.5, axis * 0.72);
        gg.addColorStop(0, `rgba(222,242,246,${0.05 + P.trich * 0.06})`);
        gg.addColorStop(1, "rgba(222,242,246,0)");
        ctx!.fillStyle = gg;
        ctx!.fillRect(0, 0, W, H);
        ctx!.restore();
      }
    }

    function drawDust() {
      for (const dd of dust) {
        ctx!.globalAlpha = clamp(dd.life / dd.max, 0, 1) * 0.85;
        ctx!.fillStyle = dd.gold ? "rgb(233,220,168)" : "rgb(168,214,176)";
        ctx!.beginPath();
        ctx!.arc(dd.x, dd.y, dd.r, 0, TAU);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function draw(tt: number) {
      ctx!.clearRect(0, 0, W, H);
      if (view === "macro") drawMacro(tt);
      else {
        drawChamberShell(tt);
        drawPlant(tt);
      }
      drawDust();
    }

    function fit() {
      const r = wrap!.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height || 480;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildScene();
      buildPlant();
      buildMacro();
    }

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    // pointer brush
    function onDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      ptr.active = true;
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
      ptr.vx = 0;
      ptr.lastT = performance.now();
      try {
        canvas!.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    function onMove(e: PointerEvent) {
      if (!ptr.active) return;
      const rect = canvas!.getBoundingClientRect();
      const now = performance.now();
      const nx = e.clientX - rect.left, ny = e.clientY - rect.top;
      const dts = Math.max(0.004, (now - ptr.lastT) / 1000);
      ptr.vx = lerp(ptr.vx, clamp((nx - ptr.x) / dts, -2600, 2600), 0.55);
      ptr.x = nx;
      ptr.y = ny;
      ptr.lastT = now;
    }
    function onUp() {
      ptr.active = false;
    }

    let raf = 0;
    let last = 0;
    if (motionOK) {
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      const loop = (t: number) => {
        const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
        if (t - last >= 33) {
          last = t;
          stepPhysics(dt);
          draw(t / 1000);
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);

  return (
    <div ref={wrapRef} className={`canvas-dark relative h-full w-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block touch-none" />
    </div>
  );
}
