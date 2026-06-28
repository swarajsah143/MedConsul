# MedCounsel AI

A comprehensive NEET UG counseling assistant that helps medical aspirants analyze closing ranks, compare college fees, explore detailed college reviews, and prepare their document checklist for admission.

## Features

### Closing Rank Insights
- Historical closing rank and score data across 10+ top medical colleges
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
- Browse 8 detailed medical college profiles with search and filters
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
- **JSON file store** for data persistence (zero native dependencies)
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
npm run seed
```

This creates three demo accounts. See [CREDENTIALS.md](./CREDENTIALS.md) for login details.

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

Create a `.env` file in the `server/` directory:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## License

Private project. All rights reserved.
