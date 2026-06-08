# HollerHub

Production-ready resident portal for **Hideaway Holler** — J1 student boarding and resident management in Sevierville, Tennessee.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Express 5, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT + role-based access (Applicant, Resident, Alumni, Admin) |
| Files | Local uploads (dev); structured for S3 later |

**No Stripe** — payments are tracked manually by admins.

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

API runs at **http://localhost:5000**

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_URL=http://localhost:5000

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
| Dashboard | `GET /admin/dashboard`, `GET /dashboard/admin` (alias), `GET /dashboard/resident` |
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

## Vercel deployment

Deploy this repo as two Vercel projects.

1. **Backend API project**
   - Root Directory: `backend`
   - Framework Preset: Other
   - Install Command: `npm ci`
   - Build Command: `npx prisma generate && npm run build`
   - Output Directory: leave blank
   - API health URL after deploy: `https://your-backend-domain.vercel.app/api/health`
   - Set backend env vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `NODE_ENV`
2. **Frontend web project**
   - Root Directory: `frontend`
   - Framework Preset: Next.js
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: leave blank
   - Set `NEXT_PUBLIC_API_URL` to the backend Vercel URL, without `/api`
   - Set `NEXT_PUBLIC_UPLOADS_URL` to the backend Vercel URL + `/uploads`

For production file storage, local serverless uploads are not durable. Use Vercel Blob, S3, or another persistent storage adapter before relying on uploads in production.

## Environment variables

### Backend (`backend/.env`)

```
DATABASE_URL=postgresql://...
PORT=5000
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://hollerhub.vercel.app
UPLOAD_DIR=./uploads
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_UPLOADS_URL=http://localhost:5000/uploads
```

## License

Private — Hideaway Holler
