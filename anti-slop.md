# Anti-slop

Generic model output has a look: a centred headline, a purple-to-blue wash, three equal cards, a glass panel, and emoji standing in for icons. Deviecall ventures do not ship that look.

Premium here means restrained. Aim at material honesty, weight, and air: the calm of a well-made object, in the spirit of Aesop, Aman, and Dune. Those are qualities. Do not use their names as product branding, and do not copy their marks, logos, or assets.

This file is the checklist. `skills/anti-slop/SKILL.md` points agents here.

## Rules

1. **No default gradient.** Do not paint a page, hero, button, or chart with a purple-to-blue gradient, or with any decorative gradient. Use flat colours from the kit.
2. **No emoji as icons.** Do not use emoji for navigation, status, or decoration. Use a word, one drawn mark at a single weight, or nothing.
3. **No reflex layout.** Do not default to a centred hero followed by three equal cards. Use that pattern only when the content really is three peers and the brief is a marketing page. Product UI is flush, with one primary action.
4. **No glass and no glow.** Do not use glassmorphism, backdrop blur, neon glow, or a coloured outer shadow. No v1 kit allows them. Separate surfaces with `color.line` or a step in background.
5. **Real hierarchy.** A person should be able to name the levels: one title, one primary action, body, meta. Do not stack five near-identical greys. Do not put a tinted icon tile above every heading.
6. **Stay inside the palette.** Do not introduce a hue the kit does not define. One accent, used rarely. Status colours mean status, not decoration.
7. **Honest copy.** Specific and plain. No "unlock", "elevate", "seamless", or "next-gen". No invented metrics, testimonials, logos, or customer counts. If a figure is paper, simulated, illustrative, or research-use, the screen says so in words, next to the figure.
8. **Accessible contrast.** WCAG 2.2 AA. Text at least 4.5:1 against its own background. Large text and meaningful UI boundaries at least 3:1. Do not put grey text on a coloured fill. Focus is visible and appears at once (`:focus-visible`). Colour is never the only signal. The token script checks the declared pairs.
9. **Quiet motion.** Use the motion tokens. Do not animate `width`, `height`, `top`, or `left`. `prefers-reduced-motion: reduce` means no transitional motion. Status is never carried by animation alone.
10. **Kits do not mix.** One venture, one kit. `the-bond` and `eka-noe` never share a screen, a token, or a voice.
11. **Alignment.** Tables, forms, and operational screens are left-aligned. Do not centre a dashboard.

## Before you finish

- Name the kit, and name the file the colours came from.
- Confirm every paper, simulated, illustrative, or research-use figure is labeled in text on that surface.
- Check the screen still reads in greyscale.
- If the layout is a template you have used before, start again from the brief.
