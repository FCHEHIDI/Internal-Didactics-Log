# GCP Migration

This project is being split into:

- Vercel for the public static frontend
- GCP Cloud Run for the backend API
- Firestore for content/data persistence
- Cloud Storage for uploaded media

## Backend runtime

Use these environment variables in Cloud Run:

- `ADMIN_PASSWORD` - admin login password
- `DATA_BACKEND` - `firestore` when the cloud datastore is ready
- `FIRESTORE_PROJECT_ID` - GCP project id
- `FIRESTORE_DATABASE_ID` - Firestore database id, if applicable
- `GCS_BUCKET_NAME` - bucket for uploads
- `PUBLIC_ASSET_BASE_URL` - public base URL for uploaded media
- `CORS_ORIGIN` - Vercel frontend origin

## Suggested rollout

1. Deploy the frontend to Vercel.
2. Deploy [gcp/backend](gcp/backend) to Cloud Run.
3. Move article/comment/message storage from the local JSON file to Firestore.
4. Move uploads from `site/uploads` to Cloud Storage.
5. Set `window.IDL_API_BASE_URL` in `site/js/runtime.js` to the Cloud Run base URL.

## Notes

- The current frontend already reads API endpoints through `idlApiUrl(...)`.
- The current Vercel deploy should stay static-only.
- The local JSON store is still fine for local development until Firestore is wired in.
