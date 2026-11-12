# grok-design

Shared design source for Damien Callaghan's Deviecall ventures. One set of foundations, a small override kit per venture, and skills an agent can read before it builds UI.

This kit is for Deviecall ventures only.

v1 is a draft: tokens, rules, and a static specimen. It is not a component library and it does not deploy anywhere.

## How an agent uses it

1. Read this file, then `anti-slop.md`, then `foundations/principles.md`.
2. Read `skills/grok-design/SKILL.md` and follow it. The review pass is `skills/anti-slop/SKILL.md`, which applies `anti-slop.md`.
3. Name the venture. Read `kits/<venture>/brief.md` and `kits/<venture>/tokens.json`. If the venture is unclear, ask. Do not guess.
4. Style from tokens. Colours in the JSON are OKLCH. Link one CSS file: `kits/<venture>/tokens.css` (foundations are already merged in). For a screen with no venture, link `foundations/tokens.css`. That file sets light on `:root`, dark on `[data-mode="dark"]`, and also follows the system when `data-mode` is absent. Set `data-mode="light"` to keep light.
5. Tailwind v3 can use `foundations/tailwind.preset.cjs`. The preset reads those CSS variables. Colour utilities follow token names (`bg-bg`, `text-ink`, `border-line`). Spacing utilities are `p-s-1` … `p-s-9`, so the preset does not replace Tailwind's own numeric scale. `size.touch` is `min-w-touch` and `min-h-touch`.

Point Cursor, Claude Code, or a Grok bot at this repo. Skills live in `skills/<name>/SKILL.md` with `name` and `description` frontmatter. There is no installer.

## How a person uses it

Open `examples/index.html` in a browser. It loads no remote files. The page is a specimen of the tokens, not a product UI.

To change a colour or a size, edit the JSON, then regenerate:

```bash
node foundations/build-tokens.mjs
```

The script has no dependencies. It turns each OKLCH colour into a hex fallback and an OKLCH custom property, writes light and dark, and fails if a declared pair misses WCAG 2.2 AA in either mode (4.5:1 for text, 3:1 for lines, focus, and chart marks). Do not hand-edit generated files. `examples/v1.css` is a frozen copy of the first palette and is not regenerated.

## Folder map

| Path | What it is |
| --- | --- |
| `foundations/` | Shared tokens (JSON), principles, generated CSS, generated Tailwind preset, and the build script |
| `skills/grok-design/` | How to pick and apply a kit |
| `skills/anti-slop/` | Pointer to the review checklist |
| `anti-slop.md` | The checklist itself |
| `kits/<venture>/` | A short brief plus token overrides |
| `examples/index.html` | Gallery: v1 beside the 2026 light and dark mode of each kit |
| `examples/v1.css` | Frozen first palette, for that comparison |
| `REFERENCES.md` | Credits and links only. Nothing from those repos is copied here |
| `LICENSE` | MIT |

## Kits

| Folder | Venture | Intent |
| --- | --- | --- |
| `mirofish` | Mirofish | Dark terminal, dense figures, monospace numbers, olive used rarely. Paper and simulated figures are labeled. |
| `eka-noe` | Eka Noe | Dark terminal, warmer brass accent, same paper-trading honesty. Not The Bond. |
| `echo-oncology` | Echo Oncology | Clinical and calm. Measured data and illustrative data use different colours. Research-use is labeled on the surface. |
| `electrascan` | Electrascan | Electrical trade tool for site work. Large type, strong contrast, hazard yellow only for hazard. |
| `ember` | Ember | Civil emergency response. High clarity. Simulated and live are different, reserved labels. |
| `matakite` | Matakite | Rugby analytics on an original clay and teal palette. No NZRU, All Blacks, silver-fern, or team marks or names as branding. |
| `the-bond` | The Bond | Pet wellness. Own folder, own tokens, serif headings. Kept apart from Eka Noe. |
| `pleo` | Pleo | Stub only. Deprioritised. No tokens. Ask before designing it. |

## Rules

- This kit is for Deviecall ventures only.
- The repo is public. No secrets, API keys, environment files, or private URLs.
- Do not vendor other design skills. External work is credited by link in `REFERENCES.md`.
- One screen, one kit. `the-bond` and `eka-noe` never mix.
- Anti-slop in `anti-slop.md` is binding. A kit may get stricter and may not waive it.
- North star: premium and restrained. Material honesty, weight, and calm, in the spirit of Aesop, Aman, and Dune. Those are qualities. Do not copy their marks, logos, or assets.
- Token keys use the CSS spelling `color`. Prose uses "colour".
- v1 uses system font stacks only.

## Decisions in v1

- W3C-style design tokens (`$value`, `$type`) are the source. CSS custom properties are what UI should consume.
- Every kit has a light mode and a dark mode, including Electrascan and Ember. Dark is the same character, not a second brand.
- Mirofish and Eka Noe default to paper or simulated figures. Neither kit has a live-money colour. Dark is their working terminal. Light is that terminal in daylight.
- Ember's action colour is the ink, in both modes, so red stays reserved for the LIVE label.
- Chart scales (`color.viz`) exist on Mirofish, Eka Noe, Echo Oncology, and Ember. `color.info` is a quiet steel, not a primary blue.
- Generated CSS is committed, so the gallery works without a build. Re-run the script after token edits.
