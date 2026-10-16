# BloomDay v6 — personal routine & diet tracker

A mobile-first installable web app for iPhone with routine tracking, Indian food calorie suggestions, weight and diet dashboards, local JSON backup, and optional Google Drive backup/restore.

## Deploy to GitHub Pages

Follow `UPLOAD-TO-GITHUB.txt` exactly. Before upload, edit `google-config.js` and replace the placeholder with the Google OAuth Web application Client ID. Never add a client secret.

Upload the contents of this folder into the `main` branch repository root, preserving the `assets/` directory. Wait for GitHub Pages to deploy, then verify the files using the URLs in the setup guide.

## Local preview on Windows

Double-click `start-local.bat`; keep the terminal window open. Then visit `http://127.0.0.1:8080`.

## Google Drive

See `GOOGLE-DRIVE-SETUP.md`. Google sign-in is optional. The app uses a public OAuth client ID and requests Drive file access. Backup/restore is manual, not automatic sync. Never put any Google client secret into client-side code.

## Indian food calories

See `FOOD-CALORIE-LOOKUP.md`. Calorie values are estimates and depend on portions and recipes.

## Local privacy

Routine, diet and weight logs remain in the browser until the user exports a JSON file or explicitly saves a Drive backup. Anyone can visit the public website; Google sign-in is for Drive authorization, not website access control.
