# CollectorHub — Hot Wheels collector garage

A React + Vite web app for cataloguing a Hot Wheels collection: scan a car (barcode + OCR),
match it against a catalogue of 4,000+ mainline releases, and browse your garage as a lit
shelf, a 3D showcase, or a grid.

## Run it

```bash
pnpm install
pnpm --filter @collectorhub/web dev
```

Without Supabase keys the app runs in **local demo mode** (data stays in your browser).
To use a real backend, create a Supabase project, run `supabase/migrations/*.sql` in its
SQL editor, and add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to `apps/web/.env`
(see `apps/web/.env.example`).

Other scripts: `pnpm --filter @collectorhub/web test`, `… build`,
`… catalog:import 2018 2026` (refreshes `public/catalog/hotwheels.json`).

## 3D package model

`apps/web/public/models/hw-package.glb` is "HOT WHEELS PACKAGE SMALL" by
[manish.konda99](https://sketchfab.com/manish.konda99), from
https://sketchfab.com/3d-models/hot-wheels-package-small-2e19755b3026427ebc4f5bb1c0f92054
(Sketchfab Standard licence). All rights remain with the author; it is included here only so the
showcase works out of the box. If it's missing, the showcase falls back to the 2.5D CSS package.

## Credits

- Catalogue data: Hot Wheels Wiki contributors (CC BY-SA); card photos are linked, not copied.
- Showcase background: see `apps/web/public/environments/CREDITS.md`.
- Hot Wheels is a trademark of Mattel, Inc. This project is not affiliated with Mattel.
