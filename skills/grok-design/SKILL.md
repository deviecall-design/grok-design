---
name: grok-design
description: >
  Use before designing or building UI for a Deviecall venture (Mirofish,
  Eka Noe, Echo Oncology, Electrascan, Ember, Matakite, The Bond, or a
  shared foundations screen). Tells an agent which kit to load, how to
  apply tokens, and which labels are mandatory. Use when creating pages,
  components, dashboards, or styles in those products. Do not use for
  unrelated clients or for non-UI work.
---

# Grok Design

Shared design source for Damien Callaghan's Deviecall ventures. Read this before writing UI. This kit is for Deviecall ventures only.

## Pick a kit

1. Name the venture from the task. If it is ambiguous, ask. Do not infer a kit from adjectives like "dark" or "premium".
2. Read, in order:
   - `README.md`
   - `anti-slop.md`
   - `foundations/principles.md`
   - `foundations/tokens.json`
   - `kits/<venture>/brief.md`
   - `kits/<venture>/tokens.json`
3. Folder names: `mirofish`, `eka-noe`, `echo-oncology`, `electrascan`, `ember`, `matakite`, `the-bond`. `kits/pleo` is a stub. Do not invent Pleo tokens.
4. `the-bond` is pet wellness. `eka-noe` is investing. They never share a screen, a token, or a component.

## Apply it

- Foundations are the default. The kit file overrides only what it sets. A later value wins.
- Ship colours from tokens. The JSON values are OKLCH. Use the CSS variables. Do not add a hex, rgb, or hsl that the kit does not define.
- In CSS, link **one** file: `kits/<venture>/tokens.css` (it already contains the merged foundations). For a foundations-only screen, link `foundations/tokens.css`.
- Light is the default. Put `data-mode="dark"` on an ancestor for the dark mode, or `data-mode="light"` to force light. Omit `data-mode` and the kit follows the system theme.
- `color.info` is informational text, never the accent. `color.viz.*` is the chart scale, and only Mirofish, Eka Noe, Echo Oncology, and Ember define one.
- In Tailwind, use `foundations/tailwind.preset.cjs` and define the variables from that same CSS file. Utilities follow token names (`bg-bg`, `text-ink`, `border-line`). Spacing utilities are `p-s-1` … `p-s-9` so the preset does not replace Tailwind's numeric scale.
- After editing token JSON, run `node foundations/build-tokens.mjs` and keep the generated CSS. Do not hand-edit generated files.
- Follow the kit brief for labels: paper, simulated, live, measured, illustrative, research-use, hazard. The word is on the same surface as the data.
- Run the `anti-slop` skill, which reads `anti-slop.md`, before you finish.

## Do not

- Do not mix two kits to "borrow a nice accent".
- Do not treat the gallery in `examples/index.html` as a component library. It is a specimen of the tokens.
- Do not add secrets, environment files, or private URLs. The repo is public.
- Do not deploy from this repo. It has no hosting setup, on purpose.
