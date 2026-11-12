#!/usr/bin/env node
/**
 * Build CSS custom properties and a Tailwind v3 preset from token JSON.
 * No dependencies. From the repo root:
 *   node foundations/build-tokens.mjs
 *
 * Writes:
 *   foundations/tokens.css
 *   foundations/tailwind.preset.cjs
 *   kits/<id>/tokens.css          (merged foundations + kit)
 *   examples/kits.css             (one class per kit, for the gallery)
 *
 * Exits 1 when a declared contrast pair misses WCAG 2.2 AA.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAIR_KEY = "deviecall.contrastPairs";

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

function varName(path) {
  return `--${path.join("-")}`;
}

function formatFamily(name) {
  if (GENERIC_FAMILIES.has(name) || name.startsWith("-") || /^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
    return name;
  }
  if (name.includes('"') || name.includes("\\")) {
    throw new Error(`Unsafe font family name: ${name}`);
  }
  return `"${name}"`;
}

function cssValue(token, path) {
  const { $type, $value } = token;
  const where = path.join(".");
  switch ($type) {
    case "color":
      if (typeof $value !== "string" || !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test($value)) {
        throw new Error(`Bad colour at ${where}: ${$value}`);
      }
      return $value.toLowerCase();
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
    case "shadow": {
      const shadow = $value || {};
      const parts = ["offsetX", "offsetY", "blur", "spread", "color"];
      for (const part of parts) {
        if (typeof shadow[part] !== "string") throw new Error(`Shadow ${where} missing ${part}`);
      }
      const zero =
        shadow.offsetX === "0px" &&
        shadow.offsetY === "0px" &&
        shadow.blur === "0px" &&
        shadow.spread === "0px" &&
        shadow.color.toLowerCase().endsWith("00");
      if (zero) return "none";
      return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur} ${shadow.spread} ${shadow.color.toLowerCase()}`;
    }
    default:
      throw new Error(`Unknown token type ${$type} at ${where}`);
  }
}

function sortedFlat(tree) {
  const flat = [];
  flatten(tree, [], flat);
  flat.sort((a, b) => a.path.join(".").localeCompare(b.path.join(".")));
  return flat;
}

function renderBlock(selector, flat) {
  const lines = [`${selector} {`];
  let group = "";
  for (const item of flat) {
    const next = item.path[0];
    if (next !== group) {
      if (group) lines.push("");
      lines.push(`  /* ${next} */`);
      group = next;
    }
    lines.push(`  ${varName(item.path)}: ${cssValue(item.token, item.path)};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function banner(text) {
  return `/* ${text} */\n/* Generated by foundations/build-tokens.mjs. Do not edit by hand. */\n`;
}

function channel(hex, index) {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

function linear(value) {
  const channelValue = value / 255;
  return channelValue <= 0.04045
    ? channelValue / 12.92
    : ((channelValue + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/.test(hex)) {
    throw new Error(`Contrast needs a 6-digit hex, got ${hex}`);
  }
  return (
    0.2126 * linear(channel(hex, 0)) +
    0.7152 * linear(channel(hex, 1)) +
    0.0722 * linear(channel(hex, 2))
  );
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function colorMap(flat) {
  const map = new Map();
  for (const item of flat) {
    if (item.token.$type !== "color") continue;
    map.set(item.path.join("."), cssValue(item.token, item.path).slice(0, 7));
  }
  return map;
}

function pairsFrom(tree) {
  const pairs = tree?.$extensions?.[PAIR_KEY];
  if (pairs == null) return [];
  if (!Array.isArray(pairs)) throw new Error(`${PAIR_KEY} must be an array`);
  return pairs;
}

function checkPairs(id, flat, pairs) {
  const colors = colorMap(flat);
  const failures = [];
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 3) {
      failures.push(`${id} bad contrast pair ${JSON.stringify(pair)}`);
      continue;
    }
    const [foregroundPath, backgroundPath, minimum] = pair;
    const foreground = colors.get(foregroundPath);
    const background = colors.get(backgroundPath);
    if (!foreground || !background) {
      failures.push(`${id} missing colour for ${foregroundPath} on ${backgroundPath}`);
      continue;
    }
    const ratio = Math.round(contrast(foreground, background) * 100) / 100;
    if (ratio < minimum) {
      failures.push(
        `${id} ${foregroundPath} on ${backgroundPath} is ${ratio}:1, needs ${minimum}:1 (${foreground} on ${background})`,
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
  const name = varName(path);
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

function kitDirs() {
  const parent = join(root, "kits");
  return readdirSync(parent)
    .map((name) => ({ name, dir: join(parent, name) }))
    .filter((entry) => statSync(entry.dir).isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
}

function main() {
  const foundations = readJson(join(root, "foundations/tokens.json"));
  const foundationTokens = mergeTokens(foundations, {}, []);
  const foundationFlat = sortedFlat(foundationTokens);
  const failures = checkPairs("foundations", foundationFlat, pairsFrom(foundations));

  const kitBlocks = [];
  const pendingKitCss = [];
  const union = new Map(foundationFlat.map((item) => [item.path.join("."), item.path]));

  for (const kit of kitDirs()) {
    const tokenPath = join(kit.dir, "tokens.json");
    if (!existsSync(tokenPath)) {
      process.stdout.write(`skip ${kit.name} (no tokens.json)\n`);
      continue;
    }
    if (!existsSync(join(kit.dir, "brief.md"))) {
      throw new Error(`${kit.name} has tokens.json but no brief.md`);
    }
    const kitJson = readJson(tokenPath);
    const merged = mergeTokens(foundations, kitJson, []);
    const flat = sortedFlat(merged);
    failures.push(...checkPairs(kit.name, flat, [...pairsFrom(foundations), ...pairsFrom(kitJson)]));
    for (const item of flat) union.set(item.path.join("."), item.path);

    pendingKitCss.push({
      name: kit.name,
      css: `${banner(
        `${kit.name} tokens. Foundations overlaid with kits/${kit.name}/tokens.json. Link this file alone.`,
      )}${renderBlock(":root", flat)}\n`,
      block: renderBlock(`.kit-${kit.name}`, flat),
      dir: kit.dir,
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
    `${banner("Shared foundations. Link this when no venture kit applies.")}${renderBlock(":root", foundationFlat)}\n`,
  );
  writeFileSync(
    join(root, "examples/kits.css"),
    `${banner("Gallery classes. Each class is the full merged token set for that kit.")}${kitBlocks.join("\n\n")}\n`,
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
  const paths = [...union.values()].sort((a, b) => a.join(".").localeCompare(b.join(".")));
  for (const path of paths) addPresetPath(extend, path);

  const preset = `/**
 * Generated by foundations/build-tokens.mjs. Do not edit by hand.
 * Tailwind v3 preset. Values are CSS variables.
 *
 * Link foundations/tokens.css, or a single kits/<id>/tokens.css, on :root.
 * Then: presets: [require("<path>/foundations/tailwind.preset.cjs")]
 *
 * Colour utilities follow token names: bg-bg, text-ink, border-line,
 * bg-accent, text-on-accent. Kit-only names (status, data, hazard, series)
 * resolve when that kit's CSS is the one loaded.
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
  process.stdout.write("All contrast pairs passed.\n");
}

main();
