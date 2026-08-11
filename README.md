<div align="center">
  <img src="frontend/public/logo.png" alt="VajraFitness Logo" width="150" />
  
  <h1>VajraFitness Management System</h1>

  <p>
    <strong>Next-Generation SaaS platform for modern fitness centers, automating memberships, billing, and staff management in one unified experience.</strong>
  </p>

  <p>
    <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge&color=0052FF" />
    <img alt="React" src="https://img.shields.io/badge/React-19-blue.svg?style=for-the-badge&logo=react&color=61DAFB&logoColor=black" />
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-green.svg?style=for-the-badge&logo=nodedotjs&color=339933" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-blue.svg?style=for-the-badge&logo=postgresql&color=4169E1" />
  </p>
</div>

<br />

## 🌟 About The Project

Managing a gym shouldn't mean drowning in spreadsheets. **VajraFitness** is a premium, multi-tenant SaaS application built to scale with your business. Whether you're running a single boutique studio or a nationwide franchise, VajraFitness provides the infrastructure to manage members, trainers, hardware, and finances all in one place.

---

## ⚡ Core Features

<details>
  <summary><b>🏢 Multi-Branch & SaaS Management</b></summary>
  <ul>
    <li><b>Global SaaS Plans:</b> Define tier-based limits (members, trainers, staff) across the entire platform.</li>
    <li><b>Branch Isolation:</b> Strict data separation ensures Gym A can never see Gym B's data.</li>
    <li><b>Role-Based Access (RBAC):</b> Bulletproof JWT middleware routes for Super Admins, Gym Owners, Trainers, and Staff.</li>
  </ul>
</details>

<details>
  <summary><b>💵 Billing, Fees & Analytics</b></summary>
  <ul>
    <li><b>Smart Memberships:</b> Custom pricing tiers with automated expiration tracking.</li>
    <li><b>Integrated Payments:</b> Track dues, generate dynamic PDF receipts, and process online transactions securely.</li>
    <li><b>Revenue Reports:</b> Beautiful dashboard charts mapping real-time branch revenue and sign-ups.</li>
  </ul>
</details>

<details>
  <summary><b>🧑‍💻 Member & Trainer Portals</b></summary>
  <ul>
    <li><b>Self-Service Dashboards:</b> Members can track their own attendance, payments, and membership lifecycles.</li>
    <li><b>Digital Workouts:</b> Trainers assign rich workout slips directly to member accounts.</li>
    <li><b>PT Bookings:</b> Seamless scheduling between members and personal trainers.</li>
  </ul>
</details>

---

## 🛠️ Technology Stack

VajraFitness is built on a robust, modern tech stack designed for speed, security, and scalability.

### Client-Side
* **React 19** & **TypeScript** - For a type-safe, lightning-fast UI.
* **Tailwind CSS v4** - Premium, highly-customizable design system.
* **Zustand** & **TanStack Query** - Efficient client-side state and data fetching.

### Server-Side
* **Node.js** & **Express 5** - Scalable API architecture.
* **Prisma ORM** - Type-safe database queries and schema management.
* **PostgreSQL** - Relational data integrity.
* **Argon2 & JWT** - Industry-standard secure authentication.

---

## 🚀 Getting Started

Want to run the platform locally? You can have it up and running in minutes.

> **Requirement:** Ensure you have Node.js (v20+) and a PostgreSQL instance
> (local install, or a free [Neon](https://neon.tech) project).

<details>
<summary><b>Click here to view setup instructions</b></summary>

<br />

1. **Point at a database** — set `DATABASE_URL` in `backend/.env` to any
   running Postgres instance (see `backend/.env.example`).

2. **Start the Backend API**
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run seed       # Injects realistic demo data!
   npm run dev        # API running on http://localhost:5000
   ```

3. **Start the Frontend UI**
   ```bash
   cd frontend
   npm install
   npm run dev        # UI running on http://localhost:5173
   ```
</details>

---

## 🔐 Sandbox Credentials

If you ran `npm run seed` during setup, your database is already populated with demo users and realistic data. Try logging in!

| Account Type | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** *(Platform Owner)* | `admin@vajrafitness.com` | `admin123` |
| **Gym Admin** *(Branch Owner)* | `owner@ironvalley.com` | `gym123` |
| **Member** *(Gym Goer)* | `first.lastN@demo.in` | `Demo@1234` |

---

## 📚 Technical Documentation

If you are looking for advanced deployment guides, security models, or architectural blueprints, please refer to our legacy documentation file:

👉 **[View Technical Documentation (docs/detailed_overview.md)](docs/detailed_overview.md)**

---

<div align="center">
  <p><strong>Propel your fitness business into the future.</strong></p>
  <p>&copy; VajraFitness | Licensed under the MIT License.</p>
</div>
