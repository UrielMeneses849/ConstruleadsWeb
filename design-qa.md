# BIMSA profile, analytics and route refinements — visual QA

- Source visual truth: the two annotated screenshots supplied by the user in this conversation.
- Implementation surfaces: `src/features/companias/CompaniasView.jsx`, `src/pages/App/ConstruleadsNavbar.jsx`, `src/pages/App/MapSelectionModal.jsx`, `src/pages/App/Mapa.jsx`, and `src/utils/obrasSources.js`.
- Browser evidence: Chrome local render at `http://localhost:5173/ConstruleadsWeb/`, reviewed in this turn at the desktop viewport.
- States reviewed: Projects map, selected company dashboard, Analytics STD workspace, and route summary with one selected project.

## Findings

- No P0, P1, or P2 visual or interaction issues found in the reviewed states.
- Company profile: five profile KPI cards render in one row, with the intended icon, label, value, optional detail, and compact density.
- Navbar: the supplied Bimsa Analytics logo is legible, aligned with the right-side controls, and its button navigates to the Analytics STD workspace.
- Route summary: the removed labels are absent; the suggested-route card shows only its title and the destination count.
- Explorer pins: the configured base gray is lighter (`#92979E`) and its selected gray remains distinct (`#6F747B`).

## Automated checks

- ESLint passed for all changed source files.
- Production build passed.

final result: passed
