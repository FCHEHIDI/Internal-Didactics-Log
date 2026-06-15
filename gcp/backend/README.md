# Cloud Run Backend

This backend mirrors the current Express API contract so the frontend can switch hosts without changing routes.

## Start locally

```bash
cd gcp/backend
npm install
npm start
```

## Environment variables

- `ADMIN_PASSWORD`
- `DATA_BACKEND` (`firestore` or `json`)
- `FIRESTORE_PROJECT_ID`
- `GCS_BUCKET_NAME`
- `PUBLIC_ASSET_BASE_URL`
- `CORS_ORIGIN`
- `LOCAL_DATA_FILE` (only for json fallback)

## Notes

- Firestore is the default backend.
- Uploads go to Cloud Storage.
- The frontend already routes API calls through `window.idlApiUrl(...)`.
