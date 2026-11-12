# Electrascan

An Australian electrical trade tool. Practical, plain, and readable on site: sun, gloves, a quick glance.

## Palette

Both modes are built for legibility. Light is a cool instrument white for sun, distinct from the warmer v1 paper. Dark is for a dim board or a night callout, not a mood. Ink is near-black or near-white, muted stays strong, and the rules are heavy. The accent is a low-chroma navy, not a bright blue. Hazard yellow is the same band in both modes, with black text, and it is not a brand colour.

## Legibility

Body is `font.size.md` (18px). Do not use `font.size.xs` in the product. Secondary text uses `color.muted`, which is intentionally dark. Rules use `color.line`, which is strong enough to see outdoors. Controls that are pressed are at least `size.touch` (44px) on both axes.

Write units next to numbers: V, A, mm², m. Use metric. Prefer short trade language over slogans.

## Hazard

`color.hazard` is only for an electrical hazard state. The band is `color.hazard.bg` with `color.hazard.fg`, and the word **Hazard** (or the specific fault) is on the band. Do not use the yellow as a brand stripe, a chart series, or a primary button.

Inline fault text on paper uses `color.danger`, still with a word. A passed check uses `color.success` with a word. Navy (`color.accent`) is the action colour.

## Do not

- Do not build a consumer lifestyle page, a dark "pro mode", or a neon schematic.
- Do not rely on a colour-only state. Name the state.
- Do not shrink type to fit a dense form. Split the form.
