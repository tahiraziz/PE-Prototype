# Epic OAuth2 Error - Troubleshooting Guide

## 🔴 Error You're Seeing

```
OAuth2 Error
Something went wrong trying to authorize the client. 
Please try logging in again.
```

## 🔍 What This Means

Epic is rejecting the authorization request. This happens when:
1. ❌ Redirect URI doesn't match
2. ❌ Client ID is incorrect
3. ❌ App isn't properly configured
4. ❌ App scopes are wrong

## ✅ How to Fix It

### Step 1: Check Your Epic App Configuration

1. **Go to Epic FHIR Portal:** https://fhir.epic.com/
2. **Log in** with your sandbox credentials
3. **Navigate to:** "Build Apps" → "My Apps"
4. **Find your app** (Client ID: `952490b9-2486-47e7-bade-8e73eeed6133`)

### Step 2: Verify These Settings

Your Epic app MUST have these EXACT settings:

#### Application Type
- ✅ **Backend Systems** OR **SMART on FHIR**
- ✅ **Confidential Client** OR **Public Client**

#### Redirect URIs
Add this EXACT URI (case-sensitive, no trailing slash):
```
http://localhost:8000/callback
```

**Important:** 
- Must be `http` (not `https`) for localhost
- Must be exactly `localhost` (not `127.0.0.1`)
- Must be port `8000`
- Must be `/callback` (lowercase)

#### FHIR Scopes
Enable these scopes:
- ✅ `patient/Patient.read`
- ✅ `patient/Observation.read`
- ✅ `launch/patient` (for standalone launch)

OR if using EHR launch:
- ✅ `patient/Patient.read`
- ✅ `patient/Observation.read`
- ✅ `launch` (for EHR launch)

#### App Status
- ✅ App must be **Active** or **Published**
- ❌ NOT in "Draft" or "Inactive" status

### Step 3: Save and Try Again

1. **Save** your Epic app configuration
2. **Wait 1-2 minutes** for changes to propagate
3. **Restart your backend:**
   ```bash
   cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
   ./run.sh
   ```
4. **Try the OAuth flow again:**
   ```
   http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   ```

## 🧪 Alternative: Use Test Mode Instead

**Don't want to deal with Epic OAuth configuration?** Use Test Mode:

1. Go to http://localhost:3000
2. Click **"🧪 Test with Sample Data"**
3. ✅ Works immediately without any Epic configuration!

Test mode uses sample patient data and shows the full model functionality.

## 🔧 Common Issues & Solutions

### Issue 1: "Invalid Redirect URI"

**Problem:** Epic app has wrong redirect URI

**Solution:** 
1. Go to Epic app settings
2. Add redirect URI: `http://localhost:8000/callback`
3. Save and wait 1-2 minutes

### Issue 2: "Unauthorized Client"

**Problem:** App is inactive or not published

**Solution:**
1. Check app status in Epic portal
2. Change to "Active" or "Published"
3. Save changes

### Issue 3: "Invalid Scope"

**Problem:** Requested scopes don't match app configuration

**Solution:**
1. Check app scopes in Epic portal
2. Ensure these are enabled:
   - `patient/Patient.read`
   - `patient/Observation.read`
   - `launch/patient` OR `launch`

### Issue 4: "Client ID Not Found"

**Problem:** Wrong Client ID in .env file

**Solution:**
1. Verify Client ID in Epic portal
2. Check it matches your .env file:
   ```
   EPIC_CLIENT_ID=952490b9-2486-47e7-bade-8e73eeed6133
   ```

## 📸 Screenshot Checklist

When configuring your Epic app, verify:

### Redirect URIs Section
```
✅ http://localhost:8000/callback
```

### FHIR Scopes Section
```
✅ patient/Patient.read
✅ patient/Observation.read
✅ launch/patient (or just 'launch' for EHR)
```

### App Status
```
✅ Status: Active/Published (NOT Draft)
```

## 🎯 Quick Test

After fixing your Epic app, test the redirect:

1. **Manual test URL:**
   ```
   https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize?response_type=code&client_id=952490b9-2486-47e7-bade-8e73eeed6133&redirect_uri=http://localhost:8000/callback&scope=patient/Patient.read patient/Observation.read launch/patient&state=test123&aud=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   ```

2. If this works, you should:
   - See Epic login page (not OAuth2 Error)
   - Be able to log in
   - Get redirected to `http://localhost:8000/callback?code=...`

## 💡 Recommended Approach

For demonstration purposes, I recommend:

### Option 1: Use Test Mode (Easiest)
✅ No Epic configuration needed  
✅ Works immediately  
✅ Shows full model functionality  
**How:** Click "🧪 Test with Sample Data" on frontend

### Option 2: Fix Epic OAuth (Advanced)
⚠️ Requires Epic app configuration  
⚠️ Needs sandbox account  
✅ Shows real FHIR integration  
**How:** Follow steps above to fix Epic app settings

## 🆘 Still Not Working?

### Check Backend Logs

Look at your backend terminal output when you visit `/launch`. You should see:
```
INFO:main:Launch initiated: iss=..., launch=None
INFO:main:Redirecting to: https://fhir.epic.com/...
```

### Check the Redirect URL

Look at the URL Epic is redirecting to. Does it include your Client ID?
```
https://fhir.epic.com/.../authorize?
  response_type=code&
  client_id=952490b9-2486-47e7-bade-8e73eeed6133&  ← Should match your ID
  redirect_uri=http://localhost:8000/callback&    ← Must match Epic app
  scope=...
```

### Test Without OAuth

Use Test Mode to verify the model works:
```
http://localhost:3000 → Click "🧪 Test with Sample Data"
```

## 📞 Need Help?

1. **Verify Epic app settings** (most common issue)
2. **Try Test Mode** (bypasses OAuth completely)
3. **Check backend logs** for error details
4. **Verify .env file** has correct Client ID

---

**Quick Fix:** Just use Test Mode! It demonstrates the full model without needing Epic OAuth configuration.

**Patient Fix:** Follow Step 1-3 above to properly configure your Epic app.

