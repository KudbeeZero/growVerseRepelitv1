"use client";

// Stage reference system — renders each launch strain across the five canonical
// growth stages so the team can verify, at a glance, that the chamber view reads:
// strain identity (silhouette + colour), growth stage, and flowering progress.
// This is a committed visual-QA reference (the "stage progression stills"), not a
// player route. Drop real reference photos beside a row to art-direct the look.

import { GrowChamber } from "@/components/viz/GrowChamber";
import { morphologyFor, devParams, stageForDay, seedForPlant } from "@/lib/chamber/morphology";
import { budColorForStrain, silhouetteFor } from "@/lib/chamber/strainVisuals";
import { budDnaFor, applyEnvironmentToBudDNA } from "@/lib/chamber/budDna";
import { titleCase } from "@/lib/format";

const ENV = { temp: 24, light: 600, humidity: 50, water: 70 };

// Representative day for each canonical stage (flowering window ≈ 60d).
const STAGES = [
  { label: "Seedling", day: 12 },
  { label: "Veg", day: 30 },
  { label: "Early flower", day: 48 },
  { label: "Late flower", day: 66 },
  { label: "Harvest", day: 78 },
];

const STRAINS = [
  { slug: "g13", name: "G13", ratio: 0.7 },
  { slug: "purple-diddy-punch", name: "Purple Diddy Punch", ratio: 0.8 },
  { slug: "animal-mints", name: "Animal Mints", ratio: 0.75 },
];

function StageCell({ slug, ratio, day }: { slug: string; ratio: number; day: number }) {
  const m = morphologyFor(ratio);
  const stage = stageForDay(day, 60);
  const budColor = budColorForStrain(slug, m.hue, seedForPlant(slug));
  const budDna = applyEnvironmentToBudDNA(budDnaFor(slug, budColor), ENV);
  return (
    <div style={{ width: 200, height: 300, borderRadius: 8, overflow: "hidden", background: "#050b12" }}>
      <GrowChamber
        seed={seedForPlant(slug)}
        day={day}
        stage={stage}
        morphology={m}
        silhouette={silhouetteFor(slug, ratio)}
        dev={devParams(day)}
        budColor={budColor}
        budDna={budDna}
        climate={{ fan: 45, temp: ENV.temp, hum: ENV.humidity, co2: 900 }}
        conditionFlags={[]}
        view="chamber"
      />
    </div>
  );
}

export default function StageReferencePage() {
  return (
    <div style={{ background: "#02060a", minHeight: "100vh", padding: 16, color: "#cfeeff", font: "12px ui-monospace" }}>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>GrowVerse — Stage Reference</h1>
      <p style={{ opacity: 0.6, marginBottom: 12 }}>
        Each launch strain across the five growth stages. Visual-QA reference for the graphics phase.
      </p>
      {STRAINS.map((s) => (
        <div key={s.slug} style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 4, fontWeight: 700 }}>{s.name}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {STAGES.map((st) => (
              <div key={st.label}>
                <div style={{ opacity: 0.7, marginBottom: 2 }}>
                  {st.label} · {titleCase(stageForDay(st.day, 60))} · d{st.day}
                </div>
                <StageCell slug={s.slug} ratio={s.ratio} day={st.day} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
