# Employee App - Backend Deployment Guide

## 🚨 Current Issue: Login Failed

**Root Cause**: The backend server is not running/deployed on the server, causing all login attempts to fail with "Login Failed" errors.

## 🔍 Problem Analysis

- ✅ Frontend configuration is correct
- ✅ Backend API implementation is correct  
- ❌ Backend server is not accessible at `https://vdesk-backend.vienstereoptic.com`
- ❌ All API endpoints return 404 Not Found

## 🛠️ Solution Steps

### Step 1: Deploy Backend Server

```bash
# Navigate to backend directory
cd backend/

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations (if needed)
python manage.py migrate

# Start Django development server
python manage.py runserver 0.0.0.0:8000
```

### Step 2: Test Locally First

```bash
# Test login endpoint
curl -X POST "http://localhost:8000/api/login/" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test","password":"test"}'

# Expected response:
# {"error": "Invalid credentials"} (this is normal - means API is working)
```

### Step 3: Production Deployment

#### Option A: Using Gunicorn (Recommended)

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

#### Option B: Using Docker

```bash
# Build Docker image
docker build -t employee-app-backend .

# Run container
docker run -p 8000:8000 employee-app-backend
```

### Step 4: Configure Reverse Proxy (nginx)

Create nginx configuration:

```nginx
server {
    listen 80;
    server_name vdesk-backend.vienstereoptic.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 5: Update Frontend Configuration

The frontend config is already correct:
```javascript
// frontend/config.js
const API_BASE_URL = "https://vdesk-backend.vienstereoptic.com";
```

## 🧪 Testing Commands

### Test Backend Connectivity
```bash
python test_backend_connectivity.py
```

### Test API Endpoints
```bash
# Test login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/login/" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"your_emp_id","password":"your_password"}'

# Test admin login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/admin-login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test team leader login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/teamleader-login/" \
  -H "Content-Type: application/json" \
  -d '{"emp_id":"TL001","password":"password123"}'
```

## 📋 Required Credentials

### Default Admin User
- Username: `admin`
- Password: `admin123`

### Default Team Leader
- Emp ID: `TL001` (or check database)
- Password: `password123`

### Test Employee
- Emp ID: `02`
- Name: `Muthulakshmi`
- Password: `Muthu@2004`

## 🔧 Troubleshooting

### Common Issues

1. **404 Not Found**: Backend server not running
2. **Connection Refused**: Server not accessible
3. **Database Errors**: MongoDB not configured
4. **CORS Errors**: Frontend-backend URL mismatch

### Debug Steps

1. Check if backend is running:
   ```bash
   ps aux | grep python
   ```

2. Check server logs:
   ```bash
   tail -f /var/log/nginx/error.log
   ```

3. Test database connection:
   ```python
   python -c "import pymongo; client = pymongo.MongoClient('mongodb://localhost:27017/'); print(client.list_database_names())"
   ```

## 🎯 Success Criteria

After deployment, you should see:

1. ✅ Backend server accessible at `https://vdesk-backend.vienstereoptic.com`
2. ✅ API endpoints return proper responses (not 404)
3. ✅ Login attempts return "Invalid credentials" instead of connection errors
4. ✅ Frontend can successfully communicate with backend

## 📞 Support

If you continue to experience issues:

1. Run the connectivity test: `python test_backend_connectivity.py`
2. Check the output for specific error messages
3. Verify all deployment steps were followed correctly
4. Check server logs for detailed error information