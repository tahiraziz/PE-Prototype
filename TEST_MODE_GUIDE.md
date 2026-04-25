# Test Mode - How to Use Without FHIR Authentication

## ✅ Quick Fix for "Valid session required" Error

You're seeing this error because the app was trying to fetch real FHIR data, but you haven't authenticated with Epic yet. **No problem!** You can now use **Test Mode** instead.

## 🧪 Using Test Mode (Recommended for Quick Testing)

1. **Refresh your browser** at http://localhost:3000
2. You'll see a **"🧪 Test with Sample Data"** button
3. Click it!
4. The model will run using sample patient data (no FHIR authentication needed)

### Sample Data Used in Test Mode

When you click "Test with Sample Data", the app uses this sample patient:

```
Demographics:
- Age: 65 years
- Gender: Male
- BMI: 28.5 kg/m²

Vital Signs:
- Heart Rate: 95 bpm
- Respiratory Rate: 18 /min
- Oxygen Saturation: 96%
- Temperature: 37.0°C
- Blood Pressure: 130/80 mmHg

Labs:
- D-dimer: 450 ng/mL
- Troponin-T: 0.01 ng/mL
- NT-proBNP: 100 pg/mL
- And more...
```

This is a **moderate-risk profile** that should give you a probability around 5-10%, likely resulting in "RULE OUT PE" decision.

## 🏥 Using Real FHIR Data (Optional - For Full Demo)

If you want to test with **real Epic sandbox data**, you need to authenticate first:

### Step 1: Start OAuth Flow

Visit this URL in your browser:
```
http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

### Step 2: Log In to Epic

- You'll be redirected to Epic's login page
- Log in with your Epic sandbox credentials
- Authorize the app

### Step 3: Use Real Data

- After OAuth completes, you'll be redirected back to the frontend
- You'll now see **two buttons**:
  - 🧪 Test with Sample Data (same as before)
  - 🏥 Use Real FHIR Data (NEW - fetches from Epic)

## 🔄 What Changed?

**Before:** The app always tried to fetch FHIR data → Error if not authenticated

**Now:** 
- Default: Use sample data (works immediately)
- Optional: Authenticate to fetch real FHIR data

## 💡 Recommended Workflow

### For Quick Testing
1. Use **"🧪 Test with Sample Data"** button
2. Verify the model works
3. Check the results display

### For Full FHIR Demo
1. Configure your Epic Client ID in `.env`
2. Visit `/launch` to authenticate
3. Use **"🏥 Use Real FHIR Data"** button
4. See real patient data from Epic sandbox

## 🎯 Expected Results with Test Data

With the sample data, you should see:

- **Probability:** ~5-7% (varies based on model)
- **Decision:** RULE OUT PE (probability < 0.08)
- **Explanation:** Low PE probability, can safely rule out
- **Data Completeness:** 25/25 features available

## ❓ Troubleshooting

### "Test with Sample Data" button not showing?

**Solution:** Refresh the page (the frontend code was just updated)

### Still getting errors with Test Mode?

**Check:**
1. Backend is running: http://localhost:8000/health
2. Frontend is running: http://localhost:3000
3. Check browser console for error details (F12 → Console tab)

### Want to test different patient scenarios?

The sample data is hardcoded in the component. You can modify it in:
```
frontend/src/components/PEAssessment.tsx
```

Look for the `getSampleFeatures()` function and change values like:
- `triage_hr: 120` (tachycardia → higher risk)
- `triage_o2sat: 88` (hypoxemia → higher risk)  
- `d_dimer: 2000` (elevated → higher risk)

## 🚀 Try It Now!

1. **Refresh your browser:** http://localhost:3000
2. **Click:** 🧪 Test with Sample Data
3. **View results!**

No FHIR authentication needed! 🎉

---

**Need help?** See `INTEGRATION_README.md` for full documentation.

