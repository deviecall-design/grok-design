#!/usr/bin/env node
/**
 * Build CSS custom properties and a Tailwind v3 preset from token JSON.
 * No dependencies. From the repo root:
 *   node foundations/build-tokens.mjs
 *
 * Colour tokens are OKLCH strings (`oklch(96.5% 0.008 95)`).
 * Every colour sets `$extensions["deviecall.dark"]` to the dark-mode OKLCH.
 * The CSS writes a hex fallback first, then the OKLCH inside
 * `@supports (color: oklch(0% 0 0))`, so older browsers keep the hex.
 *
 * Writes:
 *   foundations/tokens.css
 *   foundations/tailwind.preset.cjs
 *   kits/<id>/tokens.css
 *   examples/kits.css
 *
 * Exits 1 when a declared pair misses WCAG 2.2 AA in either mode.
 * `examples/v1.css` is a frozen archive and is not rewritten.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAIR_KEY = "deviecall.contrastPairs";
const DARK_KEY = "deviecall.dark";

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-monospace",
  "ui-serif",
  "ui-rounded",
  "cursive",
  "fantasy",
  "emoji",
  "math",
  "fangsong",
]);

// Inverse of Björn Ottosson's linear-sRGB → LMS matrix. White maps back to white.
const LMS_TO_SRGB = [
  [4.0767416613, -3.3077115904, 0.2309699287],
  [-1.2684380041, 2.6097574007, -0.3413193963],
  [-0.0041960865, -0.7034186145, 1.7076147009],
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isToken(node) {
  return Boolean(node) && typeof node === "object" && !Array.isArray(node) && "$value" in node;
}

function mergeTokens(base, over, path) {
  const out = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(over || {})]);
  for (const key of keys) {
    if (key.startsWith("$")) continue;
    const left = base?.[key];
    const right = over?.[key];
    const here = path.concat(key).join(".");
    if (right === undefined) {
      out[key] = left;
      continue;
    }
    if (left === undefined) {
      out[key] = right;
      continue;
    }
    if (isToken(right) && isToken(left)) {
      out[key] = right;
      continue;
    }
    if (isToken(right) || isToken(left)) {
      throw new Error(`Cannot merge token and group at ${here}`);
    }
    out[key] = mergeTokens(left, right, path.concat(key));
  }
  return out;
}

function flatten(node, path, out) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (isToken(node)) {
    out.push({ path, token: node });
    return;
  }
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    flatten(node[key], path.concat(key), out);
  }
}

function formatFamily(name) {
  if (GENERIC_FAMILIES.has(name) || name.startsWith("-") || /^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
    return name;
  }
  if (name.includes('"') || name.includes("\\")) throw new Error(`Unsafe font family name: ${name}`);
  return `"${name}"`;
}

function cssValue(token, path) {
  const { $type, $value } = token;
  const where = path.join(".");
  switch ($type) {
    case "dimension":
    case "duration":
      if (typeof $value !== "string" || !/^-?\d+(\.\d+)?(px|rem|ms|s)$/.test($value)) {
        throw new Error(`Bad ${$type} at ${where}: ${$value}`);
      }
      return $value;
    case "fontWeight":
      if (typeof $value !== "number") throw new Error(`Bad fontWeight at ${where}`);
      return String($value);
    case "number":
      if (typeof $value !== "number") throw new Error(`Bad number at ${where}`);
      return String($value);
    case "fontFamily": {
      const list = Array.isArray($value) ? $value : [$value];
      if (list.length === 0) throw new Error(`Empty fontFamily at ${where}`);
      return list.map(formatFamily).join(", ");
    }
    case "cubicBezier":
      if (!Array.isArray($value) || $value.length !== 4 || $value.some((n) => typeof n !== "number")) {
        throw new Error(`Bad cubicBezier at ${where}`);
      }
      return `cubic-bezier(${$value.join(", ")})`;
    default:
      throw new Error(`Unknown token type ${$type} at ${where}`);
  }
}

function parseOklch(input, where) {
  if (typeof input !== "string") throw new Error(`${where} colour must be an oklch() string`);
  const match = input
    .trim()
    .match(/^oklch\(\s*([0-9.]+)(%?)\s+([0-9.]+)\s+(-?[0-9.]+)\s*(?:\/\s*([0-9.]+)(%?))?\s*\)$/i);
  if (!match) throw new Error(`${where} is not oklch(): ${input}`);
  let L = Number(match[1]);
  if (match[2] === "%") L /= 100;
  if (L > 1 && match[2] !== "%") L /= 100;
  const C = Number(match[3]);
  const H = Number(match[4]);
  let alpha = 1;
  if (match[5] != null) {
    alpha = Number(match[5]);
    if (match[6] === "%") alpha /= 100;
  }
  if ([L, C, H, alpha].some((n) => Number.isNaN(n))) throw new Error(`${where} has a bad oklch number`);
  if (L < 0 || L > 1 || C < 0 || C > 0.4 || alpha < 0 || alpha > 1) {
    throw new Error(`${where} oklch is out of range (${input})`);
  }
  return { L, C, H, alpha };
}

function formatOklch(L, C, H, alpha) {
  const light = trim(Math.round(L * 1000) / 10);
  const chroma = trim(Math.round(C * 1000) / 1000);
  const hue = trim(Math.round(H * 10) / 10);
  const tail = alpha >= 0.999 ? "" : ` / ${trim(Math.round(alpha * 1000) / 1000)}`;
  return `oklch(${light}% ${chroma} ${hue}${tail})`;
}

function trim(value) {
  return String(value);
}

function linearSrgb(L, C, H) {
  const radians = (H * Math.PI) / 180;
  const a = C * Math.cos(radians);
  const b = C * Math.sin(radians);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return LMS_TO_SRGB.map((row) => row[0] * l + row[1] * m + row[2] * s);
}

function inGamut(channels) {
  return channels.every((channel) => channel >= -0.001 && channel <= 1.001);
}

function encodeChannel(value) {
  const clamped = Math.min(1, Math.max(0, value));
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

export function convertOklch(input, where = "color") {
  const parsed = parseOklch(input, where);
  let { L, C, H, alpha } = parsed;
  let channels = linearSrgb(L, C, H);
  if (!inGamut(channels)) {
    let low = 0;
    let high = C;
    for (let step = 0; step < 24; step += 1) {
      const mid = (low + high) / 2;
      if (inGamut(linearSrgb(L, mid, H))) low = mid;
      else high = mid;
    }
    C = low;
    channels = linearSrgb(L, C, H);
    process.stderr.write(`${where} chroma reduced to ${C.toFixed(3)} to fit sRGB\n`);
  }
  const rgb = channels.map(encodeChannel);
  const hex = `#${rgb.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  const alphaHex = alpha >= 0.999 ? "" : Math.round(alpha * 255).toString(16).padStart(2, "0");
  return {
    L,
    C,
    H,
    alpha,
    hex: `${hex}${alphaHex}`,
    oklch: formatOklch(parsed.L, parsed.C, parsed.H, alpha),
    rgbHex: hex,
  };
}

function shadowCss(raw, where) {
  const parts = ["offsetX", "offsetY", "blur", "spread", "color"];
  for (const part of parts) {
    if (typeof raw?.[part] !== "string") throw new Error(`Shadow ${where} missing ${part}`);
  }
  const color = convertOklch(raw.color, `${where} shadow`);
  const zero =
    raw.offsetX === "0px" &&
    raw.offsetY === "0px" &&
    raw.blur === "0px" &&
    raw.spread === "0px" &&
    color.alpha === 0;
  if (zero) return { fallback: "none", oklch: "none" };
  const box = `${raw.offsetX} ${raw.offsetY} ${raw.blur} ${raw.spread}`;
  return { fallback: `${box} ${color.hex}`, oklch: `${box} ${color.oklch}` };
}

function resolveItem(item, mode) {
  const where = item.path.join(".");
  if (item.token.$type === "color") {
    const raw = mode === "dark" ? item.token.$extensions?.[DARK_KEY] : item.token.$value;
    if (typeof raw !== "string") throw new Error(`${where} is missing ${mode} OKLCH (${DARK_KEY})`);
    const color = convertOklch(raw, `${where} ${mode}`);
    return { path: item.path, fallback: color.hex, oklch: color.oklch, rgbHex: color.rgbHex };
  }
  if (item.token.$type === "shadow") {
    const raw = mode === "dark" && item.token.$extensions?.[DARK_KEY] ? item.token.$extensions[DARK_KEY] : item.token.$value;
    const shadow = shadowCss(raw, where);
    return { path: item.path, fallback: shadow.fallback, oklch: shadow.oklch };
  }
  if (mode === "dark") return null;
  return { path: item.path, fallback: cssValue(item.token, item.path) };
}

function itemsFor(flat, mode) {
  const items = [];
  for (const item of flat) {
    if (mode === "dark" && item.token.$type !== "color" && !(item.token.$type === "shadow" && item.token.$extensions?.[DARK_KEY])) {
      continue;
    }
    const resolved = resolveItem(item, mode);
    if (resolved) items.push(resolved);
  }
  return items;
}

function ruleBody(items, channel) {
  const lines = [];
  let group = "";
  for (const item of items) {
    if (channel === "oklch" && !item.oklch) continue;
    const next = item.path[0];
    if (next !== group) {
      if (lines.length) lines.push("");
      lines.push(`  /* ${next} */`);
      group = next;
    }
    const value = channel === "oklch" ? item.oklch : item.fallback;
    lines.push(`  --${item.path.join("-")}: ${value};`);
  }
  return lines.join("\n");
}

function rule(selector, items, channel) {
  return `${selector} {\n${ruleBody(items, channel)}\n}`;
}

function withSupport(selector, items) {
  const hex = rule(selector, items, "fallback");
  const modern = items.filter((item) => item.oklch && item.oklch !== item.fallback && item.oklch !== "none");
  if (modern.length === 0) return hex;
  return `${hex}\n@supports (color: oklch(0% 0 0)) {\n${rule(selector, modern, "oklch")}\n}`;
}

function themeCss(lightSelector, darkSelector, flat, systemDark) {
  const light = itemsFor(flat, "light");
  const dark = itemsFor(flat, "dark");
  const chunks = [withSupport(lightSelector, light), withSupport(darkSelector, dark)];
  if (systemDark) {
    const media = `:root:not([data-mode="light"])`;
    chunks.push(`@media (prefers-color-scheme: dark) {\n${rule(media, dark, "fallback")}\n}`);
    chunks.push(
      `@supports (color: oklch(0% 0 0)) {\n@media (prefers-color-scheme: dark) {\n${rule(media, dark.filter((item) => item.oklch), "oklch")}\n}\n}`,
    );
  }
  return chunks.join("\n\n");
}

function banner(text) {
  return `/* ${text} */\n/* Generated by foundations/build-tokens.mjs. Do not edit by hand. */\n`;
}

function channelByte(hex, index) {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

function linearise(value) {
  const channelValue = value / 255;
  return channelValue <= 0.04045 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/.test(hex)) throw new Error(`Contrast needs a 6-digit hex, got ${hex}`);
  return 0.2126 * linearise(channelByte(hex, 0)) + 0.7152 * linearise(channelByte(hex, 1)) + 0.0722 * linearise(channelByte(hex, 2));
}

export function contrastHex(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function colorMap(flat, mode) {
  const map = new Map();
  for (const item of flat) {
    if (item.token.$type !== "color") continue;
    const resolved = resolveItem(item, mode);
    map.set(item.path.join("."), resolved.rgbHex);
  }
  return map;
}

function pairsFrom(tree) {
  const pairs = tree?.$extensions?.[PAIR_KEY];
  if (pairs == null) return [];
  if (!Array.isArray(pairs)) throw new Error(`${PAIR_KEY} must be an array`);
  return pairs;
}

function checkPairs(id, flat, pairs, mode) {
  const colors = colorMap(flat, mode);
  const failures = [];
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 3) {
      failures.push(`${id} ${mode} bad contrast pair ${JSON.stringify(pair)}`);
      continue;
    }
    const [foregroundPath, backgroundPath, minimum] = pair;
    const foreground = colors.get(foregroundPath);
    const background = colors.get(backgroundPath);
    if (!foreground || !background) {
      failures.push(`${id} ${mode} missing colour for ${foregroundPath} on ${backgroundPath}`);
      continue;
    }
    const ratio = Math.round(contrastHex(foreground, background) * 100) / 100;
    if (ratio < minimum) {
      failures.push(
        `${id} ${mode} ${foregroundPath} on ${backgroundPath} is ${ratio}:1, needs ${minimum}:1 (${foreground} on ${background})`,
      );
    }
  }
  return failures;
}

function insert(object, keys, value) {
  let cursor = object;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (cursor[key] == null) cursor[key] = {};
    if (typeof cursor[key] !== "object") {
      throw new Error(`Preset path collides at ${keys.slice(0, index + 1).join(".")}`);
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function addPresetPath(extend, path) {
  const name = `--${path.join("-")}`;
  const value = `var(${name})`;
  const [group, second] = path;
  switch (group) {
    case "color":
      insert(extend.colors, path.slice(1), value);
      return;
    case "font":
      if (second === "family") insert(extend.fontFamily, path.slice(2), value);
      else if (second === "size") insert(extend.fontSize, path.slice(2), value);
      else if (second === "weight") insert(extend.fontWeight, path.slice(2), value);
      else if (second === "leading") insert(extend.lineHeight, path.slice(2), value);
      else throw new Error(`No Tailwind map for ${path.join(".")}`);
      return;
    case "space":
      insert(extend.spacing, [`s-${second}`], value);
      return;
    case "size":
      insert(extend.minWidth, path.slice(1), value);
      insert(extend.minHeight, path.slice(1), value);
      return;
    case "radius":
      insert(extend.borderRadius, path.slice(1), value);
      return;
    case "motion":
      if (second === "duration") insert(extend.transitionDuration, path.slice(2), value);
      else if (second === "easing") insert(extend.transitionTimingFunction, path.slice(2), value);
      else throw new Error(`No Tailwind map for ${path.join(".")}`);
      return;
    case "elevation":
      insert(extend.boxShadow, path.slice(1), value);
      return;
    default:
      throw new Error(`No Tailwind map for group "${group}" (${path.join(".")})`);
  }
}

function stringify(value, indent) {
  if (typeof value === "string") return JSON.stringify(value);
  const keys = Object.keys(value);
  if (keys.length === 0) return "{}";
  const pad = "  ".repeat(indent);
  const body = keys
    .map((key) => {
      const printed = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key);
      return `${pad}  ${printed}: ${stringify(value[key], indent + 1)}`;
    })
    .join(",\n");
  return `{\n${body}\n${pad}}`;
}

function sortedFlat(tree) {
  const flat = [];
  flatten(tree, [], flat);
  flat.sort((a, b) => a.path.join(".").localeCompare(b.path.join(".")));
  return flat;
}

function kitDirs() {
  const parent = join(root, "kits");
  return readdirSync(parent)
    .map((name) => ({ name, dir: join(parent, name) }))
    .filter((entry) => statSync(entry.dir).isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
}

function selfCheck() {
  const white = convertOklch("oklch(100% 0 0)", "white");
  const black = convertOklch("oklch(0% 0 0)", "black");
  const grey = convertOklch("oklch(50% 0 0)", "grey");
  if (white.rgbHex !== "#ffffff" || black.rgbHex !== "#000000" || grey.rgbHex !== "#636363") {
    throw new Error(`OKLCH self-check failed: ${white.rgbHex} ${black.rgbHex} ${grey.rgbHex}`);
  }
}

function main() {
  selfCheck();
  const foundations = readJson(join(root, "foundations/tokens.json"));
  const foundationTokens = mergeTokens(foundations, {}, []);
  const foundationFlat = sortedFlat(foundationTokens);
  const failures = [
    ...checkPairs("foundations", foundationFlat, pairsFrom(foundations), "light"),
    ...checkPairs("foundations", foundationFlat, pairsFrom(foundations), "dark"),
  ];

  const kitBlocks = [];
  const pendingKitCss = [];
  const union = new Map(foundationFlat.map((item) => [item.path.join("."), item.path]));

  for (const kit of kitDirs()) {
    const tokenPath = join(kit.dir, "tokens.json");
    if (!existsSync(tokenPath)) {
      process.stdout.write(`skip ${kit.name} (no tokens.json)\n`);
      continue;
    }
    if (!existsSync(join(kit.dir, "brief.md"))) throw new Error(`${kit.name} has tokens.json but no brief.md`);
    const kitJson = readJson(tokenPath);
    const merged = mergeTokens(foundations, kitJson, []);
    const flat = sortedFlat(merged);
    const pairs = [...pairsFrom(foundations), ...pairsFrom(kitJson)];
    failures.push(...checkPairs(kit.name, flat, pairs, "light"), ...checkPairs(kit.name, flat, pairs, "dark"));
    for (const item of flat) union.set(item.path.join("."), item.path);
    pendingKitCss.push({
      name: kit.name,
      dir: kit.dir,
      css: `${banner(
        `${kit.name}. Light on :root. Dark on [data-mode=dark], or when the system is dark and data-mode is not light. Link this file alone.`,
      )}${themeCss(":root", ':root[data-mode="dark"]', flat, true)}\n`,
      block: themeCss(`.kit-${kit.name}`, `.kit-${kit.name}[data-mode="dark"]`, flat, false),
    });
  }

  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`${failure}\n`);
    process.stderr.write(`${failures.length} contrast pair(s) failed. Generated files were not written.\n`);
    process.exit(1);
  }

  for (const kit of pendingKitCss) {
    writeFileSync(join(kit.dir, "tokens.css"), kit.css);
    kitBlocks.push(kit.block);
    process.stdout.write(`wrote kits/${kit.name}/tokens.css\n`);
  }

  writeFileSync(
    join(root, "foundations/tokens.css"),
    `${banner(
      "Shared foundations. Light on :root. Dark on [data-mode=dark], or when the system is dark and data-mode is not light.",
    )}${themeCss(":root, .theme-foundations", ':root[data-mode="dark"], .theme-foundations[data-mode="dark"]', foundationFlat, true)}\n`,
  );
  writeFileSync(
    join(root, "examples/kits.css"),
    `${banner("Gallery classes. data-mode=light or data-mode=dark on the element. The system theme does not override these classes.")}\n${kitBlocks.join("\n\n")}\n`,
  );

  const extend = {
    colors: {},
    fontFamily: {},
    fontSize: {},
    fontWeight: {},
    lineHeight: {},
    spacing: {},
    minWidth: {},
    minHeight: {},
    borderRadius: {},
    transitionDuration: {},
    transitionTimingFunction: {},
    boxShadow: {},
  };
  for (const path of [...union.values()].sort((a, b) => a.join(".").localeCompare(b.join(".")))) addPresetPath(extend, path);

  const preset = `/**
 * Generated by foundations/build-tokens.mjs. Do not edit by hand.
 * Tailwind v3 preset. Values are CSS variables, so light and dark follow
 * the tokens.css loaded on :root (data-mode, or the system theme).
 *
 * Link foundations/tokens.css, or a single kits/<id>/tokens.css.
 * Then: presets: [require("<path>/foundations/tailwind.preset.cjs")]
 *
 * Colour utilities follow token names: bg-bg, text-ink, border-line,
 * bg-accent, text-on-accent, text-info. Kit-only names (status, data,
 * hazard, series, viz) resolve when that kit's CSS is loaded.
 * Spacing keys are s-0 … s-9 (p-s-4) and do not replace Tailwind's numeric scale.
 * size.touch maps to min-w-touch and min-h-touch.
 *
 * Tailwind v4: skip this preset and map the same variables in @theme.
 */
module.exports = {
  theme: {
    extend: ${stringify(extend, 2)}
  }
};
`;
  writeFileSync(join(root, "foundations/tailwind.preset.cjs"), preset);
  process.stdout.write("All contrast pairs passed in light and dark.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
