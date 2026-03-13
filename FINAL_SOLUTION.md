# 🚨 CRITICAL: Backend Server Not Running

## Current Status
**All API endpoints return 404 Not Found** - This means the backend server is not running or not properly deployed.

## Root Cause
The backend Django server is not accessible at `https://vdesk-backend.vienstereoptic.com`, causing all login attempts to fail.

## 🛠️ IMMEDIATE SOLUTION

### Step 1: Deploy Backend Server (CRITICAL)

```bash
# Navigate to backend directory
cd backend/

# Install dependencies
pip install -r requirements.txt

# Start Django development server
python manage.py runserver 0.0.0.0:8000
```

### Step 2: Test Locally First

```bash
# Test if backend is working locally
curl -X POST "http://localhost:8000/api/login/" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"02","password":"Muthu@2004"}'
```

**Expected response when working:**
```json
{
  "message": "Login successful",
  "user": {
    "emp_id": "02",
    "name": "Muthulakshmi",
    "gmail": "test@example.com",
    "department": "Software",
    "role": "Employee"
  }
}
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
# Build and run Docker container
docker build -t employee-app-backend .
docker run -p 8000:8000 employee-app-backend
```

### Step 4: Configure Reverse Proxy

Create nginx configuration file:
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

## 🧪 Verification Steps

### Test Backend Connectivity
```bash
python test_backend_connectivity.py
```

### Test Specific Endpoints
```bash
# Test login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/login/" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"02","password":"Muthu@2004"}'

# Test admin login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/admin-login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test team leader login
curl -X POST "https://vdesk-backend.vienstereoptic.com/api/teamleader-login/" \
  -H "Content-Type: application/json" \
  -d '{"emp_id":"TL001","password":"password123"}'
```

## 📋 Default Credentials

### Admin User
- **Username**: `admin`
- **Password**: `admin123`

### Test Employee
- **Emp ID**: `02`
- **Name**: `Muthulakshmi`
- **Password**: `Muthu@2004`

### Team Leader
- **Emp ID**: `TL001`
- **Password**: `password123`

## 🔍 Troubleshooting

### If you still get 404 errors:

1. **Check if backend is running**:
   ```bash
   ps aux | grep python
   ```

2. **Check server logs**:
   ```bash
   # Django logs
   python manage.py runserver
   
   # nginx logs
   tail -f /var/log/nginx/error.log
   ```

3. **Check MongoDB connection**:
   ```python
   # Test MongoDB connection
   python -c "import pymongo; client = pymongo.MongoClient('mongodb://localhost:27017/'); print(client.list_database_names())"
   ```

4. **Check firewall**:
   ```bash
   # Ensure port 8000 is open
   sudo ufw allow 8000
   ```

## 🎯 Success Criteria

After deployment, you should see:

1. ✅ `python test_backend_connectivity.py` shows "Server is accessible"
2. ✅ API endpoints return 200 status (not 404)
3. ✅ Login returns "Invalid credentials" (not connection errors)
4. ✅ Frontend can successfully communicate with backend

## 📞 Next Steps

1. **Deploy the backend server** using the commands above
2. **Run the connectivity test** to verify it's working
3. **Test login with default credentials**
4. **Check frontend logs** for any remaining issues

**The "Login Failed" error will be resolved once the backend server is running and accessible.**