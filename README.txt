BloomDay visible Indian-food suggestion dropdown fix (v5)

FIXES
- Replaces the browser's native datalist with a consistent custom pink suggestion dropdown.
- Shows popular suggestions when the food field is focused; filters food names and aliases as the user types.
- Selecting a food fills the common portion, unit, and estimated calories. Quantity/unit changes recalculate the estimate.
- Adds keyboard navigation (up/down/enter/escape) for the suggestion list.
- Bumps service-worker cache and adds query versioning to avoid the old app script being cached.

INSTALL ON GITHUB PAGES
1. Extract this ZIP.
2. Open the extracted BloomDay-Autocomplete-Fix folder.
3. Upload and replace these five files at the ROOT of https://github.com/vijayrajen/bloomday:
   index.html, app.js, styles.css, sw.js, food-library.js
4. Commit changes to the branch used by GitHub Pages, usually main. Wait until the Pages deployment finishes.
5. Test https://vijayrajen.github.io/bloomday/?refresh=5. In Diet Tracker > meal > Add item, type "idl". You should see a visible pink suggestion for Idli. Tap it; portion and calories should fill automatically.

IMPORTANT
- DO NOT replace google-config.js; it may contain your Google OAuth Client ID.
- Keep your existing assets folder and icons unchanged.
- This is a patch, not a full site replacement. Upload the five specified files to the repository root, not a nested folder.
- If old text remains, use Ctrl+F5 on desktop. On iPhone, close and reopen Safari/the Home Screen app after deployment.

Calorie estimates are approximate and vary with recipe, portion, oil/ghee, coconut, and sugar. Packaged-food labels are preferred when available.
