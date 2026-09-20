# GymFlow — Gym Membership & Workout Management System

A production-style, full-stack **Gym Membership & Workout Plan Management System** built with **Node.js**, **Express.js**, **EJS**, and **MongoDB / Mongoose**.

GymFlow unites gym owners, certified personal trainers, and members into a unified platform for managing memberships, tracking body-weight progress, organizing daily workout splits, and monitoring gym attendance.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Features](#key-features)
- [User Roles & Permissions](#user-roles--permissions)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Seeding & Demo Credentials](#database-seeding--demo-credentials)
- [Running the Application](#running-the-application)
- [Security & Architecture Highlights](#security--architecture-highlights)
- [Screenshots & UI Showcase](#screenshots--ui-showcase)
- [Future Enhancements](#future-enhancements)

---

## Overview & Architecture

GymFlow follows a clean, maintainable **Model-View-Controller (MVC)** architectural pattern:

- **Models**: Mongoose schemas with pre-save password hashing, database-level unique constraints, and strict data validation.
- **Views**: Server-side rendered EJS templates organized into reusable partials (`header`, `navbar`, `sidebar`, `alerts`, `modalConfirm`, `footer`).
- **Controllers**: Granular, asynchronous business logic separating authentication, administration, trainer duties, member portals, workouts, attendance, and weight logging.
- **Middleware**: Strict role-based authorization (`authorizeRoles`), trainer-to-client ownership verification (`verifyTrainerMemberOwnership`), authenticated session guards, and centralized error handling.

---

## Key Features

### 1. Administration
- **Live Analytics Dashboard**: Real-time metrics for total members, active subscriptions, expired memberships, expiring soon (<= 7 days), active trainers, and today's attendance.
- **Membership Plan Distribution**: Dynamic **Chart.js** doughnut chart aggregating active memberships by plan type.
- **Trainer Capacity & Assignment**: Monitor client loads across personal trainers and assign or reassign trainers to members.
- **Membership Plan CRUD**: Define custom plans with duration (days), pricing (₹), and benefits.
- **Automatic Expiry Calculations**: The system calculates the exact expiry date from start date and duration days without requiring manual input.
- **Membership Renewals**: Seamless renewal engine maintaining historical subscription records.
- **Expiring Memberships Inspector**: Dedicated view highlighting memberships expiring within the next 7 days and expired accounts with color-coded status badges.
- **Attendance Inspector**: Real-time attendance log with date picker and search to inspect past check-ins.

### 2. Trainer Portal
- **Client Overview**: View assigned members, active memberships, workout plan statuses, and last check-ins.
- **Workout Plan Builder**: Build customized routines organized by day of the week (Monday through Sunday) with sets, reps, rest seconds, and trainer notes.
- **Client Ownership Security**: Trainers can only view and manage workout plans for members assigned to them. Direct URL tampering is prevented at the backend.

### 3. Member Portal
- **Personalized Dashboard**: Real-time countdown of membership days remaining, assigned trainer info, and today's scheduled workout split.
- **Daily Workout View**: Read-only schedule grouped by day with the current calendar day highlighted.
- **One-Click Daily Attendance**: Daily check-in button with server-side duplicate prevention (one check-in per calendar day).
- **Body Weight Progress & Chart.js**: Log body weights (validated 20 kg to 400 kg) with an interactive line chart tracking start weight, latest weight, and net change.
- **Profile Management**: Update name and contact phone number.

---

## User Roles & Permissions

| Role | Access Scope | Key Permissions |
| :--- | :--- | :--- |
| **Admin** | Gym-wide | Manage members, trainers, membership plans, renew memberships, assign trainers, inspect attendance. |
| **Trainer** | Assigned Clients | View assigned members, build and customize daily workout plans. Cannot modify membership plans or prices. |
| **Member** | Self-only | View daily workout, mark daily attendance, log body weight, view weight progress chart, update contact info. |

---

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB / Mongoose ODM (MongoDB Atlas or local MongoDB)
- **Frontend**: Server-side rendered EJS, HTML5, Vanilla CSS3, Vanilla JavaScript
- **Authentication**: `express-session`, `connect-mongo` (MongoDB session store), `bcrypt`
- **Visualization**: Chart.js (Line chart for weight progress, Doughnut chart for plan distribution)
- **Security**: Helmet, method-override, session cookies (`httpOnly: true`, `sameSite: 'lax'`)

---

## Project Structure

```text
gymflow/
├── config/
│   ├── db.js                 # MongoDB connection logic
│   └── session.js            # Express session & connect-mongo store setup
├── controllers/
│   ├── adminController.js    # Admin metrics, member & trainer directory, attendance
│   ├── attendanceController.js # Daily check-ins and attendance history
│   ├── authController.js     # Login, registration, and logout
│   ├── memberController.js   # Member dashboard, workout view, profile
│   ├── membershipController.js # Plan CRUD, assignment, and renewal
│   ├── trainerController.js  # Trainer dashboard and assigned clients
│   ├── weightController.js   # Weight logs, validation, and Chart.js API
│   └── workoutController.js  # Workout plan and exercise management
├── middleware/
│   ├── auth.js               # isAuthenticated and isGuest guards
│   ├── errorHandler.js       # 404 and 500 centralized handlers
│   ├── ownership.js          # Trainer-to-client ownership verification
│   └── roles.js              # Role-based access control (RBAC)
├── models/
│   ├── Attendance.js         # Daily check-in schema with unique daily index
│   ├── Membership.js         # Member subscription record with dates and status
│   ├── MembershipPlan.js     # Gym plan definition (duration, price, status)
│   ├── User.js               # Admin, Trainer, Member schema with bcrypt pre-save
│   ├── WeightLog.js          # Body weight log (20-400 kg)
│   └── WorkoutPlan.js        # Member workout plan with exercises by day
├── public/
│   ├── css/
│   │   └── style.css         # Modern fitness dashboard design system
│   └── js/
│       ├── charts.js         # Chart.js initialization for progress & analytics
│       └── main.js           # Responsive sidebar, alerts, and modal dialogs
├── routes/
│   ├── adminRoutes.js        # /admin/*
│   ├── authRoutes.js         # /, /login, /register, /logout
│   ├── memberRoutes.js       # /member/*
│   └── trainerRoutes.js      # /trainer/*
├── scripts/
│   └── seed.js               # Database seeder with demo accounts & realistic data
├── utils/
│   ├── dateUtils.js          # Date normalization, formatting, and time helpers
│   └── membershipUtils.js    # Expiry calculation and status determination
├── views/
│   ├── admin/                # Admin views (dashboard, members, trainers, plans, expiring)
│   ├── auth/                 # Login & Registration views
│   ├── errors/               # 403, 404, and 500 error pages
│   ├── member/               # Member views (dashboard, workout, attendance, progress)
│   ├── partials/             # Header, navbar, sidebar, alerts, modalConfirm, footer
│   ├── trainer/              # Trainer views (dashboard, members, workout editor)
│   └── landing.ejs           # Public landing page
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── app.js                    # Express application entry point
└── package.json              # Project dependencies and npm scripts
```

---

## Installation & Setup

### Prerequisites
- **Node.js** (v18.x or v20.x+ recommended)
- **MongoDB** (Local instance or MongoDB Atlas cluster URI)

### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd gym-management-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## Environment Variables

Configure your `.env` file with appropriate values:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/gymflow
SESSION_SECRET=gymflow_dev_secret_key_89437291847291847291
NODE_ENV=development
```

> **Note for MongoDB Atlas**: Replace `MONGODB_URI` with your connection string:
> `mongodb+srv://<username>:<password>@cluster0.mongodb.net/gymflow?retryWrites=true&w=majority`

---

## Database Seeding & Demo Credentials

Populate the database with pre-configured Admin, 3 Trainers, 10 Members, 4 Membership Plans, workout routines, attendance logs, and weight history:

```bash
npm run seed
```

### Pre-loaded Demo Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gymflow.com` | `Admin@123` | Full administrative control |
| **Trainer** | `marcus.trainer@gymflow.com` | `Trainer@123` | Specialization: Strength Training |
| **Trainer** | `sarah.trainer@gymflow.com` | `Trainer@123` | Specialization: Weight Loss |
| **Trainer** | `alex.trainer@gymflow.com` | `Trainer@123` | Specialization: Functional Training |
| **Member** | `robert.chen@example.com` | `Member@123` | Active Annual Plan, full weight chart history |
| **Member** | `emily.davis@example.com` | `Member@123` | Active Quarterly Plan, attendance history |
| **Member** | `jessica.taylor@example.com` | `Member@123` | **Expiring Soon** (3 days left) |
| **Member** | `james.thomas@example.com` | `Member@123` | **Expired** Monthly Plan |

---

## Running the Application

### Development Mode (with automatic reload via nodemon):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

Visit `http://localhost:3000` in your web browser.

---

## Security & Architecture Highlights

1. **Session-Based Authentication**:
   - Uses `express-session` backed by `connect-mongo` for persistent storage across server restarts.
   - Cookies configured with `httpOnly: true`, `sameSite: 'lax'`, and `secure` in production.
2. **Strict Role-Based Access Control (RBAC)**:
   - Protected routes check `req.session.user.role`. Unauthorized visits result in custom **403 Access Denied** responses.
3. **Trainer-Client Ownership Isolation**:
   - Trainers cannot access client details or workout plans of members assigned to other trainers. URLs with arbitrary member IDs are strictly validated against `member.trainer`.
4. **Duplicate Attendance Prevention**:
   - Enforced both at the controller level and at the database level with a compound unique index on `{ member: 1, date: 1 }`.
5. **Robust Input Validation**:
   - Body weight strictly limited between 20 kg and 400 kg.
   - Membership duration (> 0) and prices (>= 0) validated on both client and server.

---

## Screenshots & UI Showcase

*Placeholder for application screenshots:*
- **Landing Page**: Modern hero section with fitness features overview.
- **Admin Dashboard**: Real-time metric cards, Chart.js doughnut chart, and recent attendance feed.
- **Trainer Workout Builder**: Day-by-day split creator with sets, reps, and cues.
- **Member Progress**: Interactive Chart.js line chart showing weight trend over time.

---

## Future Enhancements

- Email/SMS notifications for upcoming membership expirations.
- QR-code-based gym check-in scanner at the front desk.
- Trainer-client messaging and exercise video attachments.
- Payment gateway integration (Stripe / Razorpay) for self-service online renewals.

---

## License

This project is licensed under the ISC License.
# Web-assignment-20-09-Ayush-Kumar-Singh
