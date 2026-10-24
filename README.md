# 🏦 BlockBank — Blockchain-Based Secure Banking System with Fraud Detection

BlockBank is a full-stack online banking application that makes transaction records **tamper-evident** using a private, signed SHA-256 blockchain and **flags suspicious transfers** using a rule-based fraud detection engine.

It was built as a final-year B.Tech project at **D. Y. Patil College of Engineering and Technology, Kolhapur** (Department of Computer Science and Engineering).

> **In one line:** every successful transfer becomes a block that is hashed, linked to the previous block and digitally signed by an authorized bank server, so any later edit to stored data can be detected.

---

## 📑 Table of Contents

- [Problem Statement](#-problem-statement)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [How the Blockchain Works](#-how-the-blockchain-works)
- [Fraud Detection Rules](#-fraud-detection-rules)
- [Security Features](#-security-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Creating the First Admin](#-creating-the-first-admin)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Limitations and Future Work](#-limitations-and-future-work)
- [Team](#-team)

---

## 🎯 Problem Statement

Online banking makes moving money quick, but two problems remain:

1. **Stored transaction records can be altered** without permission.
2. **Fraudulent transfers** can still be submitted.

Existing work either leaves out fraud detection, stays at a conceptual level, or does not build a complete banking system. BlockBank combines **account management, tamper-evident transaction storage and fraud alerts** in a single working application.

---

## ✨ Key Features

### 👤 User Features
- Register and log in (account stays *pending* until an admin approves it)
- Dashboard with balance and spending charts
- Send money to another user by **Payment ID** (e.g. `name1234@blockbank`) with receiver name verification
- **4-digit transaction PIN** required for every transfer
- Transaction history with search and filters (All / Sent / Received / Cancelled)
- Fraud warning screen: review the reasons, then **cancel** or **proceed**
- Personal security alerts page
- **Self-freeze** the account instantly if compromise is suspected
- Profile management and password change
- In-app notification bell (money sent / received, approval, freeze, PIN unlock)

### 🛡️ Admin Features
- Approve or reject new registrations (bank account number and Payment ID are generated on approval)
- Freeze, unfreeze and delete users
- View all transactions across the bank
- **Blockchain explorer** showing every block as a visual chain
- **One-click chain validation** with per-block status (OK / WARNING / CRITICAL) and plain-English reasons
- Automatic periodic validation while the admin is logged in
- **Fraud monitoring** page: every flagged transfer, the rules it triggered, and whether the user cancelled or proceeded
- Admin notifications for new registrations, fraud events and chain integrity failures
- Admin login history with IP address (last 3 logins)
- Downloadable PDF financial report

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, Tailwind CSS 4, Material UI, React Router, Axios, Framer Motion, Chart.js / MUI X Charts, React Flow (`@xyflow/react`), jsPDF + jsPDF-AutoTable |
| **Backend** | Node.js, Express 5, Mongoose |
| **Database** | MongoDB (MongoDB Atlas recommended) |
| **Security** | bcrypt, JSON Web Tokens (JWT), SHA-256 hashing, RSA-2048 digital signatures (Node `crypto`) |
| **Tools** | VS Code, Git & GitHub, Postman |

---

## 🏗️ System Architecture

```
┌────────────────────┐        REST (JSON + JWT)        ┌──────────────────────────────┐
│  React Frontend    │ ──────────────────────────────► │  Node.js + Express Backend   │
│  (User + Admin UI) │ ◄────────────────────────────── │                              │
└────────────────────┘                                 │  ├─ Authentication module    │
                                                       │  ├─ Banking module           │
                                                       │  ├─ Blockchain module        │
                                                       │  └─ Fraud detection module   │
                                                       └──────────────┬───────────────┘
                                                                      │ Mongoose
                                                       ┌──────────────▼───────────────┐
                                                       │           MongoDB            │
                                                       │ Users · Transactions ·       │
                                                       │ PaymentBlocks · FraudAlerts  │
                                                       │ · Notifications              │
                                                       └──────────────────────────────┘
```

### Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **User & Admin Management** | Registration, login, admin approval, account number and Payment ID generation |
| 2 | **Banking Services** | Balance, money transfer with PIN, transaction history, freeze controls |
| 3 | **Blockchain** | Creates signed blocks, links them with SHA-256 hashes, validates the whole chain |
| 4 | **Fraud Detection** | Applies rule checks to every transfer and records alerts for the admin |

### Transfer Flow

```
User enters transfer
        │
        ▼
  Verify PIN (lockout after 3 wrong tries)
        │
        ▼
  Fraud rules check ──► Suspicious ──► Warning shown + FraudAlert saved
        │                                   │ user cancels → transaction logged as cancelled
        │ Safe                              │ user proceeds → admin notified
        ▼                                   ▼
  Debit sender / credit receiver (atomic balance updates)
        │
        ▼
  Save Transaction ──► Create signed block ──► Validate chain ──► Notify users
```

---

## ⛓️ How the Blockchain Works

BlockBank uses a **private blockchain** with **Proof of Authority (PoA)** consensus. A single authorized bank server acts as the validator, so no mining is needed.

### Block structure

| Field | Description |
|-------|-------------|
| `index` | Position of the block in the chain (starts at 0) |
| `transactionId` | ID of the related bank transaction |
| `senderPaymentId`, `receiverPaymentId` | Payment IDs of both parties |
| `senderName`, `receiverName` | Names of both parties |
| `amount` | Transfer amount |
| `timestamp` | Time of the transaction |
| `previousHash` | Hash of the previous block (`"0"` for the first block) |
| `signature` | RSA-2048 / SHA-256 digital signature by the authority |
| `authorityPublicKey` | Public key of the authority |
| `hash` | SHA-256 hash of the block data and its signature |

### Block creation
1. A transfer succeeds and is saved as a transaction.
2. The server builds the block data from the transaction and the previous block's hash.
3. The authority **signs** the data with its private key (PoA).
4. A **SHA-256 hash** of the data plus the signature becomes the block's hash.
5. The block is appended to the chain and the whole chain is validated again.

### Chain validation checks

| Check | What it detects |
|-------|-----------------|
| **Hash check** | Block data was modified after it was stored |
| **Link check** | `previousHash` does not match the previous block's hash |
| **Signature check** | Block was not signed by the authorized bank authority |
| **Index check** | Blocks were deleted, inserted or reordered |
| **Timestamp check** | A block is older than the block before it |
| **Transaction cross-check** | Amount, sender or receiver differ from the real bank transaction |
| **Orphan detection** | A bank transaction exists with no block on the chain |

Each block is graded **OK**, **WARNING** or **CRITICAL**, and the admin sees plain-English reasons for every failure. A failed check also creates an admin notification.

> **Chain validation vs fraud detection:** validation shows whether *stored* records were changed. Fraud rules flag *suspicious new transfers*. They do different jobs and work together.

---

## 🚨 Fraud Detection Rules

Fraud detection is **rule-based**, so every rule is easy to explain and no training dataset is needed. Each transfer is checked before it is executed.

| # | Rule | Trigger |
|---|------|---------|
| 1 | **Large amount** | Amount above ₹50,000 |
| 2 | **Rapid transfers** | 5 or more transfers by the same sender in the last 2 minutes |
| 3 | **Duplicate transfer** | Same sender, receiver and amount within 2 minutes |
| 4 | **Failed PIN attempts** | Transfer made after 2 failed PIN attempts |
| 5 | **New account, large transfer** | Account less than 24 hours old sending more than ₹10,000 |
| 6 | **Repeated receiver** | 5 or more transfers to the same receiver today |
| 7 | **Unusual hour** | Transfer between 1 AM and 5 AM IST |

When a rule triggers, the transfer is paused, a **FraudAlert** is stored, and the user must choose to cancel or proceed. Severity is marked **critical** if the amount exceeds ₹50,000 or two or more rules trigger. The admin can see every alert and the user's decision in the Fraud Monitoring page.

---

## 🔐 Security Features

- Passwords and transaction PINs hashed with **bcrypt**
- **JWT** authentication with role-based access (user / admin)
- Admin-only routes protected by middleware
- **Admin approval** required before an account can log in
- **PIN lockout**: 3 wrong PIN attempts lock transfers for 30 minutes
- **Atomic balance updates** with a balance check at the database level
- Frozen accounts cannot send or receive money
- Users can **self-freeze** their account
- Input validation on registration (username, Gmail address, password rules, date of birth, PIN)
- Secrets and keys are kept in environment variables, never in the code

---

## 📁 Project Structure

```
Blockbank-project/
├── backend/
│   ├── config/            # MongoDB connection
│   ├── controllers/       # auth, transfer, admin, blockchain, notification logic
│   ├── middleware/        # JWT verification and admin check
│   ├── models/            # User, Transaction, PaymentBlock, FraudAlert, Notification
│   ├── routes/            # API route definitions
│   ├── scripts/           # generateKeys.js, clearPaymentBlocks.js
│   ├── utils/             # paymentBlockchain.js, fraudDetection.js
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── public/
    └── src/
        ├── components/    # Sidebar, NotificationBell, blockchain visualisation, admin views
        ├── pages/         # Landing, Login, Register, Dashboard, TransferMoney, Transactions,
        │                  # Balance, FraudAlerts, Profile, AdminDashboard, AdminProfile
        ├── services/      # Axios API client
        └── utils/         # PDF report generator
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer, with npm
- A [MongoDB](https://www.mongodb.com/) database (a free MongoDB Atlas cluster works well)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Suyogkumbhar03/Blockbank-project.git
cd Blockbank-project
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env     # on Windows: copy .env.example .env
```

Generate the authority's RSA key pair:

```bash
node scripts/generateKeys.js
```

Copy the printed private and public keys into your `.env` file (see [Environment Variables](#-environment-variables)), then start the server:

```bash
npm run dev      # development (nodemon)
# or
npm start        # production
```

The API runs at `http://localhost:5000`.

### 3. Set up the frontend

```bash
cd ../frontend
npm install
```

Create a `frontend/.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the app:

```bash
npm run dev
```

The app opens at `http://localhost:5173`.

### 4. Create an admin, then use the app
1. [Create the first admin](#-creating-the-first-admin).
2. Register a normal user from the **Register** page.
3. Log in as admin and approve the user.
4. Log in as the user and make a transfer.
5. Open the admin **Blockchain** section to see the new block and run validation.

---

## 🔧 Environment Variables

### `backend/.env`

| Variable | Description |
|----------|-------------|
| `PORT` | Port for the API server (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long, random secret used to sign login tokens |
| `AUTHORITY_PRIVATE_KEY` | RSA-2048 private key (PEM) used to sign blocks |
| `AUTHORITY_PUBLIC_KEY` | Matching RSA-2048 public key (PEM) |

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
AUTHORITY_PRIVATE_KEY="your_rsa_2048_private_key_pem"
AUTHORITY_PUBLIC_KEY="your_rsa_2048_public_key_pem"
```

### `frontend/.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API |

> ⚠️ **Never commit `.env` files or private keys.** Both are listed in `.gitignore`. Use different keys and secrets for development and production.

---

## 👑 Creating the First Admin

There is no public admin sign-up, so the first admin is created with a one-time seed script. Create `backend/seedAdmin.js` locally (it is git-ignored, so it is never uploaded):

```js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PIN, MONGO_URI } = process.env;

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME || !ADMIN_PIN) {
    console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME and ADMIN_PIN in your .env file.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  if (await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })) {
    console.log('Admin already exists.');
    process.exit(0);
  }
  await User.create({
    name: ADMIN_NAME,
    fullName: ADMIN_NAME,
    username: 'admin',
    email: ADMIN_EMAIL.toLowerCase(),
    phone: '0000000000',
    dateOfBirth: new Date('2000-01-01'),
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    transactionPin: await bcrypt.hash(String(ADMIN_PIN), 10),
    role: 'admin',
    status: 'approved'
  });
  console.log('Admin created.');
  process.exit(0);
})();
```

Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` and `ADMIN_PIN` to your local `backend/.env`, then run:

```bash
node seedAdmin.js
```

---

## 📡 API Reference

All routes except register, login and username check need the header `Authorization: Bearer <token>`.

### Authentication — `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user (pending approval) |
| POST | `/login` | Log in and receive a JWT |
| GET | `/check-username` | Check whether a username is available |
| GET / PUT | `/profile` | View or update own profile |
| POST | `/verify-old-password` | Verify current password |
| PUT | `/update-password` | Change password |

### Transfers — `/api/transfer`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verify-pin` | Verify the transaction PIN |
| GET | `/verify/:paymentId` | Look up a receiver by Payment ID |
| POST | `/` | Make a transfer (runs fraud checks) |
| POST | `/cancel` | Cancel a flagged transfer |
| GET | `/history` | Own transaction history (supports `?status=completed` filtering) |
| GET | `/daily-spending` | 7-day daily spending chart data (completed transfers only) |
| GET | `/fraud-alerts` | Own security alerts |
| POST | `/self-freeze` | Freeze own account |

### Admin — `/api/admin` (admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pending-users`, `/approved-users`, `/rejected-users` | List users by status |
| PUT | `/approve/:id`, `/reject/:id` | Approve or reject a user |
| PUT | `/freeze/:id`, `/unfreeze/:id` | Freeze or unfreeze a user |
| DELETE | `/users/:id` | Delete a user |
| GET | `/transactions` | All transactions |
| GET | `/fraud-alerts` | All fraud alerts |
| PATCH | `/fraud-alerts/:alertId/review` | Mark a fraud alert as reviewed |
| GET | `/payment-blockchain/chain` | All payment blocks |
| GET | `/payment-blockchain/validate` | Validate the payment blockchain |
| GET / PUT | `/profile` | Admin profile |

### Notifications — `/api/notifications`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get latest notifications |
| PUT | `/:id/read` | Mark a notification as read |

---

## ☁️ Deployment

- **Frontend:** deploy the `frontend` folder to a static host such as Vercel. A `vercel.json` rewrite for single-page routing is included. Set `VITE_API_URL` to your backend URL.
- **Backend:** deploy the `backend` folder to a Node host such as Render. Set all variables from the [Environment Variables](#-environment-variables) section in the host's dashboard, and use a MongoDB Atlas connection string.

---

## ⚠️ Limitations and Future Work

**Current limitations**
- Fraud rules and thresholds are fixed
- One authorized server acts as the only validator
- Not tested with real banking traffic or detailed performance benchmarks
- Not connected to real payment networks

**Planned improvements**
- Machine-learning-based fraud detection
- Multiple validators for Proof of Authority
- Balance reconciliation against the chain
- Automated test suite
- Integration with real payment networks (such as UPI)

---

## 👥 Team

**Group G21 — B.Tech Project 2026-27**
Department of Computer Science and Engineering, D. Y. Patil College of Engineering and Technology, Kolhapur

| Name |
|------|
| Varad Ramchandra Patil |
| Suhas Ravindra Sawant |
| Pratik Vinod Suralkar |
| Suyog Vasudev Kumbhar |
| Swaroop Vilas Kashid |

**Project Guide:** Dr. A. S. Yadav

---

## 📄 Disclaimer

BlockBank is an educational project. It simulates banking and does not handle real money.
