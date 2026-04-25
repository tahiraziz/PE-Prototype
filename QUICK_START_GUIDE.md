# PE Rule-Out SMART on FHIR Demo - Quick Start Guide

**Ready to run in 5 minutes!** ⚡

---

## 🎯 What You Have

A complete SMART on FHIR integration demo that:
- Connects to Epic FHIR sandbox
- Fetches patient data via FHIR API
- Runs PE rule-out prediction
- Displays results in web UI

---

## 📋 Prerequisites Checklist

- [ ] Python 3.12 installed
- [ ] Node.js 18+ installed  
- [ ] Epic FHIR sandbox account ([Register here](https://fhir.epic.com/))
- [ ] Epic Client ID from app registration

---

## ⚡ Quick Setup

### Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure Epic credentials
cp .env.example .env
nano .env  # Add your EPIC_CLIENT_ID

# Optional: Train model (or use dummy model)
python export_model.py
```

### Step 2: Frontend Setup (1 minute)

```bash
# Navigate to frontend (in new terminal)
cd frontend

# Install dependencies
npm install
```

### Step 3: Run! (30 seconds)

**Terminal 1 - Backend:**
```bash
cd backend
./run.sh
```

**Terminal 2 - Frontend:**
```bash
cd frontend
./run.sh
```

---

## 🌐 Access Points

- **Frontend UI:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Interactive Swagger)

---

## 🧪 Quick Test

### Option 1: Direct Feature Test (No FHIR needed)

1. Open http://localhost:3000
2. Enter any patient ID (e.g., "test-patient-123")
3. Click "Run PE Assessment"
4. ✅ View results!

### Option 2: Full FHIR Integration

1. Go to http://localhost:8000/launch?iss=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
2. Log in to Epic sandbox
3. Authorize the app
4. Redirects to frontend with patient data
5. Click "Run PE Assessment"
6. ✅ View real FHIR data results!

---

## 🎓 Test Patient IDs (Epic Sandbox)

- **Default patient:** `Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB`
- More at: https://fhir.epic.com/Documentation?docId=testpatients

---

## 🧪 Run Tests

```bash
cd backend
source venv/bin/activate
pytest
```

Expected: ✅ All tests pass

---

## 📊 What You'll See

The UI shows:
- **PE Probability** (e.g., 5.4%)
- **Decision** ("RULE OUT" or "CONTINUE WORKUP")
- **Threshold** (0.08 / 8%)
- **Patient Data Summary** (demographics, vitals, labs)
- **Data Completeness** (how many features available)
- **Clinical Explanation**

---

## 🔍 Example Output

```
PE Probability: 5.43%
Decision: ✓ RULE OUT PE
Threshold: 8.0%

Explanation: Low PE probability (5.4%). Based on the model, PE can be 
RULED OUT with 98.9% confidence (NPV). Consider avoiding CT pulmonary 
angiography if clinically appropriate.

Demographics:
  Age: 65 years
  Gender: M
  BMI: 28.5 kg/m²

Vital Signs:
  Heart Rate: 95 bpm
  Oxygen Saturation: 96%
  Blood Pressure: 130/80 mmHg

Laboratory:
  D-dimer: 450 ng/mL
  Troponin-T: Not available
  ...

Data Completeness: 18/25 features available
```

---

## ⚠️ Important Reminders

- ✅ This is a **DEMONSTRATION** only
- ❌ NOT FDA approved
- ❌ NOT for clinical use
- ✅ Requires physician oversight
- ✅ Read-only (no orders created)

---

## 📚 Full Documentation

- **INTEGRATION_README.md** - Complete guide (setup, API, troubleshooting)
- **PROJECT_SUMMARY.md** - Technical overview
- **Cursor Files/** - Original model documentation

---

## 🆘 Quick Troubleshooting

**Backend won't start?**
- Check Python version: `python3.12 --version`
- Activate venv: `source venv/bin/activate`
- Check .env file has EPIC_CLIENT_ID

**Frontend won't start?**
- Check Node version: `node --version` (need 18+)
- Run `npm install` again

**"401 Unauthorized" error?**
- Check Epic Client ID is correct
- Complete OAuth flow via /launch endpoint

**Tests failing?**
- Ensure model loaded: `python export_model.py`
- Check venv activated: `which python`

---

## 🎉 Success Criteria

You're all set if:
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running on http://localhost:3000
- ✅ Can submit assessment and get result
- ✅ Tests pass (`pytest`)

---

## 🚀 Next Steps

1. **Try it out:** Run assessment on test patients
2. **Explore API:** Visit http://localhost:8000/docs
3. **Read docs:** See INTEGRATION_README.md
4. **Customize:** Modify for your use case

---

## 💡 Pro Tips

- Use API docs at `/docs` for interactive testing
- Check backend logs for debugging
- Frontend proxies to backend automatically
- Session expires after 1 hour (re-auth via /launch)

---

**Need help?** See INTEGRATION_README.md "Troubleshooting" section

**Ready to learn more?** Read PROJECT_SUMMARY.md for technical details

---

**Status:** ✅ Complete and Ready  
**Version:** 1.0.0  
**Last Updated:** November 24, 2025

**Happy testing!** 🎉

