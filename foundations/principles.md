# Principles

These bind every Deviecall venture. A kit may get stricter. It may not drop a rule in `anti-slop.md`.

1. **Foundations, then one kit.** Start with `foundations/tokens.json`. Apply the override in `kits/<venture>/tokens.json`. If the venture is unclear, ask. Do not guess a kit from the mood of the task.
2. **Restraint.** One accent, used rarely. Structure is a hairline (`color.line`) or a background step. `elevation.overlay` is for a dialog that must float. Everything else is `elevation.flat`.
3. **Honesty.** Paper, simulated, illustrative, and research-use data are labeled in words on the same surface as the data. A footer disclaimer is not the label.
4. **Legibility.** WCAG 2.2 AA is the floor, including contrast and a visible focus ring (`color.focus`). Hierarchy is size and weight first. `size.touch` (44px) is the minimum for a control that is pressed. A data row that is only text may be denser; a row that is itself the control may not.
5. **Quiet motion.** Durations come from the motion tokens and stay short. `prefers-reduced-motion: reduce` removes transitional motion.
6. **System type, for now.** Families are system stacks, so a screen renders offline and this repo holds no font files and no font-service URLs. Do not import a webfont.
7. **Qualities, not costumes.** The north star is premium and restrained: material honesty, weight, and calm, in the spirit of Aesop, Aman, and Dune. That sentence describes qualities. Do not put their names on a product, and do not copy their marks, logos, or assets.
8. **Two modes, one character.** Every kit has a light mode and a dark mode. Set `data-mode="light"` or `data-mode="dark"` on an ancestor. Leave it unset to follow the system. Alert colours stay alerts in both modes.
9. **Scope.** This kit is for Deviecall ventures only.

Colour tokens are OKLCH. The build writes a hex fallback, then the OKLCH for browsers that understand it. Token names use the CSS spelling `color`. Prose in this repo uses "colour".
