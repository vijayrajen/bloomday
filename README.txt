BLOOMDAY — DAILY MOTIVATION UPDATE

This add-on changes the two motivational messages on the home screen once per local calendar day. It works offline, uses no API, does not change saved user data, and requires no paid service.

FILES
- daily-motivation.js: add this file to the repository root, alongside index.html and app.js.

ONE SMALL HTML CHANGE
In index.html, find the existing script tag that loads app.js, likely:
  <script src="./app.js"></script>
Immediately AFTER it, add:
  <script src="./daily-motivation.js?v=1"></script>

If app.js is loaded with a version query already, keep that line unchanged and add the new script after it. Do not replace index.html or app.js wholesale.

PUBLISH
1. Upload daily-motivation.js to the repository root.
2. Edit index.html and add the script line after app.js.
3. Commit to main and wait for GitHub Pages to deploy.
4. Open https://vijayrajen.github.io/bloomday/?motivation=1 and press Ctrl+Shift+R.

HOW IT WORKS
- The message is selected using the phone/computer's local calendar day, so refreshes on the same day show the same messages.
- It rotates through 365 distinct motivational lines, then repeats next year.
- It only changes the two existing home-screen motivational texts.
- It does not alter routines, meals, calorie data, Google Drive settings, or backups.
