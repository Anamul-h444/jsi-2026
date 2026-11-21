# JSI 2026 Pay & Pension Calculator

> 📄 **[Case Study](CASE_STUDY.md)** · 🌐 [Live site](https://anamul-h444.github.io/jsi-2026/) · 📊 [Stats](https://anamul-h444.github.io/jsi-2026/stats.html)

A mobile-first web app that calculates new pay, arrears and pension for Bangladesh Army junior commissioned officers (JCOs), other ranks and pensioners, under the Joint Services Instructions JSI 01/2026 (Bangladesh Gazette, 15 November 2026). The interface and PDF reports are in Bangla for its users.

**Built by:** Anamul Haque · Full-Stack Software Engineer · WhatsApp: [+880 1735-547549](https://wa.me/8801735547549)

## Features

- **Pay in four phases:** basic pay, raise and take-home pay for July 2026, January 2027, July 2027 and January 2028
- **Arrears:** month-by-month arrears from July 2026 up to the current day
- **Retirement and pension:** final basic pay including promotions, monthly pension, lump-sum commutation and other benefits
- **Pensioner mode:** new slab-based pension, medical and ration allowances for people who retired before July 2026
- **PDF reports:** salary, pension and full reports with formulas and gazette references
- **Privacy:** all data stays in the browser's local storage; no database, no server
- **Installable app (PWA):** works offline once opened

## Tech stack

HTML5, CSS3, vanilla JavaScript · Service Worker + Web App Manifest · html2pdf.js · qrcode-generator · GitHub Pages · GitHub Actions

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | The app (all views) |
| `assets/js/data.js` | Pay scales, allowance rates, commutation table, and `SITE_CONFIG` (developer name, ads, Facebook link) |
| `assets/js/calc.js` | Calculation rules: pay fixation, phased raises, allowances, arrears, pension |
| `assets/js/app.js` | UI, local storage, results and PDF generation |
| `assets/js/counter.js` | Visitor counter and "last updated" footer |
| `assets/css/style.css` | Dark theme and animations |
| `assets/img/` | Developer photo, logo and link-preview image (1200×630) |
| `manifest.webmanifest`, `sw.js` | PWA install and offline support |
| `stats.html`, `stats/visitors.csv` | Traffic statistics page and daily record |
| `.github/workflows/deploy.yml` | Deploys to GitHub Pages on every push to `main` |
| `.github/workflows/visitor-stats.yml` | Records the visitor count every night at 11:55 pm (Bangladesh time) |

## Run locally

No build step or install is needed. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy

1. Push the files to the `main` branch of a public GitHub repository.
2. In **Settings → Pages → Source**, select **GitHub Actions**.
3. The site goes live at `https://<username>.github.io/<repo>/` within a few minutes.

Every later push to `main` updates the site automatically, at no cost.

## Calculation notes

- Old pay scales for every rank come from JSI 2016 (Chapter 2, Annex A). Users pick their basic pay from a list.
- June 2026 allowances are calculated automatically from basic pay at 2016 rates. The special benefit (15% of basic pay, minimum Tk 2,000) ends on 1 July 2026.
- Default assumptions: living outside family quarters, house rent at the "other places" rate, minimum GPF deduction (5%).
- This is a helper tool. Final amounts are set by the pay office (iBAS++).

## License

All rights reserved © Anamul Haque.
