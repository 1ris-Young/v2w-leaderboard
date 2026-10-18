# Main-site changes (project page)

`leaderboard-link.patch` holds every change the project page (Video2World `web_v2`) needs for the
live leaderboard. It is a diff against the project-page source as it was before 2026-10-14, and
applies from the `web_v2` root with:

```bash
patch -p1 < leaderboard-link.patch
```

The project page also needs this repository's `site/` copied to `public/leaderboard/`
(`python scripts/sync-to-main-site.py --main-site <web_v2>`); the navigation count and the live
notice read `public/leaderboard/data/news.json` and `leaderboard.json` at build time, and render
nothing when those files are absent.

| File | Change |
| --- | --- |
| `src/data/site.json`, `src/data/abstract.json` | Leaderboard resource points to `leaderboard/`, labelled "Live Leaderboard" |
| `src/components/Navbar.astro` | "Live Leaderboard" pill carries the count of new results (pulsing dot); links to the leaderboard. Section link "Paper Results". |
| `src/components/Leaderboard.astro` | Section 03 becomes "Results at Publication" (frozen paper table) with a link to the live leaderboard |
| `src/components/LiveNews.astro` (new) | Live notice: opens beside the paper title, lists the latest results, folds to a pill after the reader scrolls on, can be dragged, and on close flies to the Live Leaderboard pill with a short note |
| `src/pages/index.astro` | Mounts `LiveNews` |
| `src/styles/global.css`, `src/styles/immersive.css` | Styles for the pill, the frozen results note and the live link |
