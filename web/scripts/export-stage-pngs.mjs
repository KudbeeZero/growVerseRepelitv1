// Canonical stage-PNG generator (PR #29). Drives the existing Canvas-2D chamber
// renderer through headless Chromium to export 7 launch strains × 5 growth stages
// = 35 deterministic PNG stills. No renderer rewrite, no gameplay code — it just
// visits the offline export route (/export/chamber) for each cell and grabs the
// canvas via toDataURL. See knowledge/stage-png-generation.md.
//
// Usage:
//   npm run export:stages              # boots `next dev` on PORT, generates, exits
//   BASE_URL=http://localhost:3000 npm run export:stages   # use a running server
//
// Determinism: Chromium runs under reducedMotion:'reduce' (GrowChamber then paints
// a single static frame — no physics/dust), a pinned deviceScaleFactor, a fixed
// viewport, and neutral environment. Within the same Chromium build, regeneration
// reproduces the committed PNGs. Byte-identical output across Chromium
// versions/platforms is NOT promised (Canvas-2D anti-aliasing varies).

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(WEB_ROOT, "public", "strains", "canonical");

const PORT = Number(process.env.PORT ?? 3210);
const SPAWN_SERVER = !process.env.BASE_URL;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const DEVICE_SCALE = Number(process.env.DEVICE_SCALE ?? 2);

// Keep this matrix in lockstep with src/lib/chamber/canonicalStages.ts.
const STRAINS = ["g13", "purple-diddy-punch", "animal-mints", "white-rhino", "white-fire-og", "gelato", "wedding-cake"];
const STAGES = ["seedling", "vegetative", "early-flower", "late-flower", "harvest-ready"];

function log(...a) {
  console.log("[export-stages]", ...a);
}

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 404) return; // server is up and routing
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "\n[export-stages] Playwright is not installed.\n" +
        "  Install it and the Chromium binary, then re-run:\n" +
        "    cd web && npm i -D playwright && npx playwright install chromium\n" +
        "    npm run export:stages\n",
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  let server = null;
  if (SPAWN_SERVER) {
    log(`booting next dev on :${PORT} …`);
    server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
      cwd: WEB_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });
  } else {
    log(`using existing server at ${BASE_URL}`);
  }

  const browser = await chromium.launch();
  let written = 0;
  try {
    await waitForServer(BASE_URL);
    const context = await browser.newContext({
      reducedMotion: "reduce",
      colorScheme: "dark",
      deviceScaleFactor: DEVICE_SCALE,
      // Viewport must comfortably CONTAIN the page's fixed 768×1024 wrapper (it is
      // centred); the PNG is the canvas backing store via toDataURL, not a
      // viewport screenshot, so the exact viewport size doesn't affect framing.
      viewport: { width: 820, height: 1100 },
    });
    const page = await context.newPage();

    // Warm up the route once — `next dev` compiles it lazily on first hit, which
    // can exceed a per-cell timeout on a cold start.
    log("warming up /export/chamber …");
    await page.goto(`${BASE_URL}/export/chamber?strain=g13&stage=harvest-ready`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await page.waitForFunction(() => window.__chamberReady === true, null, { timeout: 120_000 });

    for (const strain of STRAINS) {
      for (const stage of STAGES) {
        const url = `${BASE_URL}/export/chamber?strain=${strain}&stage=${stage}`;
        await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        await page.waitForFunction(() => window.__chamberReady === true, null, { timeout: 60_000 });
        await page.waitForTimeout(120); // small settle margin

        const dataUrl = await page.evaluate(() => {
          const canvas = document.querySelector("[data-export-canvas-wrap] canvas");
          if (!(canvas instanceof HTMLCanvasElement)) return null;
          return canvas.toDataURL("image/png");
        });
        if (!dataUrl) throw new Error(`No canvas found for ${strain}-${stage}`);
        const prefix = "data:image/png;base64,";
        if (!dataUrl.startsWith(prefix)) {
          throw new Error(`Unexpected canvas data URL for ${strain}-${stage}: ${dataUrl.slice(0, 32)}…`);
        }
        const b64 = dataUrl.slice(prefix.length);
        const file = path.join(OUT_DIR, `${strain}-${stage}.png`);
        await writeFile(file, Buffer.from(b64, "base64"));
        written += 1;
        log(`✓ ${strain}-${stage}.png`);
      }
    }
  } finally {
    await browser.close();
    // Wait for the spawned `next dev` to actually exit — killing without awaiting
    // lets process.exit() race ahead and orphan the server, which then keeps PORT
    // bound and breaks the next run. Escalate to SIGKILL if it lingers.
    if (server && server.exitCode === null) {
      await new Promise((resolve) => {
        const hard = setTimeout(() => server.kill("SIGKILL"), 5000);
        server.once("exit", () => {
          clearTimeout(hard);
          resolve();
        });
        server.kill("SIGTERM");
      });
    }
  }

  log(`done — wrote ${written}/${STRAINS.length * STAGES.length} PNGs to public/strains/canonical/`);
  process.exit(written === STRAINS.length * STAGES.length ? 0 : 1);
}

main().catch((err) => {
  console.error("[export-stages] FAILED:", err);
  process.exit(1);
});
