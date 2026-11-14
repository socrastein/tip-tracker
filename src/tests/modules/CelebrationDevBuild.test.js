/// <reference types="vitest" />
/** @vitest-environment node */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// The dev panel's visible text; it must exist in a development build and be
// absent from a production build.
const PREVIEW_MARKER = "Dev preview: celebrations";

const projectRoot = process.cwd();
const viteBinary = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

/** Build into a temporary folder (never docs/, the deployed site) and return all its JS as text. */
function buildAndReadScripts(mode) {
  const outputDirectory = mkdtempSync(path.join(tmpdir(), `tip-tracker-${mode}-build-`));
  try {
    execFileSync(
      process.execPath,
      [viteBinary, "build", "--mode", mode, "--outDir", outputDirectory, "--emptyOutDir"],
      // Vitest runs with NODE_ENV=test, which Vite would read as "not production"
      // (keeping dev-only code), so the build gets the NODE_ENV of its own mode.
      { cwd: projectRoot, stdio: "pipe", env: { ...process.env, NODE_ENV: mode } },
    );
    const assetsDirectory = path.join(outputDirectory, "assets");
    return readdirSync(assetsDirectory)
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(path.join(assetsDirectory, name), "utf8"))
      .join("\n");
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
}

describe("celebration preview tools", () => {
  let productionScripts;
  let developmentScripts;

  beforeAll(() => {
    productionScripts = buildAndReadScripts("production");
    developmentScripts = buildAndReadScripts("development");
  }, 120_000);

  it("are present in a development build (so this check can tell the difference)", () => {
    expect(developmentScripts).toContain(PREVIEW_MARKER);
  });

  it("are absent from the production build", () => {
    expect(productionScripts).not.toContain(PREVIEW_MARKER);
  });

  it("leave the celebrations themselves in the production build", () => {
    expect(productionScripts).toContain("tipTracker(celebration).lastShown");
  });
});
