# How to Configure Your Epic Client ID

## Quick Answer

Your Epic FHIR Client ID goes in a **`.env`** file in the backend directory.

## Step-by-Step Instructions

### 1. Create the `.env` file

Navigate to the backend directory and create a `.env` file:

```bash
cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
cp env_template.txt .env
```

Or manually create a file named `.env` in the `backend/` folder.

### 2. Add Your Client ID

Open the `.env` file and replace `your_client_id_from_epic_here` with your actual Client ID:

```bash
# Before:
EPIC_CLIENT_ID=your_client_id_from_epic_here

# After (example):
EPIC_CLIENT_ID=abc123-def456-ghi789
```

### 3. Complete Configuration

Your `.env` file should look like this:

```bash
FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
EPIC_CLIENT_ID=abc123-def456-ghi789  # ← YOUR CLIENT ID HERE
EPIC_CLIENT_SECRET=  # Usually empty for public clients
EPIC_REDIRECT_URI=http://localhost:8000/callback
EPIC_AUTH_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
EPIC_TOKEN_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=INFO
```

## Where to Get Your Client ID

1. Go to https://fhir.epic.com/
2. Log in to your Epic sandbox account
3. Navigate to **"Build Apps"** → **"My Apps"**
4. Select your app or create a new one
5. Copy the **Client ID** shown on the app details page

## Important Settings in Epic App

When creating/configuring your Epic app, make sure:

- **Redirect URI:** `http://localhost:8000/callback`
- **Scopes:** 
  - `patient/Patient.read`
  - `patient/Observation.read`
  - `launch` (if using EHR launch)
  - `launch/patient` (if using standalone launch)

## Testing the Configuration

Once you've added your Client ID:

```bash
# Start the backend
cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
./run.sh
```

You should see:
```
✓ Model loaded successfully
🚀 Starting FastAPI server...
```

If you see errors about "EPIC_CLIENT_ID not configured", double-check:
1. The `.env` file exists in the `backend/` folder
2. The file is named exactly `.env` (not `.env.txt`)
3. You replaced the placeholder with your actual Client ID
4. There are no extra spaces or quotes around the ID

## Need Help?

- **Can't find Client ID?** Check Epic sandbox: https://fhir.epic.com/
- **App not registered?** Follow the guide in `INTEGRATION_README.md`
- **Still having issues?** Check the backend console logs for specific errors

## File Location Summary

```
Cursor FHIR integration/
└── backend/
    ├── .env              ← CREATE THIS FILE (put Client ID here)
    ├── env_template.txt  ← Template to copy from
    ├── main.py           ← Reads the .env file
    └── [other files...]
```

---

**Quick Command:**

```bash
cd "/Users/MusabHashem/Downloads/MIMIC_Testing/Cursor FHIR integration/backend"
nano .env  # or use any text editor
# Add: EPIC_CLIENT_ID=your_actual_id_here
# Save and exit
```

That's it! Your Client ID is now configured. 🎉

