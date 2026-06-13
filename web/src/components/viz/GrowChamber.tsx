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
  type Silhouette,
} from "@/lib/chamber/morphology";
import { CONDITION_VISUALS, SEVERITY_SCALE, dominantFlag } from "@/lib/conditionVisuals";
import { pickPaletteColor, dominantPaletteColor, type BudDNA } from "@/lib/chamber/budDna";

export type ChamberView = "chamber" | "macro";

interface Props {
  seed: number;
  day: number;
  stage: GrowthStage;
  morphology: Morphology;
  /** Per-strain whole-plant skeleton shape (node density, spread, cola mass). */
  silhouette: Silhouette;
  dev: DevParams;
  climate: ClimateInput;
  conditionFlags: ConditionFlag[];
  view: ChamberView;
  /** Per-strain calyx/pistil colouring (green→amber ↔ anthocyanin purple). */
  budColor: BudColor;
  /** Per-strain macro bud measurements + palette (drives the Detailed Bud View). */
  budDna: BudDNA;
  className?: string;
}

interface LiveState {
  climate: ClimateInput;
  dev: DevParams;
  flags: ConditionFlag[];
  budColor: BudColor;
  budDna: BudDNA;
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

// Macro ("Detailed Bud View") cola: a dense stack of small, overlapping calyxes
// arranged in layered rows around a central spine, rather than a few large
// teardrops. Painter's-algorithm depth (0 back → 1 front) gives the cola volume.
// shape: 0 teardrop · 1 oval · 2 pointed bract · 3 foxtail
interface MacroCalyx {
  x: number; y: number; w: number; h: number; rot: number;
  depth: number; hue: number; sat: number; lit: number; shape: number; phase: number;
}
interface MacroPistil { x: number; y: number; a: number; len: number; bend: number; k: number }
interface MacroTrich { x: number; y: number; r: number; k: number; mat: number; depth: number }
interface MacroLeaf { x: number; y: number; sz: number; rot: number }
interface MacroBud {
  centerX: number; baseY: number; topY: number; budH: number; budW: number;
  coreHue: number; coreSat: number;
  calyxes: MacroCalyx[]; pistils: MacroPistil[]; trichs: MacroTrich[]; sugar: MacroLeaf[];
}

export function GrowChamber({
  seed,
  day,
  stage,
  morphology,
  silhouette,
  dev,
  climate,
  conditionFlags,
  view,
  budColor,
  budDna,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fast-changing inputs read each frame (no geometry rebuild on slider moves).
  const live = useRef<LiveState>({ climate, dev, flags: conditionFlags, budColor, budDna });
  live.current = { climate, dev, flags: conditionFlags, budColor, budDna };

  // Rebuild geometry only when these structural inputs change.
  // Macro geometry ignores `day` (buildMacro is seeded only by `seed`), so omit
  // it there — otherwise scrubbing the growth slider would rebuild identical
  // geometry on every integer-day step.
  const dayKey = view === "macro" ? "" : Math.round(day);
  // Macro geometry depends on the (env-modified) bud DNA; fold a coarse signature
  // in so the cola rebuilds when grow conditions shift it, but not every frame.
  const dnaKey =
    view === "macro"
      ? [
          budDna.maxBudWidth.toFixed(0),
          budDna.calyxSizeMax.toFixed(1),
          budDna.overlap.toFixed(2),
          budDna.trichomeDensity.toFixed(2),
          (budDna.foxtailBias ?? 0).toFixed(2),
          (budDna.topStretch ?? 0).toFixed(2),
          // palette colour signature so drought-darkening / cool-night purple and
          // different strains with equal palette length each trigger a rebuild.
          budDna.palette.map((p) => `${p.hue | 0}:${p.lit | 0}`).join(","),
        ].join("|")
      : "";
  // Silhouette signature (chamber skeleton shape) folds into the rebuild key so a
  // strain's node density / spread / cola mass rebuilds the plant, not every frame.
  const silKey = `${silhouette.nodeDensity.toFixed(2)}|${silhouette.vertStack.toFixed(2)}|${silhouette.branchletFrac.toFixed(2)}|${silhouette.lowerSpread.toFixed(2)}|${silhouette.upperShorten.toFixed(2)}|${silhouette.colaScale.toFixed(2)}|${silhouette.nodeLeaf.toFixed(2)}`;
  const buildKey = `${seed}|${stage}|${view}|${dayKey}|${dnaKey}|${silKey}|${morphology.pattern}|${morphology.hue.toFixed(1)}|${morphology.heightMul.toFixed(2)}|${morphology.clusterLen.toFixed(2)}`;

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
    const SK = silhouette;
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
    // Calyx body by sprite type: 0 teardrop · 1 oval · 2 pointed bract · 3 foxtail.
    function calyxPath(shape: number, w: number, h: number) {
      if (shape === 1) {
        ctx!.beginPath();
        ctx!.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, TAU);
        return;
      }
      if (shape === 2) {
        // pointed bract — sharper tip
        ctx!.beginPath();
        ctx!.moveTo(0, h * 0.5);
        ctx!.bezierCurveTo(-w * 0.8, h * 0.25, -w * 0.5, -h * 0.5, 0, -h * 0.72);
        ctx!.bezierCurveTo(w * 0.5, -h * 0.5, w * 0.8, h * 0.25, 0, h * 0.5);
        ctx!.closePath();
        return;
      }
      podPath(w, h); // teardrop (0) and foxtail (3, already elongated via h)
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
    // A secondary branchlet sprouting off a main branch — carries its own small
    // leaf cluster and (in flower) a small bud at its tip. This is the biggest
    // "fullness" lever: it breaks the one-branch-per-node diagram look.
    interface Branchlet {
      along: number; // 0..1 position along the parent branch
      side: number; // +1/-1 which way it forks off
      len: number; tilt: number; curve: number;
      leafSize: number; leaflets: number; phase: number;
      site: FlowerSite | null; // small bud at the branchlet tip
    }
    interface Node {
      x: number; y: number; f: number; side: number; tilt: number; len: number;
      leafSize: number; leaflets: number; phase: number; tipX: number; tipY: number;
      site: FlowerSite | null; budRot: number;
      curve: number; // branch upward bend (bezier), 0.1–0.4
      weight: number; // bud load on this branch → how much it droops
      spread: number; // lateral reach multiplier (wide skirt low, tucked up top)
      branchlets: Branchlet[]; // secondary forks
      nodeLeafSize: number; // leaf cluster hugging the stem at this node
      nodeBud: FlowerSite | null; // bud forming at the node intersection (upper)
    }
    interface Plant {
      P: DevParams; CL: ReturnType<typeof climateModel>; stage: string;
      cx: number; baseY: number; A: number; stemH: number;
      spine: Array<{ x: number; y: number; t: number }>; nodes: Node[];
      cola: { site: FlowerSite; x: number; y: number } | null;
    }
    let scene: Scene | null = null;
    let plant: Plant | null = null;
    let macroBud: MacroBud | null = null;
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

      // Stretch animation: the flowering stretch ramps over ~4 weeks (not a few
      // days), driven by the strain's stretchFactor (S.stretch) — sativas explode
      // upward, indicas barely move. Animates as `day` advances.
      let hN: number;
      if (d <= 10) hN = lerp(0.05, 0.13, smooth(d / 10));
      else if (d <= 34) hN = lerp(0.13, 0.55, Math.pow((d - 10) / 24, 0.75));
      else hN = lerp(0.55, clamp(0.6 * S.stretch, 0, 0.97), smooth(clamp((d - 34) / 28, 0, 1)));
      hN = clamp(hN * S.heightMul * (0.85 + 0.15 * CL.growthMult), 0.05, 0.97);
      const stemH = A * hN;

      // Main stem: tapered (drawn thick→thin) with gentle noise so it isn't a
      // straight line.
      const wob1 = (rnd() - 0.5) * stemH * 0.15, wob2 = (rnd() - 0.5) * stemH * 0.09;
      const spine = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const segNoise = (rnd() - 0.5) * stemH * 0.012; // small per-segment kink
        spine.push({ x: cx + wob1 * Math.sin(Math.PI * t) + wob2 * Math.sin(TAU * t) * 0.5 + segNoise * Math.sin(t * 9), y: baseY - stemH * t, t });
      }

      const nodes: Node[] = [];
      const flowering = stageOf() === "flowering" || stageOf() === "harvest";
      // Node density: the strain silhouette sets the canopy fill, and flowering
      // packs a few more nodes in to close the gaps the bare skeleton left.
      const flowerPack = flowering ? 1.18 : 1;
      const nodeTarget = Math.floor((hN / S.internode) * SK.nodeDensity * SK.vertStack * flowerPack);
      const maxNodes = Math.min(18, Math.max(d <= 10 ? 1 : 2, nodeTarget));
      const grow = smooth(clamp((d - 8) / 22, 0, 1));
      // Branches flex more when they're longer/thinner (lower branchMul).
      const branchFlex = clamp(1.25 - S.branchMul * 0.5, 0.45, 1.05);
      for (let i = 0; i < maxNodes; i++) {
        // Genetic/organic internode spacing: tighter toward the apex (more so for
        // spear strains, via vertStack), plus per-node jitter so nodes aren't
        // perfectly even (real plants vary).
        const fBase = (i + 1) / (maxNodes + 1);
        const stackExp = lerp(1.0, 1.22, clamp(SK.vertStack - 0.96, 0, 0.3) / 0.3);
        const f = clamp(Math.pow(fBase, stackExp) + (rnd() - 0.5) * 0.045, 0.04, 0.96);
        const p = spine[Math.round(f * 24)];
        const low = Math.pow(1 - f, 0.75); // 1 at the base → 0 at the apex
        // Lower branches splay wide (skirt); upper branches tuck in and shorten.
        const spread = lerp(1, SK.lowerSpread, low);
        const shorten = 1 - SK.upperShorten * f;
        const side = i % 2 ? 1 : -1;
        const tilt = (0.92 + rnd() * 0.3) * (1 - f * 0.22) * lerp(1, 1.12, low);
        const len = A * 0.27 * S.branchMul * (0.35 + 0.65 * low) * grow * shorten;
        const nd: Node = {
          x: p.x, y: p.y, f, side, tilt, len, spread,
          leafSize: A * (0.08 + 0.05 * low) * (0.55 + 0.45 * grow) * (1 - 0.4 * P.budDev * f),
          leaflets: Math.min(S.leafletMax, 3 + 2 * Math.floor(d / 14)),
          phase: rnd() * TAU,
          tipX: 0, tipY: 0, site: null, budRot: 0,
          curve: 0.14 + rnd() * 0.22, // upward bend
          weight: 0,
          branchlets: [],
          nodeLeafSize: A * (0.05 + 0.04 * low) * (0.55 + 0.45 * grow) * SK.nodeLeaf * (1 - 0.35 * P.budDev * f),
          nodeBud: null,
        };
        nd.tipX = Math.sin(nd.tilt) * nd.side * nd.len * spread;
        nd.tipY = -Math.cos(nd.tilt) * nd.len * 0.55;
        if (P.budDev > 0 && f > S.flowerFrom) {
          const sizeUp = lerp(0.55, 1.15, f);
          const axis = A * (0.05 + 0.09 * f) * S.clusterLen * sizeUp * (0.5 + 0.5 * P.budDev);
          const baseW = axis * 0.42 * S.clusterFat;
          const nC = Math.max(2, Math.round(S.bracts * 0.55 * (0.6 + 0.5 * f)));
          nd.site = buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 1 });
          nd.budRot = nd.side * 0.1;
          nd.weight = lerp(0.5, 1.1, f) * S.clusterFat; // higher / fatter buds weigh more
        }
        // A bud forming at the node intersection itself (not just the tip) —
        // upper/mid nodes only, where light reaches and flower sites set.
        if (P.budDev > 0 && f > Math.max(S.flowerFrom, 0.38)) {
          const axis = A * (0.035 + 0.05 * f) * S.clusterLen * (0.5 + 0.5 * P.budDev);
          const baseW = axis * 0.4 * S.clusterFat;
          const nC = Math.max(1, Math.round(S.bracts * 0.4 * f));
          nd.nodeBud = buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 0.9, lush: 0.7 });
          nd.weight += 0.25 * S.clusterFat;
        }
        // Secondary branchlets — small forks carrying their own foliage and, in
        // flower, a small bud at the tip. Denser on the lower/mid canopy.
        if (nd.len > A * 0.045 && d > 14) {
          let nBL = rnd() < SK.branchletFrac ? 1 : 0;
          if (low > 0.45 && rnd() < SK.branchletFrac * 0.75) nBL += 1;
          for (let b = 0; b < nBL; b++) {
            const along = 0.48 + rnd() * 0.34;
            let blSite: FlowerSite | null = null;
            if (P.budDev > 0 && f > S.flowerFrom * 0.8) {
              const axis = A * 0.04 * S.clusterLen * (0.5 + 0.5 * P.budDev);
              const baseW = axis * 0.4 * S.clusterFat;
              blSite = buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: 1, bracts: Math.max(5, Math.round(S.bracts * 0.7)), fatMul: 0.85, lush: 0.55 });
              nd.weight += 0.2 * S.clusterFat;
            }
            nd.branchlets.push({
              along, side: b % 2 ? 1 : -1,
              len: nd.len * (0.4 + rnd() * 0.26), tilt: 0.55 + rnd() * 0.5, curve: 0.1 + rnd() * 0.2,
              leafSize: nd.leafSize * (0.42 + rnd() * 0.16), leaflets: Math.max(3, nd.leaflets - 2),
              phase: rnd() * TAU, site: blSite,
            });
          }
        }
        nodes.push(nd);
      }

      let cola: Plant["cola"] = null;
      if (P.budDev > 0) {
        // Top cola gains mass through flowering and swells further in late flower
        // (ripeness) — the apex should be the visual climax, not a tidy spike.
        const lateMass = 1 + P.ripe * 0.2;
        const axis = stemH * (0.15 + 0.18 * P.budDev) * S.clusterLen * SK.colaScale * lateMass;
        const baseW = axis * (S.pattern === "spiral" ? 0.3 : 0.46) * S.clusterFat * (0.95 + 0.18 * P.ripe);
        const nC = Math.round(S.bracts * (S.pattern === "spiral" ? 1.7 : 1.15));
        cola = {
          site: buildFlowerSite(rnd, axis, baseW, { pattern: S.pattern, nClusters: nC, bracts: S.bracts, fatMul: 1.1 }),
          x: spine[24].x, y: spine[24].y + axis * 0.06,
        };
      }

      plant = { P, CL, stage: stageOf(), cx, baseY, A, stemH, spine, nodes, cola };
      while (phys.nodes.length < nodes.length) phys.nodes.push({ ao: 0, av: 0 });
      phys.nodes.length = nodes.length;
    }

    function buildMacro() {
      const rnd = mulberry32(seed * 5077 + 7);
      const rr = (a: number, b: number) => a + (b - a) * rnd();
      const dna = live.current.budDna;
      const foxtail = clamp(S.foxtail ?? 0, 0, 1);

      // DNA dimensions are in abstract units; scale so budHeight maps to ~0.6·H.
      // The maxBudWidth/budHeight ratio is what distinguishes a chunky indica
      // cola from a slim sativa one across strains.
      const scale = (H * 0.6) / dna.budHeight;
      const budH = dna.budHeight * scale;
      const budW = dna.maxBudWidth * scale;
      const centerX = W * 0.5;
      const baseY = H * 0.9;
      const topY = baseY - budH;
      const sizeMul = lerp(1.0, 1.28, clamp((dna.overlap - 0.6) / 0.15, 0, 1));

      // ---- Concentric ring packing (botanical bracts, NOT independent blobs) ----
      // Calyxes are packed in rings around the cola spine. Each ring is offset half
      // a step from the previous so calyxes nest in the gaps (pinecone / sunflower /
      // dragon-scale packing). Ring radius follows the sin silhouette (narrow top,
      // wide centre, tapered base) and the count peaks in the middle (e.g. 1·3·5·8·5·3).
      // Depth comes from the ring angle, so calyxes wrap front↔back for real volume.
      // Organic noise (±8° angle, ±6% radius, ±25° rotation, ±15% scale) avoids any
      // perfect spacing or symmetry.
      const ratio = dna.maxBudWidth / dna.budHeight;
      const fatT = clamp((ratio - 0.44) / 0.19, 0, 1);
      const widthExp = lerp(1.0, 1.3, fatT); // chunkier strains carry mass lower
      const nRings = Math.round(dna.rows * 1.25);
      const ANG_NOISE = 8 * (Math.PI / 180);

      const calyxes: MacroCalyx[] = [];
      const pistils: MacroPistil[] = [];
      const sugar: MacroLeaf[] = [];
      for (let ring = 0; ring < nRings; ring++) {
        const progress = nRings === 1 ? 0.5 : ring / (nRings - 1); // 0 top → 1 bottom
        const y = topY + progress * budH;
        const widthCurve = Math.sin(Math.pow(progress, widthExp) * Math.PI);
        const ringRadius = (widthCurve * budW) / 2;
        const count = Math.max(1, Math.round(widthCurve * dna.calyxPerRowMax)); // 1 → max → 1
        const angleStep = TAU / count;
        // Ring offset = golden-angle twist per ring (137.5°, so rings never column
        // up — pinecone/sunflower phyllotaxy) + a half-step brick nest so each
        // calyx sits in the previous ring's gap.
        const ringOffset = ring * 2.39996323 + (ring % 2) * angleStep * 0.5;
        const topness = clamp((0.4 - progress) / 0.4, 0, 1);
        const foxBias = dna.foxtailBias ?? 0;
        const topStretch = dna.topStretch ?? 0;
        for (let i = 0; i < count; i++) {
          const angle = i * angleStep + ringOffset + rr(-ANG_NOISE, ANG_NOISE); // ±8°
          const radius = ringRadius * (1 + rr(-0.06, 0.06)); // ±6%
          const x = centerX + Math.cos(angle) * radius;
          const depth = clamp((Math.sin(angle) + 1) / 2, 0, 1); // back(0) → front(1)
          const sizePx = rr(dna.calyxSizeMin, dna.calyxSizeMax) * lerp(0.78, 1.15, widthCurve) * sizeMul * (1 + rr(-0.15, 0.15)); // ±15%
          let w = sizePx * scale;
          // Shape mix (§5): teardrop 40 / oval 25 / pointed 20 / foxtail 15; env
          // light-stress pushes pointed/foxtail near the top. Height > width.
          const sr = rnd();
          const foxCut = 0.85 - foxtail * 0.2 - foxBias * 0.22 - topness * topStretch * 0.15;
          const ovalCut = Math.min(0.65 - topness * topStretch * 0.2, foxCut - 0.04);
          let shape: number, h: number;
          if (sr < 0.4) { shape = 0; h = w * rr(1.25, 1.5); }
          else if (sr < ovalCut) { shape = 1; h = w * rr(1.2, 1.35); }
          else if (sr < foxCut) { shape = 2; h = w * rr(1.5, 1.8); }
          else { shape = 3; w *= 0.78; h = w * rr(2.0, 2.5); }
          if (topStretch > 0) h *= 1 + topness * topStretch * 0.6;
          const col = pickPaletteColor(dna.palette, rnd());
          calyxes.push({
            x, y: y + rr(-3, 3) * scale, w, h,
            rot: rr(-25, 25) * (Math.PI / 180) * (1 + topness * topStretch * 0.7), // ±25°
            depth,
            hue: col.hue + rr(-8, 8), sat: col.sat, lit: col.lit + rr(-6, 6),
            shape, phase: rnd(),
          });
          if (rnd() < dna.pistilChance) {
            pistils.push({
              x, y: y + rr(-3, 3) * scale, a: -Math.PI / 2 + rr(-0.95, 0.95),
              len: 0.5 + rnd() * 0.6, bend: rr(-1.1, 1.1), k: rnd() * 0.85,
            });
          }
          if (rnd() < dna.sugarLeafChance) {
            sugar.push({ x, y, sz: budH * (0.08 + 0.05 * widthCurve) * rr(0.85, 1.2), rot: rr(-0.95, 0.95) });
          }
        }
      }
      calyxes.sort((a, b) => a.depth - b.depth); // back → front

      // Trichomes — fine frost anchored to a calyx so it reveals with its host
      // (not floating), scaled by the strain's density.
      const trichs: MacroTrich[] = [];
      const nT = Math.round(calyxes.length * dna.trichomeDensity * 2.4);
      for (let i = 0; i < nT; i++) {
        const c = calyxes[Math.floor(rnd() * calyxes.length)];
        trichs.push({
          x: c.x + rr(-1, 1) * c.w * 0.5,
          y: c.y + rr(-1, 1) * c.h * 0.4,
          r: 0.5 + rnd() * 0.9, k: rnd(), mat: rnd(), depth: c.depth,
        });
      }
      const core = dominantPaletteColor(dna.palette);
      macroBud = { centerX, baseY, topY, budH, budW, coreHue: core.hue, coreSat: core.sat, calyxes, pistils, trichs, sugar };

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
          lx: side * budW * (0.7 + lrnd() * 0.4),
          ly: -yf * budH,
          lsz: budH * (0.34 - 0.16 * yf) * (0.9 + lrnd() * 0.3),
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
      const bd = clamp(live.current.dev.budDev, 0, 1);
      const branchFlex = clamp(1.25 - S.branchMul * 0.5, 0.45, 1.05);
      for (let i = 0; i < p.nodes.length; i++) {
        const nd = p.nodes[i];
        // Airflow WAVE (not random wiggle): the top leads and lower nodes lag, with
        // bigger amplitude up top — a travelling wave, ~3° max.
        const amp = CL.windAmp * (0.8 + nd.f * 1.2) * branchFlex;
        const sway = motionOK ? Math.sin(tt * 1.6 - (1 - nd.f) * 1.3) * amp + wind * (0.4 + nd.f * 0.6) : 0;
        const spring = phys.nodes[i] ? phys.nodes[i].ao : 0;
        const jig = Math.min(3, Math.abs(phys.nodes[i] ? phys.nodes[i].av : 0) * 7);
        // Bud-weight droop: the branch tip sags as buds fill in (live budDev).
        const droopRot = clamp(nd.weight * branchFlex * bd * 0.5, 0, 0.45);
        const sag = Math.sin(droopRot) * nd.len * 0.65;
        const endX = nd.tipX, endY = nd.tipY + sag;
        ctx!.save();
        ctx!.translate(nd.x, nd.y);
        ctx!.rotate(sway + spring + nd.side * condClaw * 0.4);
        ctx!.strokeStyle = `hsl(${S.hue - 10}, 32%, 30%)`;
        ctx!.lineWidth = clamp(sw0 * 0.5 * (1 - nd.f * 0.4), 1, 4);
        ctx!.lineCap = "round";
        // Curved branch: arcs upward (nd.curve) then sags at the tip under weight.
        ctx!.beginPath();
        ctx!.moveTo(0, 0);
        ctx!.bezierCurveTo(
          nd.tipX * 0.35, nd.tipY * 0.4 - nd.len * nd.curve,
          nd.tipX * 0.72, nd.tipY * 0.7 - nd.len * nd.curve * 0.4 + sag * 0.5,
          endX, endY,
        );
        ctx!.stroke();
        ctx!.save();
        ctx!.translate(endX, endY);
        ctx!.rotate(nd.side * (0.5 + nd.tilt * 0.18));
        drawFan(nd.leafSize, nd.leaflets, nd.f, claw);
        ctx!.restore();
        // Leaf cluster hugging the stem at the node — every node carries foliage,
        // not just the branch tip, so internodes don't read as bare gaps.
        for (const [ang, scl] of [[-nd.side * 0.32, 0.55], [-nd.side * 0.74, 0.36], [nd.side * 0.22, 0.3]] as const) {
          ctx!.save();
          ctx!.rotate(ang);
          drawFan(nd.nodeLeafSize * scl, Math.max(3, nd.leaflets - 2), 0, claw);
          ctx!.restore();
        }
        // Secondary branchlets — forks part-way along the branch (sharing the
        // branch's sway/droop), each with its own foliage and small tip bud.
        for (const bl of nd.branchlets) {
          const t = bl.along;
          // point on the branch's bezier at t≈along (linear path + its upward arc)
          const bx = endX * t;
          const by = endY * t - nd.len * nd.curve * Math.sin(Math.PI * t);
          const bex = Math.sin(bl.tilt) * nd.side * bl.len;
          const bey = -Math.cos(bl.tilt) * bl.len * 0.5 + sag * 0.25;
          ctx!.save();
          ctx!.translate(bx, by);
          ctx!.strokeStyle = `hsl(${S.hue - 8}, 30%, 32%)`;
          ctx!.lineWidth = clamp(sw0 * 0.32 * (1 - nd.f * 0.4), 0.8, 2.4);
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(0, 0);
          ctx!.quadraticCurveTo(bex * 0.5, bey * 0.5 - bl.len * bl.curve, bex, bey);
          ctx!.stroke();
          ctx!.save();
          ctx!.translate(bex, bey);
          ctx!.rotate(bl.side * (0.4 + bl.tilt * 0.2));
          drawFan(bl.leafSize, bl.leaflets, nd.f, claw);
          ctx!.restore();
          if (bl.site) {
            ctx!.save();
            ctx!.translate(bex, bey);
            ctx!.rotate(nd.side * 0.12 + nd.side * droopRot * 0.4);
            drawFlowerSite(bl.site, p.P, jig, tt);
            ctx!.restore();
          }
          ctx!.restore();
        }
        // Bud forming at the node intersection itself (upper/mid nodes).
        if (nd.nodeBud) {
          ctx!.save();
          ctx!.translate(0, -2);
          ctx!.rotate(-nd.side * 0.12);
          drawFlowerSite(nd.nodeBud, p.P, jig, tt);
          ctx!.restore();
        }
        // Bud at the branch tip.
        if (nd.site) {
          ctx!.save();
          ctx!.translate(endX * 0.85, endY * 0.85);
          ctx!.rotate(nd.budRot + nd.side * droopRot * 0.5); // bud nods down with weight
          drawFlowerSite(nd.site, p.P, jig, tt);
          ctx!.restore();
        }
        ctx!.restore();
      }
      const top = p.spine[24];
      const swayT = motionOK ? Math.sin(tt * 1.5) * CL.windAmp * 2.2 + wind : 0;
      if (p.cola) {
        const cjig = Math.min(3, Math.abs(phys.cola.av) * 7);
        // Heavy top cola leans slightly with bud weight (consistent direction).
        const leanDir = Math.sign(top.x - p.cx) || 1;
        const colaDroop = clamp(bd * 0.16, 0, 0.16) * leanDir;
        ctx!.save();
        ctx!.translate(p.cola.x, p.cola.y);
        ctx!.rotate(phys.cola.ao + swayT + colaDroop);
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
      const bc = live.current.budColor;
      const bud = macroBud!;
      const baseX = bud.centerX, baseY = bud.baseY;
      const budH = bud.budH, budW = bud.budW;

      ctx!.save();
      ctx!.translate(baseX, baseY);
      ctx!.rotate(phys.bud.ao + (motionOK ? Math.sin(tt * 0.8) * 0.008 : 0));
      // Everything below is drawn relative to the bud base (0,0).

      // ---- framing fan leaves behind the cola (precomputed; kept green).
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
      ctx!.strokeStyle = `hsl(${S.hue - 12}, 34%, 26%)`;
      ctx!.lineWidth = Math.max(4, budW * 0.12);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(0, H * 0.06);
      ctx!.lineTo(0, -budH * 0.04);
      ctx!.stroke();

      // ---- dark cola core (palette-derived so it tracks env purple shift) ----
      ctx!.fillStyle = `hsl(${bud.coreHue}, ${bud.coreSat}%, 16%)`;
      ctx!.beginPath();
      ctx!.ellipse(0, -budH * 0.5, budW * 0.46, budH * 0.5, 0, 0, TAU);
      ctx!.fill();

      // ---- calyxes: pointed, ribbed, fuzzy teardrops, layered; sugar leaves
      // woven between back and front to break up the silhouette ----
      const grow = clamp(P.budDev, 0, 1);
      const hb = live.current.budDna.highlightBoost ?? 0;
      const drawCalyx = (c: MacroCalyx) => {
        if (grow < 0.04 + c.depth * 0.35) return; // fill in as the bud develops
        const lit = clamp(c.lit + (c.depth - 0.6) * 18 + P.ripe * 2, 10, 82);
        const sc = 0.6 + 0.4 * grow;
        const w = c.w * sc, h = c.h * sc;
        const detail = w > 4.5 && c.depth > 0.55; // ribs/speckles only where they read
        ctx!.save();
        ctx!.globalAlpha = lerp(0.78, 1, c.depth);
        ctx!.translate(c.x - baseX, c.y - baseY);
        ctx!.rotate(c.rot);
        // body
        ctx!.fillStyle = `hsl(${c.hue}, ${c.sat}%, ${lit}%)`;
        calyxPath(c.shape, w, h);
        ctx!.fill();
        // outer-rim edge shadow → reads as overlap / ambient occlusion
        ctx!.strokeStyle = `hsla(${c.hue}, ${c.sat}%, ${Math.max(6, lit - 24)}%, 0.5)`;
        ctx!.lineWidth = Math.max(0.5, w * 0.05);
        ctx!.stroke();
        if (detail) {
          ctx!.lineCap = "round";
          // center seam/vein up to the tip
          ctx!.strokeStyle = `hsla(${c.hue}, ${c.sat}%, ${Math.max(8, lit - 14)}%, 0.5)`;
          ctx!.lineWidth = Math.max(0.4, w * 0.035);
          ctx!.beginPath();
          ctx!.moveTo(0, h * 0.42);
          ctx!.lineTo(0, -h * 0.46);
          ctx!.stroke();
          // side ridges (vertebrae), mirrored
          ctx!.lineWidth = Math.max(0.35, w * 0.025);
          for (const s of [-1, 1]) {
            for (let r = 1; r <= 2; r++) {
              const sx = s * (r / 3) * w * 0.42;
              ctx!.beginPath();
              ctx!.moveTo(0, h * 0.34);
              ctx!.quadraticCurveTo(sx, -h * 0.02, sx * 0.45, -h * 0.42);
              ctx!.stroke();
            }
          }
          // surface speckles (deterministic from the calyx's own phase)
          ctx!.fillStyle = `hsla(${c.hue}, ${c.sat}%, ${Math.max(8, lit - 18)}%, 0.4)`;
          for (let s = 0; s < 4; s++) {
            const px = (((c.phase * 9.7 + s * 2.3) % 1) - 0.5) * w * 0.5;
            const py = (((c.phase * 5.3 + s * 1.7) % 1) - 0.5) * h * 0.6;
            ctx!.beginPath();
            ctx!.arc(px, py, Math.max(0.3, w * 0.03), 0, TAU);
            ctx!.fill();
          }
        }
        // highlight: a thin sliver along the upper ridge (not a flat circle)
        if (c.depth > 0.5) {
          ctx!.strokeStyle = `hsla(${c.hue}, ${c.sat}%, ${Math.min(92, lit + 22 + hb * 12)}%, ${0.4 + hb * 0.2})`;
          ctx!.lineWidth = Math.max(0.5, w * 0.05);
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.moveTo(-w * 0.1, h * 0.12);
          ctx!.quadraticCurveTo(-w * 0.16, -h * 0.28, 0, -h * 0.45);
          ctx!.stroke();
        }
        // micro-fuzz hairs around the tip on front calyxes
        if (detail && c.depth > 0.78) {
          ctx!.strokeStyle = `hsla(${c.hue}, ${Math.max(0, c.sat - 12)}%, ${Math.min(92, lit + 26)}%, 0.3)`;
          ctx!.lineWidth = 0.4;
          for (let f = 0; f < 4; f++) {
            const ang = -Math.PI / 2 + (f - 1.5) * 0.5;
            const ox = Math.cos(ang) * w * 0.3, oy = -h * 0.4 + Math.sin(ang) * h * 0.12;
            ctx!.beginPath();
            ctx!.moveTo(ox, oy);
            ctx!.lineTo(ox + Math.cos(ang) * w * 0.16, oy + Math.sin(ang) * w * 0.16);
            ctx!.stroke();
          }
        }
        ctx!.restore();
      };
      for (const c of bud.calyxes) if (c.depth < 0.55) drawCalyx(c); // back layer
      if (grow > 0.15) {
        for (const lf of bud.sugar) {
          ctx!.save();
          ctx!.translate(lf.x - baseX, lf.y - baseY);
          ctx!.rotate(lf.rot);
          drawFan(lf.sz * (0.6 + 0.4 * grow), 3, 0.3, 0);
          ctx!.restore();
        }
      }
      for (const c of bud.calyxes) if (c.depth >= 0.55) drawCalyx(c); // front layer
      ctx!.globalAlpha = 1;

      // ---- pistils: thin, curly, irregular, from between the calyxes ----
      if (grow > 0.1) {
        const fiber = pistilFiber(P.ripe, P.brown, bc.pistilMagenta);
        const ball = pistilBall(P.ripe, P.brown, bc.pistilMagenta);
        ctx!.lineWidth = Math.max(0.4, budW * 0.004);
        ctx!.lineCap = "round";
        for (const ps of bud.pistils) {
          if (ps.k > grow) continue;
          const L = budW * 0.2 * ps.len * clamp((grow - ps.k * 0.5) / 0.6, 0.4, 1);
          const x0 = ps.x - baseX, y0 = ps.y - baseY;
          const x1 = x0 + Math.cos(ps.a) * L, y1 = y0 + Math.sin(ps.a) * L;
          const mx = (x0 + x1) / 2 + ps.bend * (3 + P.ripe * 3); // stronger curl
          const my = (y0 + y1) / 2 - 3 - Math.abs(ps.bend) * 2;
          ctx!.strokeStyle = fiber;
          ctx!.beginPath();
          ctx!.moveTo(x0, y0);
          ctx!.quadraticCurveTo(mx, my, x1, y1);
          ctx!.stroke();
          ctx!.fillStyle = ball;
          ctx!.beginPath();
          ctx!.arc(x1, y1, Math.max(0.5, budW * 0.006), 0, TAU);
          ctx!.fill();
        }
      }

      // ---- trichome frost: soft additive specks that build into fuzzy frost
      // patches (revealed with their host calyx, never floating) ----
      if (P.trich > 0) {
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        for (const t of bud.trichs) {
          if (t.k > P.trich || grow < 0.04 + t.depth * 0.35) continue;
          const x = t.x - baseX, y = t.y - baseY;
          const mt = clamp(P.trich - t.mat * 0.4, 0, 1);
          ctx!.globalAlpha = 0.12 + 0.18 * mt;
          ctx!.fillStyle = mt > 0.85 ? "rgb(150,112,44)" : "rgb(224,238,236)";
          ctx!.beginPath();
          ctx!.arc(x, y, t.r * Math.max(0.8, budW * 0.014), 0, TAU);
          ctx!.fill();
        }
        ctx!.restore();
        ctx!.globalAlpha = 1;
      }
      ctx!.restore();

      // ---- frost bloom: a soft additive glow once trichomes mature ----
      if (P.trich > 0.25) {
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        const gy = baseY - budH * 0.5;
        const gg = ctx!.createRadialGradient(baseX, gy, budH * 0.06, baseX, gy, budH * 0.6);
        gg.addColorStop(0, `rgba(222,242,246,${0.04 + P.trich * 0.05})`);
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
