# BloomDay — Google sign-in & Drive backup setup (free personal use)

BloomDay can continue working without Google. Google sign-in is optional and is used to authorize a manual backup or restore of one `BloomDay-backup.json` file in a `BloomDay` folder in the signed-in user's Google Drive.

**This is manual backup/restore, not live automatic sync.** After recording data, press **Save to Google Drive**. On another device/browser, connect the same Google account and press **Restore from Drive**. Restoring replaces the data currently stored in that browser, after a confirmation.

## 1. Create the Google Cloud project and enable Drive API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, e.g. `BloomDay Personal`.
3. Open **APIs & Services → Library**, find **Google Drive API**, and enable it.
4. Open **Google Auth Platform** and configure the consent screen / branding:
   - App name: `BloomDay`
   - User support email: your own email
   - Audience: `External` for a personal Gmail account
   - Contact email: your own email
5. Under **Data Access**, request only the scopes used by this app:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.file`

`drive.file` is intentionally used instead of broad access to all Drive files. BloomDay creates and updates its own backup file and does not request permission to read all of your Drive.

## 2. Create an OAuth Web Client ID

1. In **Google Auth Platform → Clients**, choose **Create client**.
2. Application type: **Web application**.
3. Add these **Authorized JavaScript origins** exactly (origins have no path):
   - `https://vijayrajen.github.io`
   - `http://127.0.0.1:8080`
   - `http://localhost:8080`
4. Create the client and copy the **Client ID**, usually ending with `apps.googleusercontent.com`.
5. Do **not** copy a client secret into this app. Browser apps must not keep client secrets; this app does not need one.

## 3. Add the client ID to BloomDay

Open `google-config.js` and replace:

```js
window.BLOOMDAY_GOOGLE_CLIENT_ID = 'PASTE_YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID_HERE';
```

with the OAuth Web Client ID you copied, retaining the quotation marks. The client ID is a public identifier and is expected to be present in browser code; never add any client secret or private key.

Commit `google-config.js` to the root of the `bloomday` GitHub repository along with the updated `index.html`, `app.js`, `sw.js`, `README.md`, and this setup guide. Keep the folder structure the same.

## 4. Consent-screen publishing status

For the initial setup, you can leave the app in **Testing** and add the Google account you intend to use as a test user. Google notes that authorization grants for External apps left in Testing can expire after seven days when non-basic scopes such as Drive are requested; you may need to connect again.

This is for personal use, with fewer than 100 users. Google says personal-use apps do not have to complete OAuth verification, although Google may show an unverified-app warning and a consent screen. Do not distribute the app publicly to other users without reviewing Google's verification requirements.

## 5. Use it

1. Open [BloomDay](https://vijayrajen.github.io/bloomday/) and go to **Profile** or tap the backup icon in the header.
2. Choose **Sign in with Google**, or choose **Save to Drive** / **Restore from Drive** to connect when needed.
3. Approve the requested Google account and Drive permissions.
4. Save creates/updates `My Drive/BloomDay/BloomDay-backup.json`. Restore downloads that JSON and asks before replacing current browser data.

The access token is held in memory only and is not placed in local storage or in the backup. After reloading the page or when the token expires, connect again when using Drive. Local routine/diet tracking continues to work without Google.

## Cost note

The app itself and GitHub Pages static hosting can remain free. Google documents standard Drive API use as available at no additional cost within its usage limits. Do not attach a billing account for this personal project; if the API quota changes or is exceeded, stop using Drive integration rather than enabling paid billing. Google Drive storage comes from the user's existing Google account storage.

## Important privacy/security note

GitHub Pages is a public static website. Google sign-in in this version authorizes access to the signed-in user's Drive; it is **not** a secure access-control wall protecting the website itself. Personal records stay in the current browser until the user chooses to save or restore a Drive backup. Anyone visiting the public site gets the app code, but not your browser's local data or private Drive file unless they sign in to an account that has access.
