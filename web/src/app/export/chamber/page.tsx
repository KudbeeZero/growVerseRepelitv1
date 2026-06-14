"use client";

// Offline export target for the canonical stage-PNG generator (PR #29). Renders a
// SINGLE GrowChamber still at a fixed canvas size from canonical strain DNA — no
// API, no auth, no live plant. The generator (web/scripts/export-stage-pngs.mjs)
// drives Chromium under prefers-reduced-motion (→ GrowChamber draws one static
// frame) to each ?strain=<slug>&stage=<stage> URL, waits for window.__chamberReady,
// then reads the canvas via toDataURL. See knowledge/stage-png-generation.md.
//
// The fixed 768×1024 wrapper gives every still identical framing/camera/pod
// position for clean side-by-side comparison. toDataURL captures the canvas
// backing store directly, so any surrounding app chrome is irrelevant.

import { useEffect, useState } from "react";
import { GrowChamber } from "@/components/viz/GrowChamber";
import {
  LAUNCH_STRAINS,
  CANONICAL_STAGES,
  resolveChamberProps,
  type CanonicalStage,
} from "@/lib/chamber/canonicalStages";

// Canonical export canvas size (CSS px). The generator's deviceScaleFactor scales
// the backing store up for crisp output (e.g. ×2 → 1536×2048). Kept local — Next
// App Router page modules may not export arbitrary named values.
const EXPORT_W = 768;
const EXPORT_H = 1024;

declare global {
  interface Window {
    __chamberReady?: boolean;
  }
}

export default function ChamberExportPage() {
  const [params, setParams] = useState<{ strain: string; stage: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setParams({ strain: q.get("strain") ?? "g13", stage: q.get("stage") ?? "harvest-ready" });
  }, []);

  if (!params) return null;

  const strain = LAUNCH_STRAINS.find((s) => s.slug === params.strain);
  const stage = (CANONICAL_STAGES as readonly string[]).includes(params.stage)
    ? (params.stage as CanonicalStage)
    : null;

  if (!strain || !stage) {
    return (
      <div style={{ padding: 16, fontFamily: "monospace", color: "#cfeeff" }}>
        Unknown strain/stage: {params.strain} / {params.stage}
        <br />
        strains: {LAUNCH_STRAINS.map((s) => s.slug).join(", ")}
        <br />
        stages: {CANONICAL_STAGES.join(", ")}
      </div>
    );
  }

  return <ChamberStill strainSlug={strain.slug} stage={stage} />;
}

function ChamberStill({ strainSlug, stage }: { strainSlug: string; stage: CanonicalStage }) {
  const strain = LAUNCH_STRAINS.find((s) => s.slug === strainSlug)!;
  const props = resolveChamberProps(strain, stage);

  // Signal the generator once the chamber has mounted and painted its static
  // frame. GrowChamber's effect (child) runs before this (parent) effect, so the
  // canvas is already drawn; two rAFs ensure the frame is committed to the canvas.
  useEffect(() => {
    window.__chamberReady = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.__chamberReady = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050b12",
        zIndex: 9999,
      }}
    >
      <div
        data-export-canvas-wrap
        style={{ width: EXPORT_W, height: EXPORT_H, flex: "none", position: "relative" }}
      >
        <GrowChamber
          key={`${strainSlug}-${stage}`}
          seed={props.seed}
          day={props.day}
          stage={props.stage}
          morphology={props.morphology}
          silhouette={props.silhouette}
          dev={props.dev}
          climate={props.climate}
          conditionFlags={props.conditionFlags}
          budColor={props.budColor}
          budDna={props.budDna}
          view="chamber"
        />
      </div>
    </div>
  );
}
