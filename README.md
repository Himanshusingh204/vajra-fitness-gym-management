<div align="center">
  <img src="frontend/public/logo.png" alt="VajraFitness Logo" width="200" />
  <h1>VajraFitness</h1>
  <p><strong>Premium SaaS Application for Gym Management</strong></p>
</div>

---

VajraFitness is a comprehensive, production-ready SaaS application designed specifically for gym owners. It offers a complete solution for managing multiple gyms, staff, trainers, and members, featuring role-based access control and a modern, high-performance user interface.

## ✨ Key Features

- **Gym Operations**: Comprehensive management for membership plans, billing, and attendance tracking.
- **Member Self-Service**: Dedicated dashboards for members to book trainers, view workout plans, and track payments.
- **Role-Based Access**: Robust security separating Super Admins, Gym Owners, Trainers, and Staff.
- **SaaS Platform Ready**: Manage global SaaS subscription plans and multi-tenant gym setups.

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, JWT Authentication

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or use the provided `docker-compose.yml`)

### 1. Database & Backend Setup
```bash
# Start Postgres via Docker
docker compose up -d db

cd backend
npm install
npx prisma db push
npm run seed       # Seeds the database with test gyms and users
npm run dev        # Starts the backend server on port 5000
```

### 2. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev        # Starts the frontend on port 5173
```

## 🔐 Demo Credentials

These credentials are automatically created when you run `npm run seed`. *(For local development only!)*

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | `admin@vajrafitness.com` | `admin123` |
| **Gym Admin** | `owner@ironvalley.com` | `gym123` |
| **Demo User** | `first.lastN@demo.in` | `Demo@1234` |

## 📚 Documentation

For detailed information on the architecture, security, API, and deployment, please check out the comprehensive guides in the `docs/` folder:

- [Architecture & Design](docs/architecture.md)
- [Authentication & Security](docs/security.md)
- [Payments & Billing](docs/payments.md)
- [Deployment Guide](docs/deployment.md)

## 📜 License

This project is licensed under the MIT License.
