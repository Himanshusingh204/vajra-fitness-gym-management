<div align="center">
  <img src="frontend/public/logo.png" alt="VajraFitness Logo" width="180" />
  
  # VajraFitness

  <p>
    <strong>A Premium, Production-Ready SaaS Application for Gym Management</strong>
  </p>

  <p>
    <a href="#-features"><img alt="Features" src="https://img.shields.io/badge/Features-Extensive-success?style=for-the-badge&logo=appveyor" /></a>
    <a href="#-tech-stack"><img alt="Stack" src="https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20PostgreSQL-blue?style=for-the-badge" /></a>
    <a href="https://opensource.org/licenses/MIT"><img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" /></a>
  </p>
</div>

<br />

> VajraFitness is a complete end-to-end management solution tailored specifically for gym owners. It empowers owners to manage multiple gym branches, staff, trainers, and memberships seamlessly with a sleek, high-performance interface.

---

## ✨ Why VajraFitness?

- **Fully Multi-Tenant SaaS**: Manage global SaaS subscription plans and isolate data across different gyms and branches.
- **Enterprise-Grade Security**: Strict Role-Based Access Control (RBAC) separating Super Admins, Gym Owners, Trainers, and Staff.
- **Automated Workflows**: Automated membership expiry tracking, fee reminders, and attendance logs.
- **Modern User Experience**: Built with React 19 and Tailwind CSS v4 to deliver a lightning-fast, premium feel.

---

## 🎯 Key Features

### 🏢 Gym Operations
- **Membership Plans**: Create, customize, and assign dynamic pricing tiers.
- **Billing & Fees**: Track due payments, generate PDF receipts, and integrate with online payment gateways.
- **Attendance Tracking**: Frictionless daily check-ins for both members and staff.

### 🧑‍💻 Member Self-Service Dashboard
- **Workout Slips**: Members can access digital workout plans assigned by trainers.
- **PT Bookings**: Easily book and manage personal trainer sessions directly from the UI.
- **Profile & Progress**: Members can track their own membership lifecycles and payment history securely.

---

## 💻 Tech Stack

<details>
  <summary>Click to expand full technology stack details</summary>

### Frontend
- **Framework**: React 19 (TypeScript) & Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router v8

### Backend
- **Runtime**: Node.js & Express 5 (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + HTTP-only refresh tokens (argon2 hashing)
- **Document Generation**: pdfkit (for fee receipts & workout slips)
</details>

---

## 🚀 Quick Start (Local Development)

### Prerequisites
Make sure you have **Node.js (v18+)** and **Docker** (for running the database) installed on your machine.

### 1. Database & Backend Setup
```bash
# Spin up the PostgreSQL database via Docker
docker compose up -d db

# Navigate to backend and install dependencies
cd backend
npm install

# Push the schema and seed the database with demo data
npx prisma db push
npm run seed       

# Start the API server
npm run dev        
```

### 2. Frontend Setup
Open a new terminal window:
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start the frontend app
npm run dev        
```
*The app will be live at `http://localhost:5173`.*

---

## 🔐 Demo Credentials

When you run `npm run seed`, the database is populated with realistic demo data to help you explore the UI immediately!

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | `admin@vajrafitness.com` | `admin123` |
| **Gym Admin** | `owner@ironvalley.com` | `gym123` |
| **Demo User** | `first.lastN@demo.in` | `Demo@1234` |

---

## 📚 Deep Dive Documentation

Looking for the nitty-gritty details? We've extracted our highly detailed, in-depth architectural and deployment guides into the `docs/` folder:

- 🏗️ **[Architecture & Design](docs/architecture.md)**
- 🔒 **[Authentication & Security](docs/security.md)**
- 💳 **[Payments & Billing](docs/payments.md)**
- 🚀 **[Deployment Guide](docs/deployment.md)**
- 📖 **[Detailed Overview (Legacy README)](docs/detailed_overview.md)**

---

<div align="center">
  <p>Made with ❤️ for modern fitness centers.</p>
  <p>This project is licensed under the <strong>MIT License</strong>.</p>
</div>
