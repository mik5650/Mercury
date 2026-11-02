# Mercury 3

Premium training log — workouts, progression, nutrition, body.

## Use it
Open `dist/index.html` in a browser (double-click works), or host the `dist/` folder
anywhere static (GitHub Pages, Netlify) and "Add to Home Screen" on your phone.

## Publish it (GitHub Pages)
Every push to `main` builds the app and publishes it via `.github/workflows/pages.yml`.
One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The app is then live at `https://<your-username>.github.io/<repo>/`.

## Edit it
```
npm install
npm run watch     # rebuilds dist/ on every save
npm run serve     # http://localhost:5174
npm run build     # production build → dist/index.html (single file)
```

Source lives in `src/`: `screens/` (Today, Train, Progress, Fuel, Body), `sheets/` (modals),
`ui/` (design kit, icons, anatomy), `lib/` (data, programs). Styles: `src/styles.css`.
Data is stored in the browser (`localStorage`, key `mercury_v1`) and migrates automatically from v1/v2.
The previous version is archived in `mercury-v2-backup.zip`.
