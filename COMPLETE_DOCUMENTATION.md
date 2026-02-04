# Commission Management System - Complete Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Business Logic & GST Compliance](#business-logic--gst-compliance)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [Frontend Components](#frontend-components)
8. [Installation & Setup](#installation--setup)
9. [Configuration](#configuration)
10. [Usage Guide](#usage-guide)
11. [File Structure](#file-structure)
12. [Security Features](#security-features)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

A **production-ready, GST-compliant fintech accounting system** for managing QR payment transactions with automatic commission and GST calculations.

### Key Highlights
- ✅ **GST Compliant**: GST applies ONLY on commission (not on total received)
- ✅ **Audit-Safe**: Complete transaction history with timestamps
- ✅ **CA-Ready**: GSTR-1 & GSTR-3B ready reports
- ✅ **Secure**: JWT authentication, input validation, rate limiting
- ✅ **Production-Ready**: Error handling, logging, scalability

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (access + refresh tokens)
- PDFKit (invoice generation)
- ExcelJS (Excel exports)
- bcryptjs (password hashing)

**Frontend:**
- React.js (Vite)
- React Router (navigation)
- Axios (API calls)
- Tailwind CSS (styling)
- React Hot Toast (notifications)
- date-fns (date formatting)

### System Flow

```
User → Frontend (React) → API Gateway → Backend (Express) → MongoDB
                                    ↓
                            JWT Authentication
                                    ↓
                            Business Logic (GST Calculation)
                                    ↓
                            Response (JSON/PDF/Excel)
```

---

## ✨ Features

### 1. Authentication & Authorization
- User registration with role-based access (admin/user)
- JWT-based authentication (access + refresh tokens)
- Protected routes
- Auto token refresh
- Secure password hashing (bcrypt)

### 2. Transaction Management
- Record QR transactions
- Real-time commission & GST calculation preview
- Transaction CRUD operations
- Date/month/year filtering
- Pagination support
- Transaction history with audit trail

### 3. Commission & GST Calculation
- **Automatic calculation** (server-side only)
- Commission percentage (default: 1%)
- GST @18% on commission ONLY
- Net income calculation
- Return amount calculation

### 4. Reports & Analytics
- **GST Summary Report** (GSTR-1 & GSTR-3B ready)
- Monthly summary with breakdowns
- CGST/SGST split (9% each)
- Taxable value calculations
- Transaction counts

### 5. Export Functionality
- **PDF Invoices** (GST-compliant commission invoices)
- **Excel Export** (CA/auditor-friendly)
- Formatted financial data
- Summary rows included

### 6. Dashboard
- Real-time summary cards
- Recent transactions
- Quick transaction entry
- Calculation preview

---

## 💼 Business Logic & GST Compliance

### Core Calculation Formula

```javascript
// Step 1: Calculate Commission (Platform Revenue)
commissionAmount = totalReceived × (commissionPercent / 100)

// Step 2: Calculate GST (18% on Commission ONLY)
gstAmount = commissionAmount × (18 / 100)

// Step 3: Calculate Net Income
netIncome = commissionAmount - gstAmount

// Step 4: Calculate Return Amount
returnAmount = totalReceived - commissionAmount
```

### Example Calculation

**Input:**
- Total Received: ₹10,000
- Commission %: 1%

**Output:**
- Commission Amount: ₹100 (revenue)
- GST @18%: ₹18 (on ₹100 only)
- Net Income: ₹82
- Return Amount: ₹9,900

### GST Compliance Rules

1. **Total Received ≠ Revenue**
   - Total received via QR is NOT platform revenue
   - Only commission amount is revenue

2. **GST Applies ONLY on Commission**
   - GST @18% calculated on commission amount
   - NOT on total received amount
   - This ensures compliance with Indian GST regulations

3. **CGST/SGST Split**
   - For intra-state transactions: 9% CGST + 9% SGST
   - Total GST = 18% of commission

4. **Audit Trail**
   - All calculations done server-side
   - Timestamps on all transactions
   - Creator tracking for audit purposes

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user" // optional: "admin" or "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <accessToken>
```

---

### Transaction Endpoints

#### Create Transaction
```http
POST /transactions
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "date": "2024-01-29",
  "totalReceived": 10000,
  "commissionPercent": 1,
  "paymentMode": "QR",
  "remarks": "Optional remarks"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": {
      "_id": "...",
      "date": "2024-01-29T00:00:00.000Z",
      "totalReceived": 10000,
      "commissionPercent": 1,
      "commissionAmount": 100,
      "gstAmount": 18,
      "netIncome": 82,
      "returnAmount": 9900,
      "paymentMode": "QR",
      "createdBy": {...},
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

#### Get Transactions
```http
GET /transactions?month=1&year=2024&page=1&limit=50
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `month` (optional): 1-12
- `year` (optional): e.g., 2024
- `page` (optional): Default 1
- `limit` (optional): Default 50

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    },
    "summary": {
      "totalReceived": 100000,
      "totalCommission": 1000,
      "totalGST": 180,
      "totalNetIncome": 820,
      "totalReturn": 99000,
      "count": 10
    }
  }
}
```

#### Get Single Transaction
```http
GET /transactions/:id
Authorization: Bearer <accessToken>
```

#### Update Transaction
```http
PUT /transactions/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "totalReceived": 15000,
  "commissionPercent": 1.5
}
```

#### Delete Transaction
```http
DELETE /transactions/:id
Authorization: Bearer <accessToken>
```

---

### Report Endpoints

#### GST Summary Report
```http
GET /reports/gst?month=1&year=2024
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "_id": { "year": 2024, "month": 1 },
        "totalCommission": 1000,
        "totalGST": 180,
        "taxableValue": 1000,
        "cgst": 90,
        "sgst": 90,
        "transactionCount": 10
      }
    ],
    "totals": {
      "totalCommission": 1000,
      "totalGST": 180,
      "totalNetIncome": 820,
      "totalTransactions": 10,
      "taxableValue": 1000,
      "cgst": 90,
      "sgst": 90
    },
    "gstRate": 18,
    "period": "2024-01"
  },
  "notes": [
    "GST applies ONLY on commission amount (not on totalReceived)",
    "CGST and SGST are calculated as 50% each of total GST",
    "This summary is ready for GSTR-1 and GSTR-3B filing",
    "Total Received amount is NOT included in taxable value"
  ]
}
```

#### Monthly Summary
```http
GET /reports/monthly?year=2024
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "monthlySummary": [
      {
        "_id": { "year": 2024, "month": 1 },
        "totalReceived": 100000,
        "totalCommission": 1000,
        "totalGST": 180,
        "totalNetIncome": 820,
        "totalReturn": 99000,
        "transactionCount": 10
      }
    ]
  }
}
```

---

### Export Endpoints

#### Download PDF Invoice
```http
GET /export/invoice/:transactionId
Authorization: Bearer <accessToken>
```

**Response:** PDF file (application/pdf)

**Invoice Includes:**
- Company details (from .env)
- Invoice number & date
- Transaction details
- Commission breakdown
- CGST/SGST split
- Net income
- Important GST compliance notes

#### Export to Excel
```http
GET /export/excel?month=1&year=2024
Authorization: Bearer <accessToken>
```

**Response:** Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

**Excel Includes:**
- All transaction columns
- Formatted currency values
- Summary row with totals
- Ready for CA/auditor review

---

## 🗄️ Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required, min: 2),
  email: String (required, unique, lowercase),
  passwordHash: String (required, min: 6),
  role: String (enum: ['admin', 'user'], default: 'user'),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `email`: Unique index for fast lookups

**Methods:**
- `comparePassword(candidatePassword)`: Compare password with hash

---

### Transaction Model

```javascript
{
  _id: ObjectId,
  date: Date (required, default: now),
  totalReceived: Number (required, min: 0.01),
  commissionPercent: Number (required, min: 0, max: 100, default: 1),
  commissionAmount: Number (required, min: 0),
  gstAmount: Number (required, min: 0),
  netIncome: Number (required),
  returnAmount: Number (required, min: 0),
  paymentMode: String (enum: ['QR'], default: 'QR'),
  createdBy: ObjectId (required, ref: 'User'),
  remarks: String (max: 500),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `date`: Descending index for date queries
- `createdBy + date`: Compound index for user transactions
- `createdAt`: Descending index for recent transactions

**Virtuals:**
- `formattedDate`: Returns ISO date string

**Important Fields:**
- `totalReceived`: Full amount received via QR (NOT revenue)
- `commissionAmount`: Platform's commission (revenue, subject to GST)
- `gstAmount`: GST @18% on commission ONLY
- `netIncome`: Commission minus GST (actual income)
- `returnAmount`: Amount returned to merchant/customer

---

## 🎨 Frontend Components

### Pages

#### 1. Login (`/login`)
- Email/password form
- Link to register
- Auto-redirect if already logged in

#### 2. Register (`/register`)
- Name, email, password, role fields
- Link to login
- Auto-redirect after registration

#### 3. Dashboard (`/dashboard`)
- **Summary Cards:**
  - Total Received
  - Total Commission
  - Total GST
  - Net Income

- **Transaction Form:**
  - Date picker
  - Total Received input
  - Commission % input
  - Remarks textarea
  - Real-time calculation preview

- **Recent Transactions Table:**
  - Last 5 transactions
  - Quick overview

#### 4. Transactions (`/transactions`)
- **Filters:**
  - Month dropdown
  - Year dropdown
  - Clear filters button

- **Summary Section:**
  - Total Received
  - Total Commission
  - Total GST
  - Net Income
  - Transaction Count

- **Transactions Table:**
  - All transaction columns
  - Invoice download button
  - Delete button
  - Pagination

#### 5. Reports (`/reports`)
- **Filters:**
  - Month dropdown (with "All Months" option)
  - Year dropdown

- **GST Summary Table:**
  - Period
  - Taxable Value
  - CGST/SGST breakdown
  - Total GST
  - Transaction count

- **Monthly Summary Table:**
  - Month-wise breakdown
  - All financial metrics

- **Export Button:**
  - Excel download

### Components

#### Layout
- Navigation bar
- User info display
- Logout button
- Protected route wrapper

#### ProtectedRoute
- Authentication check
- Loading state
- Redirect to login if not authenticated

### Contexts

#### AuthContext
- User state management
- Login/register/logout functions
- Token management
- Auto token refresh
- Axios interceptors for auth

---

## 🚀 Installation & Setup

### Prerequisites

1. **Node.js** (v16 or higher)
   ```bash
   node --version
   ```

2. **MongoDB** (v4.4 or higher)
   - Install MongoDB Community Server
   - Or use MongoDB Atlas (cloud)

3. **npm** or **yarn**

### Step 1: Clone/Download Project

```bash
cd "e:\SAIF ALI\PROGRAM\Commission"
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Backend

```bash
# Copy environment template
copy .env.example .env

# Edit .env file with your settings
```

**Required .env Variables:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/commission_db
JWT_ACCESS_SECRET=your_super_secret_access_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
DEFAULT_COMMISSION_PERCENT=1
GST_RATE=18
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Company Address
COMPANY_GSTIN=29XXXXXXXXXX1Z5
COMPANY_PAN=XXXXXXXXXX
FRONTEND_URL=http://localhost:5173
```

### Step 4: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 5: Start MongoDB

**Windows (Service):**
```powershell
net start MongoDB
```

**Windows (Manual):**
```bash
mongod --dbpath "C:\data\db"
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
# or
mongod
```

### Step 6: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📊 Environment: development
```

### Step 7: Start Frontend Server

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 8: Access Application

Open browser: `http://localhost:5173`

---

## ⚙️ Configuration

### Backend Configuration

#### Environment Variables (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/commission_db` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Required |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Required |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `DEFAULT_COMMISSION_PERCENT` | Default commission % | `1` |
| `GST_RATE` | GST rate percentage | `18` |
| `COMPANY_NAME` | Company name for invoices | Required |
| `COMPANY_ADDRESS` | Company address for invoices | Required |
| `COMPANY_GSTIN` | Company GSTIN | Required |
| `COMPANY_PAN` | Company PAN | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

#### MongoDB Connection Options

**Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/commission_db
```

**MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/commission_db
```

**With Authentication:**
```env
MONGODB_URI=mongodb://username:password@localhost:27017/commission_db?authSource=admin
```

### Frontend Configuration

#### Vite Proxy (`frontend/vite.config.js`)

```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

---

## 📖 Usage Guide

### 1. First Time Setup

1. **Start MongoDB**
2. **Start Backend** (`npm run dev` in backend folder)
3. **Start Frontend** (`npm run dev` in frontend folder)
4. **Register Admin Account:**
   - Go to `http://localhost:5173/register`
   - Fill in details
   - Select "Admin" role
   - Submit

### 2. Recording Transactions

1. **Go to Dashboard** (`/dashboard`)
2. **Fill Transaction Form:**
   - Date: Select transaction date
   - Total Received: Enter amount (e.g., 10000)
   - Commission %: Enter percentage (default: 1%)
   - Remarks: Optional notes
3. **View Calculation Preview:**
   - Commission Amount
   - GST Amount
   - Net Income
   - Return Amount
4. **Submit Transaction**

### 3. Viewing Transactions

1. **Go to Transactions Page** (`/transactions`)
2. **Filter by Month/Year:**
   - Select month from dropdown
   - Select year from dropdown
   - View filtered results
3. **View Summary:**
   - See totals for filtered period
4. **Download Invoice:**
   - Click "Invoice" button on any transaction
   - PDF downloads automatically

### 4. Generating Reports

1. **Go to Reports Page** (`/reports`)
2. **Select Filters:**
   - Month (or "All Months")
   - Year
3. **View GST Summary:**
   - Period-wise breakdown
   - CGST/SGST split
   - Taxable values
4. **View Monthly Summary:**
   - Month-wise totals
5. **Export to Excel:**
   - Click "Export to Excel" button
   - Excel file downloads automatically

### 5. Managing Transactions

- **Update:** Currently not available in UI (use API)
- **Delete:** Click "Delete" button on Transactions page
- **View Details:** Click on transaction row (future feature)

---

## 📁 File Structure

```
Commission/
├── backend/
│   ├── controllers/
│   │   ├── auth.controller.js          # Authentication logic
│   │   ├── transaction.controller.js   # Transaction CRUD
│   │   ├── report.controller.js        # Report generation
│   │   └── export.controller.js        # PDF/Excel exports
│   ├── middleware/
│   │   ├── auth.middleware.js          # JWT authentication
│   │   ├── error.middleware.js         # Error handling
│   │   └── validate.middleware.js     # Input validation
│   ├── models/
│   │   ├── User.model.js               # User schema
│   │   └── Transaction.model.js       # Transaction schema
│   ├── routes/
│   │   ├── auth.routes.js              # Auth endpoints
│   │   ├── transaction.routes.js       # Transaction endpoints
│   │   ├── report.routes.js            # Report endpoints
│   │   └── export.routes.js            # Export endpoints
│   ├── utils/
│   │   └── calculateCommission.js      # GST calculation logic
│   ├── .env                            # Environment variables
│   ├── .env.example                    # Environment template
│   ├── .gitignore
│   ├── package.json
│   └── server.js                       # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx              # Main layout
│   │   │   └── ProtectedRoute.jsx      # Route protection
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx        # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx               # Login page
│   │   │   ├── Register.jsx            # Register page
│   │   │   ├── Dashboard.jsx          # Dashboard page
│   │   │   ├── Transactions.jsx       # Transactions page
│   │   │   └── Reports.jsx            # Reports page
│   │   ├── App.jsx                     # Main app component
│   │   ├── main.jsx                    # Entry point
│   │   └── index.css                   # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                  # Vite configuration
│   ├── tailwind.config.js              # Tailwind config
│   └── postcss.config.js              # PostCSS config
│
├── README.md                            # Main documentation
├── SETUP.md                             # Quick setup guide
├── COMPLETE_DOCUMENTATION.md           # This file
└── .gitignore
```

---

## 🔒 Security Features

### Authentication
- **JWT Tokens:** Secure token-based authentication
- **Refresh Tokens:** Long-lived refresh tokens for session management
- **Password Hashing:** bcrypt with salt rounds
- **Token Expiry:** Configurable expiry times

### Authorization
- **Role-Based Access:** Admin and User roles
- **Protected Routes:** Middleware protection on all API routes
- **Route Guards:** Frontend route protection

### Input Validation
- **express-validator:** Server-side validation
- **Mongoose Validation:** Schema-level validation
- **Sanitization:** Input sanitization to prevent injection

### Security Headers
- **Helmet.js:** Security headers (XSS, CSRF protection)
- **CORS:** Configured CORS policy
- **Rate Limiting:** 100 requests per 15 minutes per IP

### Data Protection
- **Server-Side Calculations:** All calculations done server-side
- **No Client-Side Tampering:** Business logic protected
- **Audit Trail:** Complete transaction history

---

## 🐛 Troubleshooting

### Backend Issues

#### MongoDB Connection Error
**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solutions:**
1. Check if MongoDB is running:
   ```bash
   # Windows
   net start MongoDB
   
   # Check MongoDB service
   sc query MongoDB
   ```

2. Verify MongoDB URI in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/commission_db
   ```

3. Check MongoDB port (default: 27017)

#### Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5000`

**Solutions:**
1. Change PORT in `.env`:
   ```env
   PORT=5001
   ```

2. Kill process using port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

#### JWT Token Errors
**Error:** `JsonWebTokenError` or `TokenExpiredError`

**Solutions:**
1. Check JWT secrets in `.env`
2. Clear localStorage and login again
3. Verify token expiry settings

### Frontend Issues

#### CORS Errors
**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solutions:**
1. Check `FRONTEND_URL` in backend `.env`:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. Verify CORS configuration in `server.js`

#### API Connection Errors
**Error:** `Network Error` or `ECONNREFUSED`

**Solutions:**
1. Verify backend is running on port 5000
2. Check Vite proxy configuration
3. Test backend health: `http://localhost:5000/health`

#### Blank Page / Build Errors
**Solutions:**
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

### Common Issues

#### No Transactions Showing
- Check if MongoDB has data
- Verify date filters
- Check browser console for errors

#### Excel Export Fails
- Verify backend is running
- Check MongoDB connection
- Ensure transactions exist for selected period

#### PDF Invoice Fails
- Verify transaction ID is correct
- Check authentication token
- Ensure backend is running

---

## 📊 Performance Considerations

### Backend
- **Database Indexing:** Indexes on frequently queried fields
- **Pagination:** Limits result sets to prevent memory issues
- **Aggregation:** Efficient MongoDB aggregations for reports

### Frontend
- **Code Splitting:** Vite handles code splitting automatically
- **Lazy Loading:** Routes loaded on demand
- **Optimized Builds:** Production builds are minified

### Scalability
- **Stateless API:** Can scale horizontally
- **Database:** MongoDB can be scaled with replica sets
- **Caching:** Can add Redis for session/token caching

---

## 🔄 Future Enhancements

### Potential Features
1. **Multi-User Support:** Multiple merchants/customers
2. **Payment Integration:** Direct payment gateway integration
3. **Email Notifications:** Invoice email delivery
4. **Advanced Reports:** Custom report builder
5. **Mobile App:** React Native mobile app
6. **Bulk Import:** CSV/Excel import functionality
7. **Dashboard Charts:** Visual analytics with charts
8. **Export Templates:** Customizable invoice templates

---

## 📞 Support & Maintenance

### Logs
- **Backend:** Check console output for errors
- **Frontend:** Check browser console (F12)
- **MongoDB:** Check MongoDB logs

### Updates
- **Dependencies:** Regularly update npm packages
- **Security:** Keep dependencies updated for security patches
- **MongoDB:** Keep MongoDB updated

### Backup
- **Database:** Regular MongoDB backups recommended
- **Environment:** Keep `.env` files secure and backed up
- **Code:** Use version control (Git)

---

## 📝 License

ISC License

---

## 👨‍💻 Development Notes

### Code Quality
- **ES6 Modules:** Using ES6 import/export
- **Async/Await:** Modern async handling
- **Error Handling:** Centralized error middleware
- **Validation:** Input validation on all endpoints

### Best Practices
- **RESTful API:** Following REST conventions
- **MVC Pattern:** Separation of concerns
- **Environment Config:** All config in `.env`
- **Security First:** Security considerations throughout

---

**Documentation Version:** 1.0  
**Last Updated:** January 2024  
**System Version:** 1.0.0

---

*This is a production-ready, GST-compliant commission management system built for Indian tax regulations. All calculations follow GST compliance rules and are audit-safe.*
