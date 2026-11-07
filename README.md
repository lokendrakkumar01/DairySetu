# DairySetu 🥛

> **हर बूंद का हिसाब, अब डिजिटल अंदाज़ में।**

A premium, production-ready digital dairy management platform for village milkmen and their customers in India.

## 🏗️ Architecture

```
DairySetu/
├── backend/     → Node.js + Express + TypeScript + MongoDB
└── frontend/    → React + TypeScript + Vite + Tailwind CSS
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repo
```bash
git clone https://github.com/lokendrakkumar01/DairySetu.git
cd DairySetu
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Edit .env if needed (default points to localhost:5000)
npm install
npm run dev
```

### 4. Seed Database (Optional)
```bash
cd backend
npm run seed
```
This creates:
- Admin account: username `admin`, password `Admin@123`
- 5 sample customers (DS001–DS005)
- 30 days of November 2026 milk records
- Sample payments and bills

## 🔐 Default Credentials (after seeding)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Customer | `DS001` | `DS001@123` |

## 📱 Features

### Admin Portal
- 📊 Business analytics dashboard
- 👥 Customer management (unlimited)
- 🥛 Daily milk entry (quick + bulk mode)
- 💰 Monthly billing engine
- 💳 Payment tracking
- 📄 Bill generation (PNG/PDF/WhatsApp)
- ⚙️ Dairy settings & branding

### Customer Portal
- 🏠 Personal milk dashboard
- 📅 Daily milk history (calendar view)
- 🧾 Monthly statements
- 💸 Payment history
- 👤 Profile management

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS + Shadcn/UI
- Framer Motion
- Recharts
- TanStack Query v5
- React Hook Form + Zod

**Backend:**
- Node.js + Express + TypeScript
- Mongoose (MongoDB Atlas)
- JWT Authentication
- bcrypt
- Zod validation
- Helmet + CORS + Rate Limiting

## 🗄️ Database Collections

1. `DairyAccounts` — Multi-tenant dairy profiles
2. `Users` — Admin and customer accounts
3. `Customers` — Customer profiles with balances
4. `MilkRecords` — Daily milk entries with rate snapshots
5. `MilkRates` — Rate history with effective dates
6. `MonthlyBills` — Billing periods with snapshots
7. `Payments` — Payment transactions
8. `Adjustments` — Discounts, credits, debits
9. `Notifications` — System notifications
10. `DairySettings` — Per-dairy configuration
11. `AuditLogs` — Complete audit trail

## 🌐 API Endpoints

```
POST   /api/auth/admin/register
POST   /api/auth/admin/login
POST   /api/auth/customer/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/admin/dashboard
GET    /api/admin/profile
PUT    /api/admin/profile

GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
POST   /api/customers/:id/reset-password

GET    /api/milk-records
POST   /api/milk-records
PUT    /api/milk-records/:id
POST   /api/milk-records/bulk

GET    /api/milk-rates
POST   /api/milk-rates

POST   /api/bills/generate
GET    /api/bills
GET    /api/bills/:id
POST   /api/bills/:id/finalize

GET    /api/payments
POST   /api/payments
GET    /api/payments/:id

GET    /api/reports/daily-collection
GET    /api/reports/monthly-summary
GET    /api/reports/outstanding
GET    /api/reports/analytics
```

## 🚀 Deployment (Render)

### Backend on Render
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/app.js`
4. Add Environment Variables (from `.env.example`)
5. Deploy!

### Frontend on Render
1. Create a new **Static Site** on Render
2. Connect your GitHub repo
3. Settings:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Add Environment Variable: `VITE_API_URL=https://your-backend-url.onrender.com`
5. Deploy!

## 🔒 Security Features

- JWT access + refresh tokens
- bcrypt password hashing (12 rounds)
- Tenant isolation (all queries scoped to dairyId)
- Role-based access control (admin/customer)
- Rate limiting (100 req/15min)
- Helmet security headers
- Input validation with Zod
- Audit logging for financial operations
- Safe financial calculations (server-side only)

## 📄 License

MIT © DairySetu 2026

---

Built with ❤️ for Indian dairy farmers
