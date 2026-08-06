# MedCounsel AI

A comprehensive NEET UG counseling assistant that helps medical aspirants analyze closing ranks, compare college fees, explore detailed college reviews, and prepare their document checklist for admission.

## Features

### Closing Rank Insights
- Historical closing rank and score data across 900+ medical colleges (real, sourced data)
- Filter by state, college, course, category, quota, round, rank range, and score range
- Sortable, paginated data table with CSV export
- Detailed historical trend view with interactive line charts (Recharts)
- Year-over-year rank/score comparison and round-wise bar charts

### Fee & Seat Matrix
- Compare tuition fees, hostel charges, miscellaneous fees, and security deposits
- View seat distribution across government, management, and NRI quotas  
- Filter by state, college, course, category, and quota
- Detailed fee breakdown with pie charts, year-wise stacked bar charts, and scholarship info
- CSV export support

### College Reviews
- Browse 900+ medical college profiles with search and filters
- Filter by state and college type (Government, Private, Deemed)
- Detailed review pages covering faculty, infrastructure, hospital facilities, clinical exposure, patient load, hostel, student life, pros/cons, gallery, and embedded review videos

### Document Checklist
- Two-section checklist: Online Registration and Physical Reporting documents
- 32 documents with mandatory/optional status, format, file size, and detailed notes
- Filter by state, category, and counselling type
- Persistent progress tracking (saved to localStorage)
- Print and download checklist as text file
- SVG progress ring with per-section progress bars

### Authentication
- Email + password registration and login
- JWT access tokens with httpOnly refresh token cookies
- Forgot password and reset password flow
- Remember me functionality
- Session persistence across page reloads
- Protected routes with automatic redirect
- User profile dropdown with sign out

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 8** for build tooling
- **React Router 7** for client-side routing
- **Tailwind CSS 3** for styling
- **Recharts 3** for data visualization
- **Lucide React** for icons
- **Radix UI** for accessible primitives

### Backend
- **Express 5** with TypeScript
- **MongoDB** (Mongoose) for data persistence, with a JSON file-store fallback when `MONGODB_URI` is unset
- **bcryptjs** for password hashing (12 rounds)
- **jsonwebtoken** for JWT authentication
- **cookie-parser** for httpOnly refresh token cookies

## Project Structure

```
MedConsul/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # AuthLayout, DashboardLayout
│   │   │   └── ui/            # Button, Card, Input, Label, etc.
│   │   ├── lib/               # API client, mock data, utilities
│   │   ├── pages/             # All page components
│   │   ├── providers/         # AuthProvider context
│   │   ├── routes/            # Route definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── server/                    # Express backend
│   ├── src/
│   │   ├── config/            # Environment, database
│   │   ├── controllers/       # Request handlers
│   │   ├── middlewares/       # Auth middleware
│   │   ├── models/            # User, Token models
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── utils/             # JWT, password, validation
│   │   ├── seed.ts            # Demo account seeder
│   │   └── server.ts          # Entry point
│   └── data/                  # JSON database (auto-created)
└── package.json               # Root scripts (dev, seed)
```

## Getting Started

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MedConsul

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Seed Demo Accounts

```bash
SEED_ADMIN_PASSWORD=<min 10 chars> npm run seed
```

This creates three demo accounts. See [CREDENTIALS.md](./CREDENTIALS.md) for login details.

### Load the domain data (MongoDB)

Colleges, ranks, fees and allotments live in MongoDB; the source JSON is committed under
`data/out/`. To populate a fresh database:

1. Set `MONGODB_URI` in `.env` to a MongoDB you can reach (a local `mongod`, or your own Atlas).
2. Start the app: `npm run dev`.
3. In another terminal, run the importer (it logs in with the admin account from the seed step):

   ```bash
   SEED_ADMIN_PASSWORD=<same as above> node data/import.mjs
   ```

   It loads colleges first, then the rank/fee/allotment rows that reference them (~222k
   allotments, so allow a minute or two). Re-running is idempotent.

Without MongoDB the app still runs on a JSON auth fallback — logins work, but the data pages
return 503 and MedAssist grounds on a small built-in sample instead of the full dataset.

### Run Development Server

```bash
# Start both client and server concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Run Individually

```bash
# Client only
npm run dev:client

# Server only
npm run dev:server
```

### Build for Production

```bash
# Build client
cd client && npm run build

# Build server
cd server && npm run build
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Sign in with email/password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Sign out and clear session |
| POST | `/api/auth/forgot-password` | Request password reset token |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get authenticated user profile |
| GET | `/api/health` | Server health check |

## Environment Variables

Copy `.env.example` to `.env` in the **project root** (not `server/`) and fill in the values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string. Domain data (colleges, ranks, fees, allotments) requires it; auth falls back to a local JSON store if unset. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Required — the server refuses to start without strong values. |
| `PORT`, `CLIENT_URL` | API port and the frontend origin (used for CORS). |
| `AI_API_KEY`, `AI_API_BASE_URL`, `AI_MODEL` | Powers the MedAssist AI chatbot — see below. |

### Enable MedAssist AI (chatbot)

MedAssist answers questions conversationally (like ChatGPT) and grounds NEET-specific
answers in the app's own data. It needs a key for any OpenAI-compatible model, and
**Groq offers one for free:**

1. Get a free API key at **https://console.groq.com** → sign in → **API Keys** → **Create API Key**.
2. Paste it into your `.env`: `AI_API_KEY=gsk_...` — the base URL and model are already set for Groq in `.env.example`.
3. Restart: `npm run dev`.

Without a key, the chatbot still runs in a limited **offline mode** that answers from the
app's data only. Each contributor uses their **own** free key — **never commit a real key**
(a key pushed to a public repo is scraped and auto-revoked within minutes).

## License

Private project. All rights reserved.
