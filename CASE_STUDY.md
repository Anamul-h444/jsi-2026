# Case Study: JSI 2026 Pay & Pension Calculator

**Built by:** Anamul Haque, Full-Stack Software Engineer · **As of:** 17 Nov 2026

Within a day of Bangladesh's new military pay scale (JSI 01/2026) being published, I built and launched a mobile-first web calculator. It reached **15,274 page views in its first 2 days** (as of 17 Nov 2026, 10:07 pm), with no advertising.

| Item | Details |
| --- | --- |
| Project | Pay, pension and arrears calculator for Bangladesh Army JCOs, other ranks and pensioners |
| Timeline | 16–17 Nov 2026 (first version built in one day) |
| Live site | [anamul-h444.github.io/jsi-2026](https://anamul-h444.github.io/jsi-2026/) |
| Source code | This repository |
| Traffic stats | [Statistics page](https://anamul-h444.github.io/jsi-2026/stats.html) |
| Running cost | $0 (free hosting, no server) |

## The problem

The new pay scale arrived as a 54-page government gazette. Working out a personal salary from it was hard for ordinary service members, because several rules apply at once:

- Mapping the old pay scale to the new one, with a separate scale for each rank
- Raises paid in phases (40% then 70% for junior commissioned officers, 50% then 75% for other ranks)
- Allowances kept at old rates until December 2027, then switched to new rates
- Pension, commutation, and slab-based increases for existing pensioners

Thousands of people were waiting for official pay-office figures but wanted to know their new pay right away.

## Solution and features

Users enter a few details and get the full calculation under the gazette's rules, with a detailed PDF report showing every formula.

- **Pay in four phases:** basic pay, allowances and take-home pay for Jul 2026, Jan 2027, Jul 2027 and Jan 2028
- **Arrears:** month-by-month arrears up to the current day, with the current month pro-rated by days
- **Retirement and pension:** final basic pay including promotions, gross and net pension, and lump-sum commutation
- **Pensioner mode:** new slab-based pension for people already retired, plus medical and ration allowances
- **PDF reports:** in Bangla, with formulas, gazette paragraph references and a QR code
- **Privacy:** all data stays on the user's phone; nothing is sent to a server
- **App-like experience:** installable on phones and works offline (PWA)
- **Easy input:** OTP-style date boxes and support for Bangla digits

## Technology

A lightweight static site with no framework and no server, so it loads fast on weak mobile networks and costs nothing to host.

| Part | Technology | Why |
| --- | --- | --- |
| UI | HTML5, CSS3 (dark theme, animations), vanilla JavaScript | Fast load, no build step |
| Calculation engine | Separate data and logic files ([`data.js`](assets/js/data.js), [`calc.js`](assets/js/calc.js)) | Future gazette amendments only need data changes |
| Data | localStorage | Privacy; no database |
| PDF | html2pdf.js, qrcode-generator | Reports with Bangla fonts generated on the phone |
| Offline | Service Worker, Web App Manifest (PWA) | Installable; works without internet |
| Hosting | GitHub Pages + GitHub Actions | Automatic deploy on every push |
| Analytics | Daily GitHub Actions job + SVG chart | Dated daily traffic record |
| Fonts | Hind Siliguri, Tiro Bangla (self-hosted) | Clean Bangla typography |

## Results and proof

The site received 15,274 page views in its first 2 days, through organic Facebook sharing only, with no ads or paid promotion. The figure counts page views, so one person opening the site several times is counted each time.

| Proof | What it shows |
| --- | --- |
| [Statistics page](https://anamul-h444.github.io/jsi-2026/stats.html) | Total views, daily growth chart and table |
| [Daily record history](https://github.com/Anamul-h444/jsi-2026/commits/main/stats/visitors.csv) | Each day's count, recorded by an automated GitHub Actions job whose run logs show when it ran |
| [Code history](https://github.com/Anamul-h444/jsi-2026/commits/main) | Who built it and when each feature was added |
| [Wayback Machine](https://web.archive.org/web/*/anamul-h444.github.io/jsi-2026*) | Independent, dated snapshots of the live site |

## My role

I handled the whole project alone: planning, design, turning the gazette into calculation rules, coding, testing and deployment. I used an AI coding assistant (Claude) to write code.

**Skills shown:** turning complex government rules into simple software, mobile-first UI/UX, Bangla-language content, PWA, PDF generation, CI/CD with GitHub Actions.
