# SUNIA Backend & Admin

Backend API and admin panel for the SUNIA / Suniagch mobile fitness app.

## Project Structure

```
sunialt/
├── back/     # Express + Sequelize + PostgreSQL API
└── admin/    # Next.js + shadcn/ui admin panel
```

## Prerequisites

- Node.js 20+
- PostgreSQL with database `sunialt` created

## Backend Setup

```bash
cd back
cp .env.example .env
# Edit .env with your PostgreSQL credentials

npm install
npm run db:seed   # Creates admin, mobile catalog, demo users
npm run dev       # http://localhost:3071
```

Default admin credentials (change in `.env`):
- Email: `admin@sunia.mn`
- Password: `admin123`

Demo mobile user:
- Email: `temka123@gmail.com`
- Password: `temka123`

## Admin Panel Setup

```bash
cd admin
cp .env.local.example .env.local

npm install
npm run dev       # http://localhost:3070
```

## Database Models

- **admins** — Admin panel users
- **users** — Mobile users, stats, streak, subscription
- **exercises** — Push-up catalog used by the Flutter app
- **workouts** — Longer stretching/core programs
- **workout_sessions** — Completed camera workouts
- **challenges** — Daily / weekly / friends / duel
- **challenge_entries** — Challenge scores
- **products** — Shop catalog with ratings
- **orders / order_items** — Shop checkout
- **badges / user_badges** — Progress medals
- **duels** — Live duel results

## Admin API (`Authorization: Bearer <admin token>`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Current admin |
| GET | `/api/dashboard/stats` | Dashboard stats |
| CRUD | `/api/users` | Mobile users |
| CRUD | `/api/exercises` | Exercise catalog |
| CRUD | `/api/workouts` | Workout programs |
| GET/DELETE | `/api/sessions` | Workout sessions |
| CRUD | `/api/challenges` | Challenges |
| GET | `/api/leaderboard` | Rankings |
| GET | `/api/duels` | Duel history |
| CRUD | `/api/products` | Shop products |
| GET/PATCH | `/api/orders` | Shop orders |
| CRUD | `/api/badges` | Badges |

## Mobile API

Public:
- `GET /api/health`
- `POST /api/mobile/auth/register`
- `POST /api/mobile/auth/login`
- `GET /api/mobile/catalog`
- `GET /api/mobile/leaderboard`
- `GET /api/mobile/payments`

User JWT (`Authorization: Bearer <user token>`):
- `GET /api/mobile/bootstrap`
- `GET /api/mobile/me`
- `PATCH /api/mobile/me`
- `GET /api/mobile/dashboard`
- `POST /api/mobile/sessions` `{ exerciseId, exerciseTitle, repCount, durationSeconds, challengeId, timeLimitSeconds }`
- `POST /api/mobile/duels` `{ userScore, opponentScore, opponentName }`
- `POST /api/mobile/orders` `{ phone, address, items: [{ productId, title, quantity, unitPrice }] }`
- `POST /api/mobile/orders/:id/qpay/check` `{ confirm?: true }`

Admin settings:
- `GET/PUT /api/settings` — enable/disable QPay and merchant keys
