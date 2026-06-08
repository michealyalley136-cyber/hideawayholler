# HollerHub Demo Day Checklist

## Vercel Environment Variables

### Backend (`hollerhub-api`)
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — strong production secret
- `FRONTEND_URL` — `https://hollerhub.vercel.app`
- `CORS_ORIGINS` — `https://hollerhub.vercel.app`
- `NODE_ENV` — `production`
- `SEED_DEMO_PASSWORD` — only for seeding demo DB (do not expose in UI)

### Frontend (`hollerhub`)
- `NEXT_PUBLIC_API_URL` — `https://hollerhub-api.vercel.app`
- `NEXT_PUBLIC_UPLOADS_URL` — `https://hollerhub-api.vercel.app/uploads`
- `NEXT_PUBLIC_ENABLE_MOBILE_SOS_PUSH` — `false`

## Deploy Checklist
1. Push latest `main` to GitHub
2. Confirm **both** Vercel projects redeploy successfully
3. Backend build: `npx prisma generate && npm run build`
4. Frontend build: `npm run build`
5. Run seed against demo DB if needed: `SEED_DEMO_PASSWORD=... npm run db:seed`
6. Hard refresh browser (Ctrl+Shift+R)
7. Unregister old service worker in DevTools → Application

## Production Route Smoke Test
- [ ] `GET /api/backend/health` → 200
- [ ] `GET /api/backend/auth/me` (with token) → 200
- [ ] `GET /api/backend/admin-dashboard` (with admin token) → 200
- [ ] `GET /api/backend/admin/sos/active` (with admin token) → 200
- [ ] `GET /api/backend/admin/billing/summary` (with admin token) → 200
- [ ] `GET /api/backend/super-admin-hideaway-holler` (with super admin token) → 200
- [ ] `GET /api/backend/community?tab=feed` → 200

## Demo Accounts (password via `SEED_DEMO_PASSWORD`)
| Role | Email |
|------|-------|
| Admin | admin@hideawayholler.com |
| Super Admin | superadmin@appcreativesllc.com |
| Resident | maria@example.com |
| Resident 2 | carlos@example.com |
| Applicant | juan@example.com |
| Alumni | anna@example.com |

## Demo Flow Script

### Resident (maria@example.com)
1. Login → resident dashboard
2. Show weather, quick actions, journey tracker
3. Open Community Memories → view approved post
4. Submit a text memory (demo image)
5. Open Emergency SOS → demonstrate hold-to-trigger (optional live test)

### Admin (admin@hideawayholler.com)
1. Login → admin dashboard (metrics load)
2. Open Community Memories → approve pending post from Carlos
3. Open Check-ins → approve Carlos pending check-in
4. Open SOS Center → show history / test acknowledge-resolve if active alert exists
5. Open Billing → show $2,500 setup fee and $149/mo service plan

### Super Admin (superadmin@appcreativesllc.com)
1. Login → Hideaway Holler client dashboard
2. Show billing settings, account health, SOS logs (read-only)
3. Confirm SOS Settings are NOT in navigation

## Known Demo Limitations
- File uploads use `/tmp` on Vercel — durable cloud storage not yet configured
- Square payment links show as pending until Square SDK is integrated
- Mobile SOS push notifications intentionally disabled
- Weather alerts on admin dashboard are placeholder (0)
- Multi-client Super Admin supports Hideaway Holler only
