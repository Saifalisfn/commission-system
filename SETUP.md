# Quick Setup Guide

## Prerequisites Check

```bash
node --version  # Should be v16+
mongod --version  # MongoDB should be installed
```

## Step-by-Step Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. First User Registration

1. Open http://localhost:5173
2. Click "Register"
3. Create an admin account:
   - Name: Admin
   - Email: admin@example.com
   - Password: (choose a strong password)
   - Role: Admin

### 4. Test Transaction

1. Login with your new account
2. Go to Dashboard
3. Enter a test transaction:
   - Total Received: 10000
   - Commission %: 1
4. Verify calculations:
   - Commission: ₹100
   - GST: ₹18
   - Net Income: ₹82
   - Return: ₹9,900

## Common Issues

### MongoDB Not Running
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### Port Already in Use
- Backend: Change PORT in `.env`
- Frontend: Change port in `vite.config.js`

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Default: `http://localhost:5173`

## Next Steps

- Review the README.md for detailed documentation
- Check API endpoints in backend/routes/
- Customize company details in backend/.env for invoices
