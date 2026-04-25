# Quick Fix - Server Error on /launch

## What Happened?

You saw a **500 Internal Server Error** when trying to access the `/launch` endpoint. This happened because:

1. The `.env` file wasn't being loaded by the backend
2. The Epic Client ID wasn't configured yet

## ✅ Fixed!

I've made two fixes:

### 1. Added Environment Variable Loading

The backend now properly loads the `.env` file using `python-dotenv`.

### 2. Better Error Messages

If the Client ID isn't configured, you'll now get a clear error message instead of a generic 500 error.

## 🔧 What You Need to Do

### Step 1: Install the New Dependency

Stop your backend (Ctrl+C if running), then:

```bash
cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
source venv/bin/activate
pip install python-dotenv
```

### Step 2: Restart the Backend

```bash
./run.sh
```

## 🧪 Testing Options

You now have **two ways** to test:

### Option A: Test Mode (No FHIR - Works Now!)

1. Go to http://localhost:3000
2. Click **"🧪 Test with Sample Data"**
3. ✅ This works WITHOUT needing Epic credentials!

### Option B: Full FHIR Integration (Optional)

Only do this if you want to test with real Epic sandbox data:

1. **Configure Epic Client ID** in the `.env` file:
   ```bash
   nano .env
   # Change: EPIC_CLIENT_ID=your_client_id_here
   # To: EPIC_CLIENT_ID=your_actual_epic_client_id
   ```

2. **Restart the backend**:
   ```bash
   ./run.sh
   ```

3. **Try the OAuth flow**:
   ```
   http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
   ```

## 🎯 Recommended: Just Use Test Mode!

For demonstration purposes, **Test Mode** is the easiest:

✅ No Epic account needed  
✅ No Client ID configuration needed  
✅ Works immediately  
✅ Shows all model features

The real FHIR integration is optional and only needed if you want to fetch actual patient data from Epic's sandbox.

## 📊 What You'll See in Test Mode

```
PE Probability: 20.0%
Decision: → CONTINUE WORKUP
Threshold: 8.0%

Sample patient data:
- Age: 65, Male, BMI: 28.5
- Heart Rate: 95 bpm
- O2 Saturation: 96%
- D-dimer: 450 ng/mL
- All 25 features included
```

## ⚡ Quick Commands

```bash
# Install new dependency
cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
source venv/bin/activate
pip install python-dotenv

# Restart backend
./run.sh

# Then open frontend
# http://localhost:3000
# Click "🧪 Test with Sample Data"
```

That's it! 🎉

---

**Status:** ✅ Fixed  
**Action Required:** Install `python-dotenv` and restart backend  
**Time:** 1 minute

