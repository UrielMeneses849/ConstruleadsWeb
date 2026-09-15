# Landing redesign — visual QA

- Source visual truth: reference screenshot supplied in the conversation (Bimsa Construleads landing redesign).
- Implementation: `src/pages/Landing/Landing.jsx` and `src/pages/Landing/landing-redesign.css`.
- Intended viewport: desktop reference, 768 × 2048 image; responsive breakpoints included for mobile.
- State: default landing page, closed navigation menu, untouched contact form.

## Findings

- [P1] Browser-rendered comparison is unavailable in this environment.
  - Evidence: no in-app browser control surface is exposed to capture the local implementation.
  - Impact: visual fidelity cannot be certified against the source image from code inspection or a successful build alone.
  - Fix: open the local landing in the available browser, capture desktop and mobile screenshots, compare to the reference, and iterate on visible differences.

## Implemented scope

- Rebuilt hero, social proof, testimonials, value proposition, solution cards, market segments, research/contact form, and footer.
- Preserved the existing `Carrusel` component as requested.
- Preserved login modal access; CTA buttons scroll to the contact form; the form has a success state.
- Added responsive layouts for tablet and mobile.

## Required fidelity surfaces pending visual capture

- Fonts and typography: Poppins hierarchy is implemented; wrapping needs rendered comparison.
- Spacing and layout rhythm: desktop section rhythm and mobile stacking need rendered comparison.
- Colors and visual tokens: navy/orange/white palette implemented from the source.
- Image quality and asset fidelity: existing Bimsa logo and visual assets reused; the Mexico-map illustration is approximated with an existing Bimsa construction data asset and should be reviewed.
- Copy and content: aligned to the supplied reference.

final result: blocked
