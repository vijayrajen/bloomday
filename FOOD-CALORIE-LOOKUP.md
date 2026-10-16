# BloomDay Indian food calorie estimates

BloomDay includes an offline lookup for common Indian and South Indian food names. Type a name such as **idli**, **plain dosa**, **red rice**, **sambar**, **keerai poriyal**, **chicken biryani**, **fish curry**, **curd rice**, **filter coffee** or **banana**, then choose a suggestion. BloomDay fills a typical quantity and estimates calories based on the selected unit. Quantity and unit changes recalculate the estimate. The calories field stays editable; on existing manual entries, use **Use estimate** to replace the manual value.

## Accuracy and limits

These are approximate convenience estimates, not a laboratory analysis or a full recipe-aware food database. Cooking method, recipe, edible weight, brand, oil/ghee, coconut, sugar and serving size can change the true calories substantially. For packaged foods, use the nutrition label. Unknown food names remain manual.

The official ICMR-NIN **Indian Food Composition Tables (IFCT 2017)** are a useful reference for ingredient-level composition: https://www.nin.res.in/ebooks/IFCT2017_16122024.pdf. The simple prepared-dish estimates embedded in BloomDay are not a direct copy of the full IFCT dataset.

## Updating GitHub Pages

Upload/replace `index.html`, `app.js`, `food-library.js`, `styles.css`, and `sw.js` in the repository root. Keep the existing `assets` folder and `google-config.js`. Commit to the branch used by GitHub Pages. The service worker cache was bumped to v4 so the revised app and the food library can be refreshed.
