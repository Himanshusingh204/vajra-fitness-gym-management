<div align="center">
  <img src="frontend/public/logo.png" alt="VajraFitness Logo" width="220" />
  
  <h1>🏋️‍♂️ VajraFitness</h1>

  <p>
    <strong>A Premium, Production-Ready SaaS Application for Gym Management</strong>
  </p>

  <p>
    <a href="#-features"><img alt="Features" src="https://img.shields.io/badge/Features-Extensive-success?style=for-the-badge&logo=appveyor" /></a>
    <a href="#%EF%B8%8F-tech-stack"><img alt="Stack" src="https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20PostgreSQL-blue?style=for-the-badge" /></a>
    <a href="https://opensource.org/licenses/MIT"><img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" /></a>
  </p>
</div>

<br />

> **VajraFitness** is a complete, end-to-end management solution tailored specifically for gym owners. It empowers owners to manage multiple gym branches, staff, trainers, and memberships seamlessly with a sleek, high-performance interface.

---

## 📑 Table of Contents
1. [✨ Key Features](#-key-features)
2. [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
3. [🚀 Quick Start (Local Setup)](#-quick-start-local-setup)
4. [🔐 Demo Credentials](#-demo-credentials)
5. [📚 Deep Dive Documentation](#-deep-dive-documentation)

---

## ✨ Key Features

VajraFitness is built to handle the complexities of modern fitness centers, all from a single dashboard.

| 🏢 Gym Operations | 🧑‍💻 Member Dashboard |
| --- | --- |
| **Multi-Tenant SaaS:** Isolate data across branches.<br/>**Membership Plans:** Customize dynamic pricing tiers.<br/>**Billing & Fees:** Track payments & generate PDFs.<br/>**Automated Workflows:** Expiry & fee reminders.<br/>**Attendance:** Frictionless daily check-ins. | **Workout Slips:** Digital workout plans from trainers.<br/>**PT Bookings:** Book personal trainer sessions.<br/>**Profile & Progress:** Track membership lifecycles.<br/>**Secure Auth:** Safe, modern login & JWT sessions. |

---

## 🛠️ Tech Stack

Built with the modern web in mind to ensure blazing fast speeds and ultimate reliability.

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19 (TypeScript), Vite, Tailwind CSS v4, Zustand, TanStack Query, React Router v8 |
| **Backend** | Node.js, Express 5 (TypeScript), Prisma ORM, PDFKit, Argon2 |
| **Database** | PostgreSQL |
| **Architecture**| REST API, JWT Authentication, HTTP-only refresh tokens |

---

## 🚀 Quick Start (Local Setup)

Get the project running locally in under 3 minutes. Make sure you have **Node.js (v18+)** and **Docker** installed.

### 1️⃣ Database & Backend Setup
```bash
# 1. Spin up the PostgreSQL database via Docker
docker compose up -d db

# 2. Navigate to backend and install dependencies
cd backend
npm install

# 3. Push the schema and seed the database with demo data
npx prisma db push
npm run seed       

# 4. Start the API server (Runs on Port 5000)
npm run dev        
```

### 2️⃣ Frontend Setup
Open a new terminal window:
```bash
# 1. Navigate to frontend and install dependencies
cd frontend
npm install

# 2. Start the frontend app
npm run dev        
```
🎉 *The app will now be live at `http://localhost:5173`.*

---

## 🔐 Demo Credentials

When you run `npm run seed`, the database is populated with realistic demo data so you can test the UI immediately!

| Role | Email Address | Password |
| :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@vajrafitness.com` | `admin123` |
| 🏢 **Gym Admin** | `owner@ironvalley.com` | `gym123` |
| 🏋️ **Demo User** | `first.lastN@demo.in` | `Demo@1234` |

---

## 📚 Deep Dive Documentation

For all the nitty-gritty details, including full architectural decisions, API routing, and production deployment checklists, please see our detailed legacy documentation:

- 📖 **[Detailed Overview & Technical Documentation](docs/detailed_overview.md)**

---

<div align="center">
  <p>Made with ❤️ for modern fitness centers.</p>
  <p>This project is licensed under the <strong>MIT License</strong>.</p>
</div>
