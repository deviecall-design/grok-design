# Mirofish

Dark, dense, terminal-style UI for inspecting paper and simulated markets.

## Intent

A person is reading figures, not a brand story. The field is a cool green-black. Chrome is the sans body face. Prices, quantities, and identifiers are `font.family.mono` with tabular figures. The olive accent is rare: a selected control, not a wash, and not a synonym for profit.

This kit is not Eka Noe. Eka Noe is the warmer brass terminal. Do not swap their accents.

## Labels

v1 treats figures as paper or simulated unless the task explicitly says a figure is live. There is no live-money colour in this kit. If a task needs live capital, stop and ask.

Every paper or simulated figure carries the word **Paper** or **Simulated**, in `color.status.paper`, on the same surface as the figure. Do not rely on a dim dot, a footer, or green meaning "real".

Gain and loss use `color.success` and `color.danger` plus a word or an explicit sign. Do not paint a whole row.

## Density

Use the small end of the space scale (`space.2` to `space.4`) inside tables. Page margins may be `space.5`. Rows are separated with `color.line`. Clickable controls are at least `size.touch`. A text row that is not a control may be tighter. Radius stays at the foundation steps. Do not invent pills.

## Do not

- Do not use glow, scanlines, or a phosphor bloom.
- Do not centre the table.
- Do not borrow tokens from `the-bond` or from `eka-noe`.
