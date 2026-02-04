# Commission Management System

A **GST-compliant fintech-grade accounting system** for managing QR payment transactions with automatic commission and GST calculations.

## 🎯 Key Features

- ✅ **Secure Authentication** - JWT-based auth with access & refresh tokens
- ✅ **QR Transaction Recording** - Easy-to-use dashboard for recording transactions
- ✅ **Automatic Calculations** - Server-side commission & GST calculations
- ✅ **GST Compliance** - GST applies ONLY on commission (not on total received)
- ✅ **Transaction Ledger** - Filter by date/month with pagination
- ✅ **GST Reports** - GSTR-1 & GSTR-3B ready summaries
- ✅ **PDF Invoices** - GST-compliant commission invoices
- ✅ **Excel Export** - CA/auditor-friendly exports
- ✅ **Audit Trail** - Complete transaction history with timestamps

## 🏗️ Architecture

### Backend (Node.js + Express)
- RESTful API with versioned endpoints (`/api/v1`)
- MongoDB with Mongoose ODM
- JWT authentication with refresh tokens
- Centralized error handling
- Input validation & sanitization
- Rate limiting & security headers

### Frontend (React + Vite)
- Modern React with hooks
- React Router for navigation
- Protected routes
- Tailwind CSS for styling
- Real-time calculation previews
- Responsive design

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### 2. Configure Environment Variables

**Backend** - Copy `.env.example` to `.env` and update:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
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
```

### 3. Start MongoDB

Make sure MongoDB is running:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
# or
mongod
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

### 5. Access the Application

1. Open `http://localhost:5173`
2. Register a new account (or login if you have one)
3. Start recording transactions!

## 📊 Business Logic (GST Compliance)

### Critical Calculation Rules:

```
commission = total_received × commission_percent / 100
gst = commission × 18 / 100
net_income = commission − gst
return_amount = total_received − commission
```

### Important Notes:

- **Total Received** ≠ Revenue (it's the full QR payment amount)
- **Commission** = Platform's revenue (subject to GST)
- **GST @18%** applies ONLY on commission amount
- **Return Amount** = Amount returned to merchant/customer
- All calculations are **server-side** to ensure accuracy

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user profile

### Transactions
- `POST /api/v1/transactions` - Create transaction
- `GET /api/v1/transactions?month=&year=&page=&limit=` - Get transactions
- `GET /api/v1/transactions/:id` - Get single transaction
- `PUT /api/v1/transactions/:id` - Update transaction
- `DELETE /api/v1/transactions/:id` - Delete transaction

### Reports
- `GET /api/v1/reports/gst?month=&year=` - GST summary (GSTR-1 & GSTR-3B ready)
- `GET /api/v1/reports/monthly?year=` - Monthly summary

### Exports
- `GET /api/v1/export/invoice/:transactionId` - Download PDF invoice
- `GET /api/v1/export/excel?month=&year=` - Export to Excel

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  passwordHash: String,
  role: String (enum: ['admin', 'user']),
  createdAt: Date
}
```

### Transaction Model
```javascript
{
  date: Date,
  totalReceived: Number,
  commissionPercent: Number,
  commissionAmount: Number,
  gstAmount: Number,
  netIncome: Number,
  returnAmount: Number,
  paymentMode: String (enum: ['QR']),
  createdBy: ObjectId (ref: User),
  remarks: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Features

- **JWT Authentication** - Access & refresh token pattern
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - express-validator on all endpoints
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS** - Configured for frontend origin
- **Helmet** - Security headers
- **Error Handling** - Centralized error middleware

## 📝 Usage Examples

### Creating a Transaction

1. Navigate to Dashboard
2. Enter:
   - Date
   - Total Received (e.g., ₹10,000)
   - Commission % (default: 1%)
3. View real-time calculation preview
4. Submit transaction

**Example Calculation:**
- Total Received: ₹10,000
- Commission (1%): ₹100
- GST (18% on ₹100): ₹18
- Net Income: ₹82
- Return Amount: ₹9,900

### Generating GST Report

1. Navigate to Reports
2. Select month/year filters
3. View GST summary with CGST/SGST breakdown
4. Export to Excel for CA/auditor

### Downloading Invoice

1. Go to Transactions page
2. Click "Invoice" button on any transaction
3. PDF invoice downloads automatically

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration & login
- [ ] Create transaction with calculation verification
- [ ] Filter transactions by month/year
- [ ] View GST reports
- [ ] Download PDF invoice
- [ ] Export to Excel
- [ ] Update/delete transactions
- [ ] Protected routes (logout and try accessing dashboard)

## 📦 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure MongoDB Atlas or production MongoDB
4. Set up SSL/TLS
5. Configure CORS for production domain
6. Use PM2 or similar for process management

### Frontend
1. Build: `npm run build`
2. Serve `dist/` folder with nginx or similar
3. Configure API proxy or CORS
4. Set up HTTPS

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Verify MongoDB port (default: 27017)

### JWT Token Errors
- Check JWT secrets in `.env`
- Verify token expiry settings
- Clear localStorage and login again

### CORS Errors
- Update `FRONTEND_URL` in backend `.env`
- Check CORS configuration in `server.js`

## 📄 License

ISC

## 👨‍💻 Development

### Project Structure

```
.
├── backend/
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── server.js        # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── pages/       # Page components
    │   ├── contexts/    # React contexts
    │   ├── App.jsx      # Main app component
    │   └── main.jsx     # Entry point
    └── package.json
```

## ⚠️ Important Notes for CA/Auditors

1. **GST Compliance**: GST is calculated ONLY on commission amount, not on total received
2. **Audit Trail**: All transactions include timestamps and creator information
3. **Calculations**: All calculations are server-side to prevent tampering
4. **Reports**: GST reports are formatted for GSTR-1 & GSTR-3B filing
5. **Exports**: Excel exports include all transaction details for audit purposes

## 🤝 Support

For issues or questions, please check the code comments (especially in `calculateCommission.js` and transaction models) which explain the GST logic in detail.

---

**Built with ❤️ for GST-compliant commission management**
#   b b s  
 #   c o m m i s s i o n - s y s t e m  
 