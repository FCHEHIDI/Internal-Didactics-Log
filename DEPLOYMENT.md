# Deployment Plan

## Vercel

- Deploy the public static site from the repository root.
- Use the root redirect pages (`index.html`, `log.html`, `contact.html`, `article.html`) to forward to the real pages in `site/`.
- Keep `server.js` out of the Vercel deployment so the platform does not detect the Express backend.

## GCP

- Move the dynamic backend from [gcp/backend](gcp/backend) to Cloud Run.
- Replace the local JSON store with a managed datastore such as Firestore.
- Move uploads to Cloud Storage.
- Keep the public frontend pointed at the GCP API base URL for likes, comments, messages, and admin actions.

## Migration order

1. Deploy the static frontend on Vercel.
2. Stand up the backend API on GCP Cloud Run.
3. Replace `site/data/store.json` with Firestore access.
4. Switch upload URLs to Cloud Storage.
5. Update frontend API base URLs.