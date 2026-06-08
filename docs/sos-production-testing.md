# SOS Production Testing Checklist

Use this checklist before and after deploying SOS alert changes.

## VAPID Setup

Generate web push VAPID keys locally:

```shell
npx web-push generate-vapid-keys
```

Add the keys to Vercel environment variables. Do not commit VAPID keys to GitHub.

Backend Vercel project:

```text
VAPID_PUBLIC_KEY=public_key_here
VAPID_PRIVATE_KEY=private_key_here
```

Frontend Vercel project:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=public_key_here
```

Important:

- `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be the same public key.
- `VAPID_PRIVATE_KEY` is backend-only.
- After adding or changing env vars, redeploy both frontend and backend.
- If VAPID keys are missing, dashboard polling still runs every 12 seconds, but background mobile push may not work.

## Production SOS Checklist

Environment:

- Backend `VAPID_PUBLIC_KEY` added.
- Backend `VAPID_PRIVATE_KEY` added.
- Frontend `NEXT_PUBLIC_VAPID_PUBLIC_KEY` added.
- Frontend public key matches backend public key.
- Backend redeployed.
- Frontend redeployed.

Admin setup:

- Admin logged in on desktop.
- Admin logged in on mobile.
- Enable SOS Alerts button tapped.
- Notification permission granted.
- Push device registered.
- Sound unlocked.
- Fallback polling active.

Open dashboard test:

- Resident triggers SOS.
- Desktop admin receives modal.
- Desktop sound plays.
- Mobile admin receives modal.
- Mobile sound plays.
- Mobile vibration works if supported.
- Browser/system notification appears.
- SOS active count updates.

Background mobile test:

- Admin phone locked or app backgrounded.
- Resident triggers SOS.
- Push notification appears.
- Notification opens `/admin/sos`.
- SOS can be acknowledged.
- SOS can be resolved.

Reliability:

- SOS is saved even if push fails.
- SOS remains visible until resolved.
- SOS history remains after resolution.
- Multiple admins receive alert.
- Business scoping works for `ADMIN`.
- `SUPER_ADMIN` access works.

Final success condition:

- A resident triggers SOS while the admin phone is locked or the app is backgrounded, and the admin still receives the emergency notification, taps it, lands on `/admin/sos`, and can acknowledge or resolve the alert.

Alert priority:

1. Web Push Notification for mobile/background delivery.
2. Dashboard polling every 12 seconds.
3. Full-screen modal, siren sound, and vibration when dashboard is open.
