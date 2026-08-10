import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

const pairedTokens = [
  "--bg-page",
  "--bg-surface",
  "--bg-elevated",
  "--bg-subtle",
  "--bg-input",
  "--text-primary",
  "--text-secondary",
  "--border-subtle",
  "--border-strong",
  "--accent",
  "--chart-grid",
  "--map-background",
  "--map-region",
  "--map-border",
  "--shadow-elevated",
];

test("semantic surface tokens provide light and dark values", () => {
  for (const token of pairedTokens) {
    const declarations = css.match(new RegExp(`${token}:`, "g")) || [];
    assert.ok(declarations.length >= 2, `${token} must be defined for both themes`);
  }
});

test("map exterior, region, hover, and selected states use semantic tokens", () => {
  assert.match(css, /\.algeria-map-canvas[\s\S]*?var\(--map-background\)/);
  assert.match(css, /path\[id\^="DZ"\][\s\S]*?fill:\s*var\(--map-region\)/);
  assert.match(css, /\.is-hovered[\s\S]*?fill:\s*var\(--map-hover\)/);
  assert.match(css, /\.is-selected[\s\S]*?fill:\s*var\(--map-selected\)/);
});
