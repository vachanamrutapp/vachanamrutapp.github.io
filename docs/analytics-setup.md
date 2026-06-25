# Self-hosted analytics on Firebase

Minimal Piwik/Plausible-style analytics: a tracking script for GitHub Pages sites,
a public ingest endpoint, and a Google-Auth-gated dashboard with per-site metrics.
All on Firebase free tier (Spark plan: 20k writes/day, 50k reads/day, 1 GiB storage).

## 1. Architecture

```
[GitHub Pages site] --tracking.js--> [Cloud Function: /collect] --> [Firestore]
                                                                          ^
[Dashboard (Firebase Hosting)] --Google Sign-In--> [Cloud Function: /stats] -+
```

- **Ingest is public, write-only.** No auth required so the script works cross-origin
  from any GitHub Pages site. Firestore rules deny all direct client access — only
  the Cloud Functions (via Admin SDK) touch the database.
- **Dashboard is private.** Gated behind Firebase Auth (Google provider), restricted
  to an allowlist of your own email(s).
- **Multi-site.** Every event carries a `siteId` you choose per site (e.g. `vachanamrut`).

## 2. Firestore schema

```
sites/{siteId}                  -- optional, just a registry
  name: string
  createdAt: timestamp

events/{eventId}
  siteId: string
  path: string          -- e.g. "/chapter/12"
  referrer: string
  ua: string             -- raw user-agent (for bot filtering later)
  ts: timestamp
  day: string            -- "YYYY-MM-DD", precomputed for cheap daily rollup queries
```

No sessions/visitor IDs, no cookies — keeps it cookie-consent-free. If you want
unique-visitor counts later, hash `(ip + ua + day)` server-side into a `visitorHash`
field instead of using a client-side cookie/localStorage ID.

## 3. Project setup

```bash
npm install -g firebase-tools
firebase login
firebase init firestore functions hosting
# - Firestore: use default rules file below
# - Functions: TypeScript or JavaScript, your call
# - Hosting: public dir = "public" (dashboard goes here)
```

Enable **Google** as a sign-in provider in Firebase Console → Authentication.

## 4. Firestore rules (deny all direct client access)

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Cloud Functions use the Admin SDK, which bypasses these rules entirely.

## 5. Cloud Functions

`functions/index.js`:

```js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const ALLOWED_EMAILS = ["you@example.com"];

// Public ingest endpoint
exports.collect = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).send("");

  const { siteId, path, referrer } = req.body || {};
  if (!siteId || !path) return res.status(400).send("missing siteId/path");

  const now = new Date();
  await db.collection("events").add({
    siteId,
    path,
    referrer: referrer || "",
    ua: req.headers["user-agent"] || "",
    ts: admin.firestore.Timestamp.fromDate(now),
    day: now.toISOString().slice(0, 10),
  });

  res.status(204).send("");
});

// Auth-gated stats endpoint
exports.stats = functions.https.onCall(async (data, context) => {
  const email = context.auth?.token?.email;
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    throw new functions.https.HttpsError("permission-denied", "not allowed");
  }

  const { siteId, days = 7 } = data;
  const since = new Date(Date.now() - days * 86400000);
  const snap = await db
    .collection("events")
    .where("siteId", "==", siteId)
    .where("ts", ">=", since)
    .get();

  const byDay = {};
  const byPath = {};
  snap.forEach((doc) => {
    const e = doc.data();
    byDay[e.day] = (byDay[e.day] || 0) + 1;
    byPath[e.path] = (byPath[e.path] || 0) + 1;
  });

  return { total: snap.size, byDay, byPath };
});
```

Deploy:

```bash
firebase deploy --only functions,firestore:rules
```

## 6. Tracking script (paste into GitHub Pages)

```html
<script>
  (function () {
    var url = "https://<region>-<project-id>.cloudfunctions.net/collect";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: "vachanamrut",
        path: location.pathname,
        referrer: document.referrer,
      }),
      keepalive: true,
    }).catch(function () {});
  })();
</script>
```

No cookies, no localStorage, no consent banner needed.

## 7. Dashboard (Firebase Hosting)

`public/index.html` — Google sign-in button + call `stats` via the Firebase SDK
(`firebase.functions().httpsCallable("stats")`), render `byDay` as a simple chart
and `byPath` as a table. Keep this as plain HTML/JS, no framework needed for v1.

Deploy:

```bash
firebase deploy --only hosting
```

## 8. Costs to watch

- Each pageview = 1 Firestore write. 20k/day free.
- `stats` query reads scale with events in the window — fine at personal-site volume,
  but if it grows, add a scheduled function that rolls daily counts into a
  `dailyStats/{siteId}_{day}` doc so `stats` reads rollups instead of raw events.
