# Security and Firebase deployment

## Team authorization

Firestore access requires a Firebase Authentication custom claim named `team` with the boolean value `true`. Google sign-in alone is not team membership.

Assign claims with a trusted Firebase Admin SDK environment before deploying `firestore.rules`. Never put Admin SDK credentials in this repository or in browser code.

```js
// Run in a trusted server or local Admin SDK environment after replacing the UID.
const admin = require('firebase-admin');

admin.initializeApp();

async function approveTeammate(uid) {
  const user = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, team: true });
}
```

To remove access, preserve any unrelated claims and set `team: false`. Existing users must sign in again or refresh their ID token after a claim change. Deploy rules only after every active teammate has received the claim:

```bash
firebase deploy --only firestore:rules --project les-trois-forts
```

The rules in GitHub are not active until that Firebase deployment succeeds. Test changes with the Firestore emulator before production deployment.

## Chat content

Chat text, names, replies and IDs are HTML-escaped. Inline photos are limited to JPEG, PNG and WebP data URLs below 900,000 characters; GIFs are limited to GIPHY media hosts; stickers and reactions use allowlists. Firestore rules independently enforce the same trust boundaries.

Do not bypass these validators because a value “came from Firebase”. Firestore content is untrusted input.

## Reporting

Do not open a public issue containing guest details, booking data, access codes, tokens or private keys. Contact the repository owner privately for sensitive reports.
