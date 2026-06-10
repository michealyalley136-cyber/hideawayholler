# Resident Dashboard Manual Test

## Login
- Email: `maria@example.com`
- Password: value from `SEED_DEMO_PASSWORD` (default demo: `password123`)

## Seed demo data (run once against target database)
```bash
cd backend
set SEED_DEMO_PASSWORD=password123
npx prisma db seed
```

## API test
```bash
curl -s -H "Authorization: Bearer <token>" https://hollerhub-api.vercel.app/api/profiles/resident-dashboard
```

## Expected dashboard values for Maria Santos
- Unread notices: `3` (or more)
- Recent payments: `3`
- Open maintenance: `1`
- Open supply requests: `1`
- House assignment: `Bear House`
- Lease status: `PENDING SIGNATURE`
- Journey: multiple steps with current = `Active Resident`
- Recent payments list: deposit + May rent + June rent

## UI test
1. Open https://hollerhub.vercel.app/login
2. Sign in as Maria Santos
3. Open `/dashboard`
4. Confirm widgets show real counts (not `-` or infinite Loading)
