# Ember

Civil emergency response. Situational clarity comes before mood. The name is not a licence to draw flames, embers, or glow.

## Palette

The action colour is the ink in both modes, so a button cannot be red. Light is a warm field. Dark is a warm dark field, not a glow and not a blacked-out room. Live red, watch, and clear stay status colours. The chart scale is stone, ochre, pine, and steel, and it does not include the live red.

## Simulated and live

Every screen that can show an exercise or a live incident states one of these words in a reserved region at the top of the surface:

- **Simulated** — text `color.status.simulated.fg` on `color.status.simulated.bg`, with a 2px solid `color.ink` border.
- **Live** — text `color.status.live.fg` on `color.status.live.bg`.

They are not interchangeable and they are not a footer. If you do not know which is true, ask. Do not guess live.

## Status

Watch, act, and clear are words plus colour. Watch text is `color.warning`. A dangerous condition in running text is `color.danger`. Clear text is `color.success`. Never colour alone.

Red (`color.status.live` and `color.danger`) is not a primary button. Actions use `color.accent`, which is the same black as the ink, so a button cannot be mistaken for the LIVE label.

## Type and targets

Body is at least `font.size.md` (18px). Do not use `font.size.xs`. Pressed controls are at least `size.touch`. Short labels. Left-aligned. No marketing chrome on an operational view.

## Do not

- Do not use fire imagery, particle effects, or a dark "war room" theme in v1. This kit is a light, high-clarity field UI.
- Do not animate status.
