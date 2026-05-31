# Hideaway Holler Resident Portal

Custom resident portal for **Hideaway Holler** - J1 student housing and seasonal resident management in Sevierville, Tennessee.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Express 5, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT + role-based access (Applicant, Resident, Alumni, Admin) |
| Files | Local uploads (dev); structured for S3 later |

**No Stripe** — payments are tracked manually by admins.

## Internal positioning note

Future opportunity: This architecture could later be adapted into a general onboarding/resident management platform for other housing operators, but the current product is custom-built for Hideaway Holler.

## Features

- Seasonal cohorts (Summer/Winter per year)
- Resident journey tracking (Applicant → Alumni)
- Housing (properties, buildings, rooms, beds)
- Leases with digital acknowledgment
- Manual payment tracking with receipt uploads
- Notices, maintenance, gallery, local guide
- Check-in / check-out workflows
- Alumni portal with reapply
- Emergency contact center
- Admin dashboard with operational stats

## Project structure

```
hollerhub/
├── backend/          # Express API + Prisma
├── frontend/         # Next.js app
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Local setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE hollerhub;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API runs at **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:4000/api

npm install
npm run dev
```

App runs at **http://localhost:3000**

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hideawayholler.com | password123 |
| Resident | maria@example.com | password123 |
| Applicant | juan@example.com | password123 |
| Alumni | anna@example.com | password123 |

## API overview

Base URL: `/api`

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Dashboard | `GET /dashboard/admin`, `GET /dashboard/resident` |
| Seasons | `GET/POST /seasons`, `POST /seasons/:id/end` |
| Profiles | `GET/PATCH /profiles`, `GET /profiles/residents` |
| Applications | `GET/POST /applications`, `PATCH /applications/:id/review` |
| Housing | `GET /housing/properties`, `POST /housing/assign` |
| Leases | `GET/POST /leases`, `POST /leases/:id/sign` |
| Payments | `GET/POST/PATCH /payments`, `POST /payments/:id/receipt` |
| Notices | `GET/POST /notices`, `POST /notices/:id/read` |
| Maintenance | `GET/POST/PATCH /maintenance` |
| Gallery | `GET/POST /gallery` |
| Local guide | `GET/POST /local-guide` |
| Check-in/out | `GET/POST /check-in`, `POST /check-in/:id/approve` |
| Emergency | `GET /emergency` |

## Railway deployment

1. Create a Railway project with **PostgreSQL** + two services (API + Web).
2. **Backend service**
   - Root: `backend`
   - Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npx prisma db push && npm run db:seed && npm run start`
3. **Frontend service**
   - Root: `frontend`
   - Set `NEXT_PUBLIC_API_URL` to your backend URL + `/api`
   - Set `NEXT_PUBLIC_UPLOADS_URL` to backend URL + `/uploads`
   - Build: `npm install && npm run build`
   - Start: `npm run start`

For production file storage, implement the `StorageAdapter` in `backend/src/utils/storage.ts` for S3.

## Environment variables

### Backend (`backend/.env`)

```
DATABASE_URL=postgresql://...
PORT=4000
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_UPLOADS_URL=http://localhost:4000/uploads
```

## License

Private — Hideaway Holler
