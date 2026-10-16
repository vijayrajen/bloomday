# BloomDay — Free personal routine & diet tracker

**Tagline:** Healthy habits, happier you.

BloomDay is a mobile-first, installable web app designed for personal use on an iPhone. It can be edited on Windows and hosted for free as a static site. No paid developer account, database or native iOS build is required for this version.

## What's included

- Profile setup: name, age, height, current weight, target weight and calorie goal.
- Daily routine list with your starter tasks, editable names/times/icons, add/hide/delete options and date-specific check-offs.
- Diet tracker with Breakfast, Mid-morning Snack, Lunch, Evening Snack and Dinner; add custom slots such as Tea.
- Meal detail page with multiple food items, quantity/unit, optional per-item calories, and optional overall meal calories.
- Dated daily weight entries and a weight-history chart.
- Routine dashboard with daily/weekly/monthly/yearly views and per-task completion counts.
- Diet dashboard with average calories on logged days, logging consistency and meal-slot consistency.
- Local JSON export/import backup.
- Installable home-screen web app and static offline shell when hosted over HTTPS.

## Run locally on Windows

### Quick preview

1. Extract the ZIP to a normal folder.
2. Double-click `start-local.bat`.
3. It starts a tiny local server using Windows PowerShell and opens `http://127.0.0.1:8080` in your browser. Keep the black command window open while using the app; press Ctrl+C to stop it. No Python, Node.js or extra packages are needed.

If Windows blocks the script, use the included `.bat` file (it invokes PowerShell with a process-only execution-policy override); no system-wide policy is changed.

## Host free with GitHub Pages

GitHub Pages serves static files from a repository. To publish:

1. Sign in to GitHub and create a new **public** repository named `bloomday` (no paid plan required for a public repository).
2. Upload the *contents* of this folder into the repository's root. Make sure `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `apple-touch-icon.png`, `assets/` and `.nojekyll` are at the root level.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then save.
6. Wait for the published address to appear in the Pages section. It will usually look like `https://YOUR-USERNAME.github.io/bloomday/`.
7. Open that exact address in Safari on your wife's iPhone.

**Privacy note:** a public GitHub Pages site means the website source files are public. BloomDay does not send entries to GitHub or a server; profile, tasks and logs are saved in browser local storage on the device/browser where she uses the app. Do not put personal data inside the source files or repository. This version does not synchronise records between devices.

## Add to the iPhone Home Screen

1. Open the published site in **Safari** on the iPhone.
2. Tap Share.
3. Choose **Add to Home Screen**.
4. If available, switch on **Open as Web App**.
5. Tap **Add**. The BloomDay icon will appear on the Home Screen.

Use Safari consistently for BloomDay. The app's local browser storage is separate from storage in other browsers. If Safari website data is cleared or the device is lost, local data may be removed; use **Profile → Export backup** periodically and keep the downloaded JSON file somewhere safe.

## Important limitations of this zero-cost version

- This is a web app, not an App Store native app.
- No cloud sync, account login, push reminders or automatic calorie database is included.
- Calories are user-entered. Food quantities do not automatically calculate calories.
- Backups are manual JSON exports; restoring replaces current browser data.
- The first setup asks for a calorie goal defaulted to 1,500 kcal. Change it to a suitable personal target in Profile if needed.

## Files

- `index.html` — app shell and navigation
- `styles.css` — pink responsive interface
- `app.js` — routines, diet records, dashboard calculations and local storage
- `manifest.webmanifest` — home-screen/PWA metadata
- `sw.js` — static offline caching
- `apple-touch-icon.png`, `assets/` — app icon sizes
- `start-local.bat` — local Windows preview
