# Luminur PE Decision Support - Troubleshooting Guide

This guide addresses common issues when running the Luminur application, particularly the "White Screen" connection errors.

## Quick Diagnostic Checklist

Before diving into specific issues, verify:

1. [ ] Backend is running: `cd backend && uvicorn main:app --reload`
2. [ ] Frontend is running: `cd frontend && npm run dev`
3. [ ] Environment variables are set correctly
4. [ ] Epic Sandbox credentials are valid
5. [ ] Redirect URIs are whitelisted in Epic App Orchard

---

## Issue: White Screen / App Not Loading

### Symptoms
- Browser shows blank white page
- Console shows network errors or React errors
- No clinical data displays

### Diagnosis Steps

1. **Check Browser Console** (F12 → Console tab)
   ```
   Look for:
   - Red errors (JavaScript exceptions)
   - Network failures (Failed to fetch)
   - CORS errors
   ```

2. **Check Network Tab** (F12 → Network tab)
   ```
   Look for:
   - Failed requests (red status)
   - 401/403 errors (authentication)
   - 404 errors (missing endpoints)
   ```

### Solutions

#### A. Backend Not Running
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it:
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### B. Frontend Build Error
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules/.vite
npm install
npm run dev
```

#### C. Environment Variables Missing
```bash
# Create frontend/.env if missing
echo "VITE_SANDBOX_MODE=true" > frontend/.env

# Create backend/.env if missing
cat > backend/.env << EOF
EPIC_CLIENT_ID=your_client_id
EPIC_CLIENT_SECRET=your_client_secret
FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
SANDBOX_MODE=true
EOF
```

---

## Issue: "Connection Timed Out" / Demo Fallback Activates

### Symptoms
- App shows "DEMO FALLBACK (Connection Failed)"
- Yellow banner with "Retry Connection" button
- Demo patient data loads instead of FHIR data

### Causes

1. **Backend unreachable** (not running or wrong port)
2. **Network timeout** (>3 seconds to respond)
3. **FHIR server down** (Epic maintenance)

### Solutions

#### A. Increase Timeout (Temporary)
In `frontend/src/hooks/useAutoAuth.ts`, increase timeout:
```typescript
const CONNECTION_TIMEOUT_MS = 5000; // 5 seconds instead of 3
```

#### B. Check Backend Health
```bash
# Test backend directly
curl -v http://localhost:8000/api/auth/status

# Expected response (not authenticated):
# {"authenticated": false, "sandboxMode": true, ...}
```

#### C. Use Demo Mode Intentionally
If FHIR connection is not needed, the app works fully in demo mode with rich patient data.

---

## Issue: "Auth Loop Detected"

### Symptoms
- Error: "Auth loop detected. Retry in Xs..."
- Repeated redirects to Epic login

### Cause
OAuth flow failed multiple times, triggering loop protection.

### Solutions

1. **Wait for cooldown** (30 seconds)
2. **Clear localStorage**:
   ```javascript
   // In browser console (F12):
   localStorage.clear();
   location.reload();
   ```
3. **Check Epic credentials** (see below)

---

## Issue: Epic OAuth Errors

### Symptoms
- Redirect to Epic fails
- "Invalid client_id" error
- "Redirect URI mismatch" error

### Debugging Steps

#### 1. Verify Client ID/Secret
```bash
# Check backend logs for the actual values being used
tail -f backend/logs/app.log

# Or check the launch redirect URL
curl -v http://localhost:8000/launch 2>&1 | grep Location
```

#### 2. Verify Redirect URIs
In Epic App Orchard, ensure these URIs are whitelisted:
```
http://localhost:8000/callback
http://localhost:5173/callback
```

#### 3. Verify FHIR Base URL
For Epic Sandbox:
```
https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

For Epic Production:
```
https://your-organization.epic.com/interconnect/api/FHIR/R4
```

#### 4. Check Token Endpoint
```bash
# Test OAuth token endpoint directly
curl -X POST "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token" \
  -d "grant_type=authorization_code" \
  -d "code=test" \
  -d "redirect_uri=http://localhost:8000/callback" \
  -d "client_id=$EPIC_CLIENT_ID" \
  -d "client_secret=$EPIC_CLIENT_SECRET"
```

---

## Issue: No Patient Data After Login

### Symptoms
- OAuth succeeds (no errors)
- Patient selector shows no patients
- Vitals/labs are empty

### Causes

1. **Wrong patient context** - Token may not have patient scope
2. **No data for patient** - Epic Sandbox may lack test data
3. **FHIR queries failing** - Check Network tab

### Solutions

#### A. Check Token Scopes
After successful auth, check the token:
```javascript
// In browser console after login
const token = localStorage.getItem('pe_session_id');
console.log('Session:', token);
```

#### B. Test FHIR Queries Directly
```bash
# Replace $TOKEN and $PATIENT_ID with actual values
curl -H "Authorization: Bearer $TOKEN" \
  "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/$PATIENT_ID"
```

#### C. Use Known Test Patients
Epic Sandbox has specific test patients:
- `Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB` (typical patient)

---

## Issue: CORS Errors

### Symptoms
- Console shows "CORS policy" errors
- Requests blocked by browser

### Solutions

#### A. Backend CORS Configuration
Check `backend/main.py` has CORS middleware:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### B. Use Proxy in Development
Vite proxy should handle API calls. Check `frontend/vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8000',
  }
}
```

---

## Issue: "Module not found" / Import Errors

### Symptoms
- Build fails with import errors
- Missing type definitions

### Solutions

```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install

# If TypeScript errors persist
npx tsc --noEmit
```

---

## Getting Help

### Collect Debug Information

1. **Browser console logs** (F12 → Console → Copy all)
2. **Network requests** (F12 → Network → Export HAR)
3. **Backend logs**: `tail -100 backend/logs/app.log`
4. **Environment info**:
   ```bash
   node --version
   npm --version
   python --version
   cat frontend/.env
   cat backend/.env | grep -v SECRET
   ```

### Support Channels

- GitHub Issues: [repository-url]/issues
- Internal Slack: #luminur-support

---

## Reset to Clean State

If all else fails, reset everything:

```bash
# 1. Clear browser data for localhost
# In Chrome: Settings → Privacy → Clear browsing data → Cookies and site data

# 2. Reset localStorage
# In browser console:
localStorage.clear();
sessionStorage.clear();

# 3. Restart backend
cd backend
pkill -f uvicorn
uvicorn main:app --reload

# 4. Restart frontend
cd frontend
rm -rf node_modules/.vite
npm run dev

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```
