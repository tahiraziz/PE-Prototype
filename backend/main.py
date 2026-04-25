"""
FastAPI Backend for PE Rule-Out SMART on FHIR Integration Demo

This is a prototype demonstration integrating the PE rule-out model with Epic's FHIR sandbox.
NOT FOR PRODUCTION USE - demonstration purposes only.
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
import os
import logging
import traceback
from datetime import datetime

from pe_model.serve_model import load_pe_model, predict_pe_probability, interpret_pe_result
from integration.fhir_mapping import FHIRClient, map_fhir_to_features, FHIRScopeError
from config import epic_config

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use centralized config for sandbox mode
SANDBOX_MODE = epic_config.is_sandbox

# Initialize FastAPI app
app = FastAPI(
    title="PE Rule-Out SMART on FHIR Demo",
    description="Demonstration of PE rule-out model integrated with Epic FHIR sandbox",
    version="1.0.0"
)

# Add CORS middleware
# Note: When allow_credentials=True, allow_origins cannot be ["*"]
# Must specify exact origins for cookies to work
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)

# In-memory session storage (prototype only - use Redis/DB in production)
sessions = {}

# Last token exchange result (for debugging)
last_token_exchange = {
    "status_code": None,
    "scope": None,
    "error": None,
    "error_description": None,
    "timestamp": None,
    "raw_body_preview": None
}

# Auth-in-progress tracking (to prevent duplicate auth attempts)
auth_progress = {
    "in_progress": False,
    "started_at": None,
    "state": None
}

# Initialize model at startup
@app.on_event("startup")
async def startup_event():
    """Load the PE model and validate Epic configuration on startup"""
    # Log Epic configuration
    epic_config.log_config()
    
    # Validate Epic config
    try:
        epic_config.validate()
    except ValueError as e:
        logger.warning(f"Epic config warning: {e}")
    
    # Load PE model
    logger.info("Loading PE rule-out model...")
    try:
        load_pe_model()
        logger.info("✓ Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


# ============================================================================
# SMART on FHIR OAuth Flow
# ============================================================================

@app.get("/launch")
async def launch(iss: Optional[str] = None, launch: Optional[str] = None):
    """
    SMART launch endpoint - initiates OAuth flow with Epic.
    
    Supports two modes:
    1. STANDALONE LAUNCH (default for sandbox testing):
       - No iss/launch params needed
       - Uses FHIR_BASE_URL from config as 'aud'
       - Redirects to Epic SMART authorization page
       
    2. EHR LAUNCH (when Epic EHR initiates):
       - iss and launch params provided by Epic
       - Uses provided 'iss' as 'aud'
       - Includes 'launch' token in request
    
    Query params:
    - iss: FHIR server base URL (optional, for EHR launch)
    - launch: Launch token (optional, for EHR launch)
    """
    logger.info("=" * 60)
    logger.info("SMART LAUNCH INITIATED")
    logger.info("=" * 60)
    
    # Check if auth is already in progress (prevent duplicate redirects)
    if auth_progress["in_progress"] and auth_progress["started_at"]:
        elapsed = datetime.now().timestamp() - auth_progress["started_at"]
        if elapsed < 180:  # 3 minutes - reduced from 5 to avoid stuck states
            logger.warning(f"Auth already in progress (started {elapsed:.0f}s ago). Returning 409.")
            raise HTTPException(
                status_code=409,
                detail=f"Authentication already in progress ({int(elapsed)}s ago). Complete the current auth flow or reset."
            )
        else:
            # Auth timed out, treat as stale and allow new attempt
            logger.info(f"Previous auth stale after {elapsed:.0f}s. Clearing and allowing new attempt.")
            auth_progress["in_progress"] = False
            auth_progress["state"] = None
            auth_progress["started_at"] = None
    
    # Determine launch mode
    is_ehr_launch = bool(iss and launch)
    launch_mode = "EHR Launch" if is_ehr_launch else "Standalone Launch"
    logger.info(f"  Launch Mode: {launch_mode}")
    logger.info(f"  iss param: {iss}")
    logger.info(f"  launch param: {launch}")
    
    # Validate config
    try:
        epic_config.validate()
    except ValueError as e:
        logger.error(f"Config validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # STRICT VALIDATION before redirect
    config_errors = epic_config.get_config_errors()
    if config_errors:
        logger.warning("=" * 60)
        logger.warning("CONFIG ISSUES DETECTED:")
        for err in config_errors:
            if err.startswith("ERROR"):
                logger.error(f"  {err}")
            else:
                logger.warning(f"  {err}")
        logger.warning("=" * 60)
    
    # Use normalized redirect_uri from config (ONE source of truth)
    redirect_uri = epic_config.get_normalize_redirect_uri()
    
    # Generate state
    state = f"state_{datetime.now().timestamp()}"
    
    # ASSERTION: aud ALWAYS equals FHIR_BASE_URL (single source of truth)
    # For standalone launch, this is our configured value
    # For EHR launch, we could use iss but we enforce consistency
    aud = epic_config.fhir_base_url  # ALWAYS use config - never override
    
    if is_ehr_launch and iss and iss != epic_config.fhir_base_url:
        logger.warning(f"EHR launch provided iss={iss} but using configured FHIR_BASE_URL={aud}")
    
    # Build auth params using config values
    auth_params = {
        "response_type": "code",
        "client_id": epic_config.client_id,
        "redirect_uri": redirect_uri,
        "scope": epic_config.scope,
        "state": state,
        "aud": aud,
    }
    
    # Only include launch token for EHR launch
    if is_ehr_launch and launch:
        auth_params["launch"] = launch
    
    # VALIDATION: Ensure scope contains FHIR scopes (not just openid/fhirUser)
    scope_parts = epic_config.scope.split()
    fhir_scopes = [s for s in scope_parts if s.startswith("patient/") or s.startswith("user/")]
    if not fhir_scopes:
        logger.error(f"CRITICAL: Scope missing FHIR scopes! Only has: {epic_config.scope}")
    
    # Build query string with proper URL encoding
    from urllib.parse import urlencode
    query = urlencode(auth_params)
    authorization_url = f"{epic_config.auth_url}?{query}"
    
    # Log ALL parameters for debugging
    logger.info("-" * 60)
    logger.info("OAuth Parameters (VERIFY AGAINST EPIC APP REGISTRATION):")
    logger.info(f"  EPIC_ENV: {epic_config.env}")
    logger.info(f"  client_id: {epic_config.client_id}")
    logger.info(f"  redirect_uri (EXACT): {redirect_uri}")
    logger.info(f"  scope: {epic_config.scope}")
    logger.info(f"  aud: {aud}")
    logger.info(f"  response_type: code")
    logger.info(f"  state: {state}")
    logger.info("-" * 60)
    logger.info(f"Authorize URL Base: {epic_config.auth_url}")
    logger.info(f"Token URL Base: {epic_config.token_url}")
    logger.info("-" * 60)
    logger.info(f"FULL AUTHORIZE URL (copy this to verify):")
    logger.info(authorization_url)
    logger.info("=" * 60)
    
    # Set auth in progress
    auth_progress["in_progress"] = True
    auth_progress["started_at"] = datetime.now().timestamp()
    auth_progress["state"] = state
    
    return RedirectResponse(url=authorization_url)


@app.get("/launch-test")
async def launch_test():
    """
    Test endpoint that shows the authorize URL WITHOUT redirecting.
    Use this to verify the exact URL being sent to Epic.
    
    Visit /launch-test in browser, copy the URL, and paste it directly
    to see what Epic returns.
    """
    # Validate config
    try:
        epic_config.validate()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    redirect_uri = epic_config.get_normalize_redirect_uri()
    state = f"test_state_{datetime.now().timestamp()}"
    
    auth_params = {
        "response_type": "code",
        "client_id": epic_config.client_id,
        "redirect_uri": redirect_uri,
        "scope": epic_config.scope,
        "state": state,
        "aud": epic_config.fhir_base_url,
    }
    
    from urllib.parse import urlencode
    query = urlencode(auth_params)
    authorization_url = f"{epic_config.auth_url}?{query}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><title>Launch Test - Verify OAuth URL</title></head>
    <body style="font-family: sans-serif; padding: 40px; max-width: 900px; margin: auto;">
        <h1>🔍 OAuth URL Verification</h1>
        
        <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3>✅ Our Backend Sends This URL:</h3>
            <p style="font-size: 12px; word-break: break-all; background: #1a202c; color: #68d391; padding: 15px; border-radius: 4px; font-family: monospace;">
                {authorization_url}
            </p>
            <button onclick="navigator.clipboard.writeText('{authorization_url}')" style="background: #22c55e; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                📋 Copy URL
            </button>
            <a href="{authorization_url}" style="display: inline-block; margin-left: 10px; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
                ▶️ Test URL (will redirect)
            </a>
        </div>
        
        <h3>OAuth Parameters Being Sent:</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>authorize_url_base</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{epic_config.auth_url}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>client_id</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{epic_config.client_id}</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>redirect_uri</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{redirect_uri}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>scope</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{epic_config.scope}</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>aud</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{epic_config.fhir_base_url}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>response_type</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">code</td></tr>
            <tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #d1d5db;"><strong>state</strong></td><td style="padding: 8px; border: 1px solid #d1d5db; font-family: monospace;">{state}</td></tr>
        </table>
        
        <div style="margin-top: 20px; background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px;">
            <h4>⚠️ If you still see MyChart redirect:</h4>
            <p>The redirect to MyChart is happening <strong>on Epic's server</strong>, not in our code. This means:</p>
            <ul>
                <li>Your Epic App may still be configured with "Patients" audience (check App Orchard)</li>
                <li>Epic may need time to propagate your app changes (wait 5-10 minutes)</li>
                <li>Try clearing your browser cache/cookies for fhir.epic.com</li>
                <li>The scopes in your Epic app registration may not match what we're requesting</li>
            </ul>
        </div>
        
        <h3>What URL Should Look Like:</h3>
        <p style="font-family: monospace; font-size: 12px;">
            ✅ CORRECT: https://fhir.epic.com/<strong>interconnect-fhir-oauth</strong>/oauth2/authorize?...<br>
            ❌ WRONG: https://fhir.epic.com/<strong>mychart-fhir</strong>/Authentication/OAuth/Start?...
        </p>
        
        <p style="margin-top: 20px;">
            <a href="/api/auth/diagnostics">View Full Diagnostics JSON</a>
        </p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@app.get("/callback")
async def callback(
    code: Optional[str] = None, 
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None
):
    """
    OAuth callback endpoint - exchanges code for access token.
    
    Uses centralized config for client ID and URLs.
    IMPORTANT: Uses same normalized redirect_uri as /launch to prevent mismatch.
    
    Query params (success):
    - code: Authorization code from Epic
    - state: State parameter for CSRF protection
    
    Query params (error):
    - error: OAuth error code
    - error_description: Human-readable error description
    """
    logger.info("=" * 60)
    logger.info("OAUTH CALLBACK RECEIVED")
    logger.info("=" * 60)
    logger.info(f"  Callback query params:")
    logger.info(f"    code: {code[:10] + '...' if code else '(none)'}")
    logger.info(f"    state: {state}")
    logger.info(f"    error: {error}")
    logger.info(f"    error_description: {error_description}")
    
    # Check for OAuth error response
    if error:
        logger.error("=" * 60)
        logger.error("OAUTH ERROR FROM EPIC")
        logger.error("=" * 60)
        logger.error(f"  error: {error}")
        logger.error(f"  error_description: {error_description}")
        logger.error("=" * 60)
        
        # Save to last_token_exchange for debugging
        last_token_exchange["status_code"] = "OAUTH_ERROR"
        last_token_exchange["scope"] = None
        last_token_exchange["error"] = error
        last_token_exchange["error_description"] = error_description
        last_token_exchange["timestamp"] = datetime.now().isoformat()
        last_token_exchange["raw_body_preview"] = f"OAuth callback error: {error} - {error_description}"
        
        # Clear auth in progress (OAuth error)
        auth_progress["in_progress"] = False
        auth_progress["state"] = None
        auth_progress["started_at"] = None
        
        # Return error page for development
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Error</title></head>
        <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: auto;">
            <h1 style="color: #dc2626;">OAuth Error</h1>
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px;">
                <p><strong>Error:</strong> {error}</p>
                <p><strong>Description:</strong> {error_description or 'No description provided'}</p>
            </div>
            <h2>Debugging Steps:</h2>
            <ol>
                <li>Check <a href="/api/auth/diagnostics">/api/auth/diagnostics</a> for OAuth configuration</li>
                <li>Verify client_id matches Epic App Orchard registration</li>
                <li>Verify redirect_uri matches EXACTLY (including http vs https)</li>
                <li>Verify Application Audience is "Patients" not "Clinicians"</li>
                <li>Check that scopes are enabled in Epic app</li>
            </ol>
            <h3>Common Causes:</h3>
            <ul>
                <li><strong>invalid_client</strong>: Client ID not found or wrong</li>
                <li><strong>invalid_request</strong>: Missing or invalid parameters</li>
                <li><strong>unauthorized_client</strong>: App not authorized for these scopes</li>
                <li><strong>access_denied</strong>: User denied authorization</li>
            </ul>
            <p><a href="/">← Back to Home</a> | <a href="/api/auth/diagnostics">View Diagnostics</a></p>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)
    
    # Validate required params for success case
    if not code or not state:
        logger.error("Missing code or state in callback")
        # Save to last_token_exchange for debugging
        last_token_exchange["status_code"] = "MISSING_PARAMS"
        last_token_exchange["scope"] = None
        last_token_exchange["error"] = "missing_params"
        last_token_exchange["error_description"] = f"code={bool(code)}, state={bool(state)}"
        last_token_exchange["timestamp"] = datetime.now().isoformat()
        last_token_exchange["raw_body_preview"] = "Callback missing required code or state parameter"
        # Clear auth in progress (missing params)
        auth_progress["in_progress"] = False
        auth_progress["state"] = None
        auth_progress["started_at"] = None
        raise HTTPException(status_code=400, detail="Missing code or state parameter")
    
    # Use SAME normalized redirect_uri as /launch (critical for OAuth)
    redirect_uri = epic_config.get_normalize_redirect_uri()
    
    logger.info("Token Exchange Parameters:")
    logger.info(f"  client_id: {epic_config.client_id}")
    logger.info(f"  redirect_uri (EXACT): {redirect_uri}")
    logger.info(f"  token_url: {epic_config.token_url}")
    
    # Exchange code for token
    import httpx
    
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,  # Must match authorize request exactly
        "client_id": epic_config.client_id,
    }
    
    if epic_config.client_secret:
        token_data["client_secret"] = epic_config.client_secret
    
    # Log token request payload keys (not values for security)
    logger.info(f"  Token request payload keys: {list(token_data.keys())}")
    
    # Set PENDING status before making request
    last_token_exchange["status_code"] = "PENDING"
    last_token_exchange["scope"] = None
    last_token_exchange["error"] = None
    last_token_exchange["error_description"] = None
    last_token_exchange["timestamp"] = datetime.now().isoformat()
    last_token_exchange["raw_body_preview"] = "Token exchange in progress..."
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(epic_config.token_url, data=token_data)
            
            # ALWAYS save raw response first
            raw_body = response.text[:800] if response.text else "(empty)"
            logger.info("=" * 60)
            logger.info("TOKEN EXCHANGE RESPONSE (DEV)")
            logger.info("=" * 60)
            logger.info(f"  Status code: {response.status_code}")
            logger.info(f"  Raw body preview: {raw_body[:200]}...")
            
            # Try to parse response body
            try:
                token_response = response.json()
            except Exception as parse_err:
                logger.error(f"  Failed to parse response JSON: {parse_err}")
                logger.error(f"  Raw body: {raw_body}")
                # ALWAYS save to last_token_exchange
                last_token_exchange["status_code"] = response.status_code
                last_token_exchange["scope"] = None
                last_token_exchange["error"] = "JSON_PARSE_ERROR"
                last_token_exchange["error_description"] = str(parse_err)
                last_token_exchange["timestamp"] = datetime.now().isoformat()
                last_token_exchange["raw_body_preview"] = raw_body
                # Clear auth in progress (parse error)
                auth_progress["in_progress"] = False
                auth_progress["state"] = None
                auth_progress["started_at"] = None
                raise HTTPException(status_code=400, detail=f"Token response parse error: {parse_err}")
            
            # Log the response body with redacted access_token
            redacted_body = dict(token_response)
            if "access_token" in redacted_body:
                at = redacted_body["access_token"]
                redacted_body["access_token"] = at[:10] + "...[REDACTED]" if len(at) > 10 else "[REDACTED]"
            if "refresh_token" in redacted_body:
                redacted_body["refresh_token"] = "[REDACTED]"
            logger.info(f"  Response body (redacted): {redacted_body}")
            
            # Specifically log scope field
            response_scope = token_response.get("scope")
            logger.info(f"  Returned 'scope' field: {response_scope}")
            
            # Log any error fields
            response_error = token_response.get("error")
            response_error_desc = token_response.get("error_description")
            if response_error:
                logger.error(f"  ERROR in token response: {response_error}")
                logger.error(f"  ERROR DESCRIPTION: {response_error_desc}")
            
            # ALWAYS store for /api/auth/last-token endpoint
            last_token_exchange["status_code"] = response.status_code
            last_token_exchange["scope"] = response_scope
            last_token_exchange["error"] = response_error
            last_token_exchange["error_description"] = response_error_desc
            last_token_exchange["timestamp"] = datetime.now().isoformat()
            # Use redacted body for preview (more readable than raw)
            last_token_exchange["raw_body_preview"] = str(redacted_body)[:800]
            
            logger.info(f"  Saved to last_token_exchange: status={response.status_code}, scope={response_scope}")
            
            logger.info("=" * 60)
            
            # Now check for HTTP errors
            if response.status_code >= 400:
                logger.error(f"Token exchange failed with status {response.status_code}")
                # Clear auth in progress (HTTP error in token exchange)
                auth_progress["in_progress"] = False
                auth_progress["state"] = None
                auth_progress["started_at"] = None
                raise HTTPException(status_code=response.status_code, detail=f"Token exchange failed: {response_error or response.text[:200]}")
        
        # Log the full token response for debugging (redact the actual token)
        granted_scope = token_response.get("scope", "")
        patient_context = token_response.get("patient")
        fhir_user = token_response.get("fhirUser")
        encounter_context = token_response.get("encounter")
        
        logger.info("=" * 60)
        logger.info("TOKEN RESPONSE (DEBUG)")
        logger.info("=" * 60)
        logger.info(f"  Granted scope: {granted_scope}")
        logger.info(f"  Patient context: {patient_context}")
        logger.info(f"  Encounter context: {encounter_context}")
        logger.info(f"  fhirUser: {fhir_user}")
        logger.info(f"  Token type: {token_response.get('token_type')}")
        logger.info(f"  Expires in: {token_response.get('expires_in')} seconds")
        
        # Check if FHIR scopes were granted
        scope_parts = granted_scope.split() if granted_scope else []
        has_patient_read = any("Patient.read" in s for s in scope_parts)
        has_observation_read = any("Observation.read" in s for s in scope_parts)
        
        if not has_patient_read:
            logger.warning("WARNING: patient/Patient.read or user/Patient.read NOT in granted scopes!")
        if not has_observation_read:
            logger.warning("WARNING: patient/Observation.read or user/Observation.read NOT in granted scopes!")
        
        logger.info("=" * 60)
        
        # Decode JWT access token if possible (for debugging)
        access_token = token_response.get("access_token", "")
        jwt_claims = None
        if access_token and "." in access_token:
            try:
                import base64
                import json as json_module
                # JWT is base64url encoded, split by dots
                parts = access_token.split(".")
                if len(parts) >= 2:
                    # Decode payload (second part)
                    payload = parts[1]
                    # Add padding if needed
                    padding = 4 - len(payload) % 4
                    if padding != 4:
                        payload += "=" * padding
                    decoded = base64.urlsafe_b64decode(payload)
                    jwt_claims = json_module.loads(decoded)
                    logger.info("JWT Claims (decoded):")
                    for k, v in jwt_claims.items():
                        if k not in ["access_token", "refresh_token"]:  # Don't log sensitive tokens
                            logger.info(f"  {k}: {v}")
            except Exception as e:
                logger.debug(f"Could not decode JWT: {e}")
        
        # Store token in session (prototype - use secure session management in production)
        session_id = f"session_{state}"
        sessions[session_id] = {
            "access_token": access_token,
            "patient": patient_context,
            "fhir_base": token_response.get("fhir_base") or epic_config.fhir_base_url,
            "expires_at": datetime.now().timestamp() + token_response.get("expires_in", 3600),
            # Store debug info for UI
            "granted_scope": granted_scope,
            "fhir_user": fhir_user,
            "encounter": encounter_context,
            "jwt_claims": jwt_claims,
            "scope_analysis": {
                "has_patient_read": has_patient_read,
                "has_observation_read": has_observation_read,
                "scope_parts": scope_parts
            }
        }
        
        logger.info(f"Token received for patient: {patient_context}")
        
        # Clear auth in progress (success)
        auth_progress["in_progress"] = False
        auth_progress["state"] = None
        auth_progress["started_at"] = None
        
        # Redirect to frontend with session ID (also set cookie for seamless API calls)
        redirect_url = f"{epic_config.frontend_url}?session={session_id}&patient={token_response.get('patient')}"
        
        # Create the response object that will be returned to browser
        response = RedirectResponse(url=redirect_url, status_code=302)
        
        # Set cookie DIRECTLY on the response object (same as working debug endpoint)
        # CRITICAL: Must set cookie on THIS response before returning
        logger.info("=" * 60)
        logger.info(f"SETTING COOKIE pe_session_id={session_id[:20]}... samesite=lax secure=false")
        logger.info("=" * 60)
        response.set_cookie(
            key="pe_session_id",
            value=session_id,
            path="/",
            httponly=True,
            samesite="lax",
            secure=False
        )
        
        logger.info(f"OAuth callback SUCCESS: Cookie set, redirecting to {redirect_url}")
        return response
        
    except httpx.HTTPError as e:
        logger.error(f"Token exchange failed with HTTPError: {e}")
        # ALWAYS save to last_token_exchange
        last_token_exchange["status_code"] = "HTTP_ERROR"
        last_token_exchange["scope"] = None
        last_token_exchange["error"] = "httpx_error"
        last_token_exchange["error_description"] = str(e)
        last_token_exchange["timestamp"] = datetime.now().isoformat()
        last_token_exchange["raw_body_preview"] = f"HTTPError: {str(e)}"
        # Clear auth in progress (error)
        auth_progress["in_progress"] = False
        auth_progress["state"] = None
        auth_progress["started_at"] = None
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")
    except Exception as e:
        logger.error(f"Token exchange failed with unexpected error: {e}", exc_info=True)
        # ALWAYS save to last_token_exchange
        last_token_exchange["status_code"] = "EXCEPTION"
        last_token_exchange["scope"] = None
        last_token_exchange["error"] = type(e).__name__
        last_token_exchange["error_description"] = str(e)
        last_token_exchange["timestamp"] = datetime.now().isoformat()
        last_token_exchange["raw_body_preview"] = f"Exception: {type(e).__name__}: {str(e)}"
        # Clear auth in progress (error)
        auth_progress["in_progress"] = False
        auth_progress["state"] = None
        auth_progress["started_at"] = None
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")


# ============================================================================
# PE Assessment API
# ============================================================================

class PEAssessmentRequest(BaseModel):
    """Request model for PE assessment"""
    patient_id: str
    session_id: Optional[str] = None  # For authenticated FHIR access
    # Alternative: provide features directly (for testing without FHIR)
    features: Optional[Dict[str, Any]] = None


class PEAssessmentDebug(BaseModel):
    """Debug info included in assessment response."""
    patient_id: str
    data_source: str  # "fhir" or "provided_features"
    fhir_calls: List[str] = []
    vitals_count: int = 0
    labs_count: int = 0
    missing_critical: List[str] = []
    missing_optional: List[str] = []
    warnings: List[str] = []


# Critical fields for assessment
CRITICAL_FIELDS = ["age", "triage_hr", "triage_rr", "triage_o2sat", "triage_sbp"]
OPTIONAL_FIELDS = ["d_dimer", "triage_dbp", "triage_temp", "troponin_t", "creatinine", "bmi"]


@app.post("/api/pe-assessment")
async def pe_assessment(request: PEAssessmentRequest):
    """
    Run PE assessment for a patient.
    
    This endpoint:
    1. Fetches patient data from Epic FHIR (if session provided)
    2. Maps FHIR resources to model features
    3. Runs PE probability prediction
    4. Interprets result with 0.08 threshold
    5. Returns recommendation with debug info
    
    NOTE: This is READ-ONLY clinical decision support.
    It does NOT create, modify, or cancel any orders.
    """
    logger.info(f"=== PE ASSESSMENT START: patient={request.patient_id} ===")
    
    # Initialize debug info
    debug_info = {
        "patient_id": request.patient_id,
        "data_source": "provided_features" if request.features else "fhir",
        "fhir_calls": [],
        "vitals_count": 0,
        "labs_count": 0,
        "missing_critical": [],
        "missing_optional": [],
        "warnings": []
    }
    
    try:
        # Get features either from FHIR or direct input
        if request.features:
            # Direct feature input (for testing)
            logger.info("Using directly provided features")
            patient_features = request.features
            feature_summary = patient_features
        else:
            # Fetch from FHIR
            session = get_session_or_error(request.session_id)
            
            # Initialize FHIR client
            fhir_client = FHIRClient(
                base_url=session["fhir_base"],
                access_token=session["access_token"]
            )
            
            # Record FHIR calls for debug
            debug_info["fhir_calls"].append(f"GET Patient/{request.patient_id}")
            debug_info["fhir_calls"].append(f"GET Observation?patient={request.patient_id}&_count=200&_sort=-date")
            
            # Fetch and map FHIR data
            logger.info("Fetching patient data from FHIR...")
            patient_features, feature_summary = await map_fhir_to_features(
                fhir_client, 
                request.patient_id
            )
            
            # Count vitals and labs for debug
            if isinstance(feature_summary, dict):
                vitals = feature_summary.get("vital_signs", {})
                labs = feature_summary.get("laboratory", {})
                debug_info["vitals_count"] = sum(1 for v in vitals.values() if v and v != "Not available")
                debug_info["labs_count"] = sum(1 for v in labs.values() if v and v != "Not available")
        
        # Analyze missing fields
        for field in CRITICAL_FIELDS:
            if patient_features.get(field) is None:
                debug_info["missing_critical"].append(field)
        
        for field in OPTIONAL_FIELDS:
            if patient_features.get(field) is None:
                debug_info["missing_optional"].append(field)
        
        # Add warnings for common issues
        if not patient_features.get("d_dimer"):
            debug_info["warnings"].append("D-dimer not found in FHIR data")
        if not patient_features.get("triage_o2sat"):
            debug_info["warnings"].append("SpO2 not found - critical for PE assessment")
        
        # Run prediction
        logger.info("Running PE prediction...")
        probability = predict_pe_probability(patient_features)
        
        # Interpret result
        result = interpret_pe_result(probability)
        
        # Structured logging for assessment
        logger.info(
            f"=== ASSESSMENT RESULT ===\n"
            f"  patient_id: {request.patient_id}\n"
            f"  data_source: {debug_info['data_source']}\n"
            f"  vitals_count: {debug_info['vitals_count']}\n"
            f"  labs_count: {debug_info['labs_count']}\n"
            f"  missing_critical: {debug_info['missing_critical']}\n"
            f"  probability: {probability:.4f}\n"
            f"  decision: {result['decision']}"
        )
        
        # Build response with debug info
        response = {
            "patient_id": request.patient_id,
            "timestamp": datetime.now().isoformat(),
            "probability": result["probability"],
            "threshold": result["threshold"],
            "decision": result["decision"],
            "explanation": result["explanation"],
            "feature_summary": feature_summary,
            "safety_note": (
                "This is a decision support tool only. "
                "Clinical judgment should always take precedence. "
                "If clinically concerned, proceed with imaging regardless of model output."
            ),
            "debug": debug_info
        }
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        # Structured error logging
        logger.error(
            f"=== ASSESSMENT FAILED ===\n"
            f"  patient_id: {request.patient_id}\n"
            f"  error: {str(e)}\n"
            f"  traceback: {traceback.format_exc()}"
        )
        debug_info["warnings"].append(f"Assessment failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Assessment failed: {str(e)}"
        )


# ============================================================================
# FHIR Sandbox Testing Endpoints (Read-Only)
# ============================================================================

SESSION_COOKIE_NAME = "pe_session_id"


def set_session_cookie(response, session_id: str):
    """
    Set session cookie with EXACT attributes that work (matching /api/debug/set-cookie).
    
    CRITICAL: These exact settings work - verified with /api/debug/set-cookie:
    - path="/"
    - httponly=True  
    - samesite="lax"
    - secure=False (http://localhost)
    - NO domain (let browser handle localhost)
    """
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
    )
    logger.info(f"Set cookie: {SESSION_COOKIE_NAME}={session_id[:20] if len(session_id) > 20 else session_id}... (path=/ httponly=True samesite=lax secure=False)")
    return response


def get_cookie_debug_info(request: Request) -> Dict[str, Any]:
    """
    Build debug info about cookies for diagnosing session issues.
    """
    cookie_value = request.cookies.get(SESSION_COOKIE_NAME)
    return {
        "has_pe_session_id": bool(cookie_value),
        "pe_session_id_value_prefix": cookie_value[:20] + "..." if cookie_value and len(cookie_value) > 20 else cookie_value,
        "host": request.headers.get("host"),
        "origin": request.headers.get("origin"),
        "cookie_header_present": bool(request.headers.get("cookie")),
        "all_cookies": list(request.cookies.keys()) if request.cookies else []
    }


async def get_active_session(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency to get the active session from the request.
    
    Checks multiple sources in order:
    1. pe_session_id cookie (primary)
    2. session_id query parameter (backward compatibility)
    3. Authorization header (Bearer token matching session ID)
    
    Returns the session dict if valid.
    Raises HTTPException 401 if no valid session found.
    """
    # Check cookie first (primary method)
    effective_session_id = request.cookies.get(SESSION_COOKIE_NAME)
    
    # Fallback to query param (backward compatibility)
    if not effective_session_id:
        effective_session_id = request.query_params.get("session_id")
    
    # Fallback to Authorization header
    if not effective_session_id:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            effective_session_id = auth_header[7:]
    
    if not effective_session_id or effective_session_id not in sessions:
        debug_info = get_cookie_debug_info(request)
        raise HTTPException(
            status_code=401,
            detail={
                "message": "Not authenticated. Please connect to Epic.",
                "cookie_debug": debug_info
            }
        )
    
    session = sessions[effective_session_id]
    if datetime.now().timestamp() > session["expires_at"]:
        debug_info = get_cookie_debug_info(request)
        raise HTTPException(
            status_code=401, 
            detail={
                "message": "Session expired. Please reconnect to Epic.",
                "cookie_debug": debug_info
            }
        )
    
    # Store effective session ID in session for reference
    session["_session_id"] = effective_session_id
    return session


def get_session_from_request(request: Request, session_id: Optional[str] = None) -> tuple[Dict[str, Any], str]:
    """
    Legacy helper - prefer using get_active_session dependency.
    
    Get session from request, checking multiple sources in order:
    1. session_id parameter (if provided) - backward compatibility
    2. pe_session_id cookie
    3. Authorization header (Bearer token matching session ID)
    
    Returns (session_dict, session_id) tuple.
    """
    effective_session_id = session_id
    
    # Check query param first (backward compatibility)
    if not effective_session_id:
        # Check cookie
        effective_session_id = request.cookies.get(SESSION_COOKIE_NAME)
    
    if not effective_session_id:
        # Check Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            effective_session_id = auth_header[7:]
    
    if not effective_session_id or effective_session_id not in sessions:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Please connect to Epic."
        )
    
    session = sessions[effective_session_id]
    if datetime.now().timestamp() > session["expires_at"]:
        raise HTTPException(status_code=401, detail="Session expired. Please reconnect to Epic.")
    
    return session, effective_session_id


def get_session_or_error(session_id: Optional[str]) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.
    Prefer get_active_session dependency for new code.
    """
    if not session_id or session_id not in sessions:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Please connect to Epic."
        )
    session = sessions[session_id]
    if datetime.now().timestamp() > session["expires_at"]:
        raise HTTPException(status_code=401, detail="Session expired. Please reconnect to Epic.")
    return session


@app.get("/api/fhir/patients")
async def list_patients(
    count: int = 20,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    List patients from FHIR sandbox for testing.
    
    Returns simplified patient list: [{id, name, birthDate, gender}]
    Session is read from cookie automatically.
    
    NOTE: This is for SANDBOX TESTING ONLY. Read-only.
    """
    effective_session_id = session.get("_session_id", "unknown")
    logger.info(f"Listing patients (count={count}) for session {effective_session_id[:20]}...")
    
    try:
        import httpx
        
        url = f"{session['fhir_base']}/Patient"
        params = {"_count": min(count, 50)}  # Cap at 50 for safety
        headers = {
            "Authorization": f"Bearer {session['access_token']}",
            "Accept": "application/fhir+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=15.0)
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Token expired or invalid. Please re-authenticate.")
            if response.status_code == 403:
                raise HTTPException(status_code=403, detail="Forbidden: token lacks required scope. Check granted scopes in /api/auth/last-token.")
            
            response.raise_for_status()
            bundle = response.json()
        
        # Extract and simplify patient data
        patients = []
        if bundle.get("entry"):
            for entry in bundle["entry"]:
                resource = entry.get("resource", {})
                if resource.get("resourceType") == "Patient":
                    # Extract name
                    name = "Unknown"
                    if resource.get("name"):
                        name_obj = resource["name"][0]
                        given = " ".join(name_obj.get("given", []))
                        family = name_obj.get("family", "")
                        name = f"{given} {family}".strip() or "Unknown"
                    
                    patients.append({
                        "id": resource.get("id"),
                        "name": name,
                        "birthDate": resource.get("birthDate"),
                        "gender": resource.get("gender")
                    })
        
        logger.info(f"Found {len(patients)} patients")
        return {
            "patients": patients,
            "count": len(patients),
            "fhir_url": url  # For debug visibility (no token)
        }
        
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        logger.error(f"FHIR patient list failed: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=f"FHIR error: {str(e)}")
    except Exception as e:
        logger.error(f"Patient list failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list patients: {str(e)}")


@app.get("/api/fhir/patient-samples")
async def get_patient_samples(
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get sample patient IDs for clinician workflow testing.
    
    Attempts to query /Patient?_count=10. If Epic blocks patient search,
    returns an empty list with a helpful message.
    Session is read from cookie automatically.
    
    NOTE: This is for SANDBOX TESTING ONLY.
    """
    logger.info("Fetching patient samples for clinician workflow")
    
    result = {
        "samples": [],
        "message": None,
        "search_blocked": False
    }
    
    try:
        import httpx
        url = f"{session['fhir_base']}/Patient"
        params = {"_count": 10}
        headers = {
            "Authorization": f"Bearer {session['access_token']}",
            "Accept": "application/fhir+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            
            if response.status_code == 403:
                logger.warning("Patient search blocked by Epic (403 Forbidden)")
                result["search_blocked"] = True
                result["message"] = "Epic sandbox may block patient search. Use a known test Patient ID (e.g., erXuFYUfucBZaryVksYEcMg3)."
                return result
            
            if response.status_code == 401:
                raise HTTPException(status_code=401, detail="Token expired. Please re-authenticate.")
            
            response.raise_for_status()
            bundle = response.json()
        
        # Extract patient samples
        if bundle.get("entry"):
            for entry in bundle["entry"]:
                resource = entry.get("resource", {})
                if resource.get("resourceType") == "Patient":
                    # Extract name
                    name = "Unknown"
                    if resource.get("name"):
                        name_obj = resource["name"][0]
                        given = " ".join(name_obj.get("given", []))
                        family = name_obj.get("family", "")
                        name = f"{given} {family}".strip() or "Unknown"
                    
                    result["samples"].append({
                        "id": resource.get("id"),
                        "name": name,
                        "gender": resource.get("gender"),
                        "birthDate": resource.get("birthDate")
                    })
        
        if not result["samples"]:
            result["message"] = "No patients returned from search. Use a known test Patient ID."
        else:
            result["message"] = f"Found {len(result['samples'])} sample patients."
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Patient samples fetch failed: {e}")
        result["search_blocked"] = True
        result["message"] = f"Patient search failed: {str(e)}. Use a known test Patient ID."
        return result


@app.get("/api/fhir/patient/{patient_id}")
async def get_patient(
    patient_id: str,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get a specific patient from FHIR sandbox.
    Session is read from cookie automatically.
    
    NOTE: This is for SANDBOX TESTING ONLY. Read-only.
    """
    logger.info(f"Fetching patient {patient_id}")
    
    try:
        fhir_client = FHIRClient(
            base_url=session["fhir_base"],
            access_token=session["access_token"]
        )
        
        patient = await fhir_client.get_patient(patient_id)
        
        # Simplify for frontend
        name = "Unknown"
        if patient.get("name"):
            name_obj = patient["name"][0]
            given = " ".join(name_obj.get("given", []))
            family = name_obj.get("family", "")
            name = f"{given} {family}".strip() or "Unknown"
        
        return {
            "id": patient.get("id"),
            "name": name,
            "birthDate": patient.get("birthDate"),
            "gender": patient.get("gender"),
            "fhir_url": f"{session['fhir_base']}/Patient/{patient_id}"
        }
        
    except Exception as e:
        logger.error(f"Get patient failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get patient: {str(e)}")


@app.get("/api/fhir/observations")
async def get_observations(
    patient_id: str,
    vitals: bool = True,
    labs: bool = True,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get observations for a patient from FHIR sandbox.
    
    Returns normalized structure: {vitals: [...], labs: [...], debug: {...}}
    Session is read from cookie automatically.
    
    NOTE: This is for SANDBOX TESTING ONLY. Read-only.
    """
    logger.info(f"Fetching observations for patient {patient_id} (vitals={vitals}, labs={labs})")
    
    fhir_client = FHIRClient(
        base_url=session["fhir_base"],
        access_token=session["access_token"]
    )
    
    result = {
        "vitals": [],
        "labs": [],
        "debug": {
            "patient_id": patient_id,
            "fhir_calls": [],
            "warnings": []
        }
    }
    
    # Add scope info for debugging
    result["debug"]["requested_scope"] = epic_config.scope
    result["debug"]["granted_scope"] = session.get("granted_scope", "(unknown)")
    
    try:
        if vitals:
            vital_url = f"{session['fhir_base']}/Observation?patient={patient_id}&category=vital-signs&_count=100&_sort=-date"
            try:
                vital_obs = await fhir_client.get_observations(patient_id, category="vital-signs", max_results=100)
                result["vitals"] = _normalize_observations(vital_obs, "vital-signs")
                result["debug"]["fhir_calls"].append(vital_url)
                if not vital_obs:
                    result["debug"]["warnings"].append("No vital-signs returned for this patient")
            except FHIRScopeError as e:
                logger.warning(f"Vitals fetch failed (403): {e.message}")
                result["debug"]["warnings"].append(f"403 Forbidden: {e.message}")
                result["debug"]["fhir_calls"].append(f"{vital_url} → 403 FORBIDDEN")
                result["debug"]["scope_error"] = {
                    "failed_url": e.failed_url,
                    "message": e.message,
                    "response_body": e.response_body[:200] if e.response_body else None
                }
            except Exception as e:
                logger.warning(f"Vitals fetch failed: {e}")
                result["debug"]["warnings"].append(f"Vitals fetch failed: {str(e)}")
                result["debug"]["fhir_calls"].append(f"{vital_url} → ERROR")
        
        if labs:
            lab_url = f"{session['fhir_base']}/Observation?patient={patient_id}&category=laboratory&_count=100&_sort=-date"
            try:
                lab_obs = await fhir_client.get_observations(patient_id, category="laboratory", max_results=100)
                result["labs"] = _normalize_observations(lab_obs, "laboratory")
                result["debug"]["fhir_calls"].append(lab_url)
                if not lab_obs:
                    result["debug"]["warnings"].append("No laboratory results returned for this patient")
            except FHIRScopeError as e:
                logger.warning(f"Labs fetch failed (403): {e.message}")
                result["debug"]["warnings"].append(f"403 Forbidden: {e.message}")
                result["debug"]["fhir_calls"].append(f"{lab_url} → 403 FORBIDDEN")
                result["debug"]["scope_error"] = {
                    "failed_url": e.failed_url,
                    "message": e.message,
                    "response_body": e.response_body[:200] if e.response_body else None
                }
            except Exception as e:
                logger.warning(f"Labs fetch failed: {e}")
                result["debug"]["warnings"].append(f"Labs fetch failed: {str(e)}")
                result["debug"]["fhir_calls"].append(f"{lab_url} → ERROR")
        
        logger.info(f"Fetched {len(result['vitals'])} vitals, {len(result['labs'])} labs")
        return result
        
    except FHIRScopeError as e:
        logger.error(f"Observations fetch failed with 403: {e.message}")
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "Forbidden: token lacks required scope",
                "message": e.message,
                "failed_url": e.failed_url,
                "requested_scope": epic_config.scope,
                "granted_scope": session.get("granted_scope", "(unknown)"),
                "check": "GET /api/auth/last-token for scope details"
            }
        )
    except Exception as e:
        logger.error(f"Observations fetch failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch observations: {str(e)}")


def _normalize_observations(observations: List[Dict], category: str) -> List[Dict]:
    """Normalize FHIR observations for frontend display."""
    normalized = []
    for obs in observations:
        try:
            # Extract code/display
            code_info = obs.get("code", {})
            codings = code_info.get("coding", [])
            loinc_code = None
            display_name = code_info.get("text", "Unknown")
            
            for coding in codings:
                if coding.get("system") == "http://loinc.org":
                    loinc_code = coding.get("code")
                    display_name = coding.get("display", display_name)
                    break
            
            # Extract value
            value = None
            unit = ""
            if "valueQuantity" in obs:
                value = obs["valueQuantity"].get("value")
                unit = obs["valueQuantity"].get("unit", "")
            elif "valueString" in obs:
                value = obs["valueString"]
            
            # Extract date
            effective_date = obs.get("effectiveDateTime", obs.get("issued"))
            
            normalized.append({
                "code": loinc_code,
                "display": display_name,
                "value": value,
                "unit": unit,
                "date": effective_date,
                "category": category
            })
        except Exception as e:
            logger.warning(f"Failed to normalize observation: {e}")
            continue
    
    return normalized


# ============================================================================
# Health Check
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": True,  # Would check actual model state
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/session/info")
async def get_session_info(session_id: str):
    """Get session info for debugging (no sensitive data)."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    expires_at = datetime.fromtimestamp(session["expires_at"])
    is_expired = datetime.now().timestamp() > session["expires_at"]
    
    return {
        "session_id": session_id[:20] + "...",
        "patient": session.get("patient"),
        "fhir_base": session.get("fhir_base"),
        "expires_at": expires_at.isoformat(),
        "is_expired": is_expired,
        "time_remaining_seconds": max(0, session["expires_at"] - datetime.now().timestamp())
    }


# ============================================================================
# Auth Status Endpoint (for auto-launch)
# ============================================================================

@app.get("/api/auth/status")
async def get_auth_status(request: Request, session_id: Optional[str] = None):
    """
    Check authentication status for the given session.
    
    Used by frontend to determine if SMART auth is needed.
    Session is read from cookie or query param (backward compatibility).
    
    Returns:
    - authenticated: true if valid, non-expired session exists
    - expiresAt: ISO timestamp when token expires
    - patient: patient ID from auth context
    - sandboxMode: whether backend is in sandbox mode
    """
    # Try to get session from multiple sources
    effective_session_id = session_id or request.cookies.get(SESSION_COOKIE_NAME)
    
    # Check if session exists and is valid
    if not effective_session_id or effective_session_id not in sessions:
        return {
            "authenticated": False,
            "expiresAt": None,
            "patient": None,
            "fhirBase": None,
            "sandboxMode": SANDBOX_MODE,
            "timeRemaining": 0,
            "sessionSource": "none"
        }
    
    session = sessions[effective_session_id]
    now = datetime.now().timestamp()
    is_expired = now > session["expires_at"]
    time_remaining = max(0, session["expires_at"] - now)
    
    if is_expired:
        return {
            "authenticated": False,
            "expiresAt": datetime.fromtimestamp(session["expires_at"]).isoformat(),
            "patient": session.get("patient"),
            "fhirBase": session.get("fhir_base"),
            "sandboxMode": SANDBOX_MODE,
            "timeRemaining": 0,
            "reason": "token_expired"
        }
    
    return {
        "authenticated": True,
        "expiresAt": datetime.fromtimestamp(session["expires_at"]).isoformat(),
        "patient": session.get("patient"),
        "fhirBase": session.get("fhir_base"),
        "sandboxMode": SANDBOX_MODE,
        "timeRemaining": int(time_remaining)
    }


@app.get("/api/auth/token-debug")
async def get_token_debug(request: Request, session_id: Optional[str] = None):
    """
    DEV ONLY: Get detailed token debug information.
    
    Shows what scopes were actually granted by Epic, patient/encounter context,
    fhirUser, and decoded JWT claims if available.
    Session is read from cookie or query param (backward compatibility).
    
    Used to confirm whether Epic is granting the FHIR scopes we need.
    """
    # Try to get session from multiple sources
    effective_session_id = session_id or request.cookies.get(SESSION_COOKIE_NAME)
    
    if not effective_session_id or effective_session_id not in sessions:
        return {
            "error": "No valid session",
            "hasSession": False,
            "session_id_provided": bool(session_id),
            "cookie_present": bool(request.cookies.get(SESSION_COOKIE_NAME))
        }
    
    session = sessions[effective_session_id]
    
    # Redact the actual access token
    access_token = session.get("access_token", "")
    token_preview = access_token[:20] + "..." if len(access_token) > 20 else "(empty)"
    
    return {
        "hasSession": True,
        "tokenPreview": token_preview,
        "grantedScope": session.get("granted_scope", "(not in response)"),
        "scopeAnalysis": session.get("scope_analysis", {}),
        "patientContext": session.get("patient"),
        "encounterContext": session.get("encounter"),
        "fhirUser": session.get("fhir_user"),
        "jwtClaims": session.get("jwt_claims"),
        "fhirBase": session.get("fhir_base"),
        "expiresAt": datetime.fromtimestamp(session.get("expires_at", 0)).isoformat() if session.get("expires_at") else None
    }


@app.get("/api/auth/last-token")
async def get_last_token_exchange():
    """
    DEV ONLY: Get the result of the last token exchange attempt.
    
    Returns status code, scope, and any error from the most recent
    POST to Epic's token endpoint. Useful for debugging OAuth failures.
    """
    granted_scope = last_token_exchange.get("scope") or ""
    requested_scope = epic_config.scope
    
    # Analyze scope differences
    granted_parts = set(granted_scope.split()) if granted_scope else set()
    requested_parts = set(requested_scope.split())
    missing_scopes = list(requested_parts - granted_parts)
    
    return {
        "last_token_status": last_token_exchange.get("status_code"),
        "requested_scope": requested_scope,
        "granted_scope": granted_scope,
        "missing_scopes": missing_scopes,
        "has_patient_read": "user/Patient.read" in granted_parts or "patient/Patient.read" in granted_parts,
        "has_observation_read": "user/Observation.read" in granted_parts or "patient/Observation.read" in granted_parts,
        "last_token_error": last_token_exchange.get("error"),
        "last_token_error_description": last_token_exchange.get("error_description"),
        "timestamp": last_token_exchange.get("timestamp"),
        "raw_body_preview": last_token_exchange.get("raw_body_preview")
    }


@app.get("/api/auth/progress")
async def get_auth_progress():
    """
    Get current auth-in-progress status.
    
    Returns:
    - auth_in_progress: whether auth is currently in progress
    - auth_started_at: timestamp when auth started (ISO format)
    - age_seconds: how long ago auth started (for detecting stale auth)
    
    Useful for debugging "auth already in progress" issues.
    """
    in_progress = auth_progress["in_progress"]
    started_at = auth_progress["started_at"]
    
    age_seconds = None
    started_at_iso = None
    
    if started_at:
        age_seconds = int(datetime.now().timestamp() - started_at)
        started_at_iso = datetime.fromtimestamp(started_at).isoformat()
    
    return {
        "auth_in_progress": in_progress,
        "auth_started_at": started_at_iso,
        "age_seconds": age_seconds,
        "state": auth_progress["state"][:20] + "..." if auth_progress["state"] else None,
        "stale": age_seconds is not None and age_seconds > 180
    }


@app.post("/api/auth/reset")
async def reset_auth():
    """
    Reset authentication state.
    
    Clears auth_in_progress, stored state, and any pending tokens.
    Use this when Epic shows "another process already logged in" errors.
    """
    logger.info("Auth reset requested")
    
    # Clear auth in progress
    auth_progress["in_progress"] = False
    auth_progress["state"] = None
    auth_progress["started_at"] = None
    
    # Clear last token exchange info
    last_token_exchange["status_code"] = None
    last_token_exchange["scope"] = None
    last_token_exchange["error"] = None
    last_token_exchange["error_description"] = None
    last_token_exchange["timestamp"] = None
    last_token_exchange["raw_body_preview"] = None
    
    logger.info("Auth state cleared")
    
    return {"ok": True, "message": "Authentication state cleared"}


@app.get("/api/auth/sandbox-config")
async def get_sandbox_config():
    """
    Get sandbox configuration for frontend auto-launch.
    
    Returns launch URL and mode info without sensitive data.
    """
    return {
        "sandboxMode": SANDBOX_MODE,
        "launchUrl": "/launch?iss=" + epic_config.fhir_base_url,
        "fhirBaseUrl": epic_config.fhir_base_url
    }


@app.get("/api/debug/set-cookie")
async def debug_set_cookie():
    """
    TEMPORARY: Test endpoint to verify cookie setting works.
    Sets a test cookie with same attributes as OAuth callback.
    """
    response = JSONResponse(content={"ok": True, "message": "Cookie set: pe_session_id=debug_cookie_test"})
    logger.info("SETTING COOKIE pe_session_id=debug_cookie_test samesite=lax secure=false")
    response.set_cookie(
        key="pe_session_id",
        value="debug_cookie_test",
        path="/",
        httponly=True,
        samesite="lax",
        secure=False
    )
    return response


@app.get("/api/debug/clear-cookie")
async def debug_clear_cookie():
    """
    TEMPORARY: Clear pe_session_id cookie for clean retesting.
    """
    response = JSONResponse(content={"ok": True, "message": "Cookie cleared: pe_session_id"})
    response.delete_cookie(key="pe_session_id", path="/")
    logger.info("CLEARED COOKIE pe_session_id")
    return response


# ============================================================================
# Clinical History & Risk API Endpoints
# ============================================================================

from integration.clinical_api import (
    get_anticoagulation_status,
    get_inr_trend,
    get_diagnoses,
    get_vitals_trend,
    get_ddimer_trend,
    get_imaging_studies,
    get_clinical_summary
)

DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"


@app.get("/api/clinical/anticoagulation")
async def api_anticoagulation(
    patient_id: str,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get anticoagulation status and medication list.
    
    Returns:
    - status: none | on_anticoagulant | unknown
    - medications: list of anticoag/antiplatelet meds
    - has_warfarin: bool
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_anticoagulation_status(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/inr")
async def api_inr(
    patient_id: str,
    days: int = 30,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get INR time series for the last N days.
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_inr_trend(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        days=days,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/diagnoses")
async def api_diagnoses(
    patient_id: str,
    years: int = 5,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get diagnosis flags and top conditions.
    
    Returns:
    - flags: {asthma, anxiety, copd, chf, pneumonia} booleans
    - top_conditions: recent conditions list
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_diagnoses(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        years=years,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/vitals")
async def api_vitals(
    patient_id: str,
    hours: int = 24,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get vital signs time series.
    
    Returns:
    - series: {hr, spo2, rr, sbp} arrays
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_vitals_trend(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        hours=hours,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/ddimer")
async def api_ddimer(
    patient_id: str,
    days: int = 30,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get D-dimer time series.
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_ddimer_trend(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        days=days,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/imaging")
async def api_imaging(
    patient_id: str,
    years: int = 5,
    type: str = "ctpa",
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get PE-relevant imaging studies.
    
    type: ctpa | vq | all
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_imaging_studies(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        years=years,
        study_type=type,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/summary")
async def api_clinical_summary(
    patient_id: str,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get clinical summary for Essentials tab.
    
    Aggregates anticoagulation + diagnoses + vitals availability.
    """
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    return await get_clinical_summary(
        fhir_base=session["fhir_base"],
        access_token=session["access_token"],
        patient_id=patient_id,
        debug=DEBUG_MODE
    )


@app.get("/api/clinical/data-availability")
async def api_data_availability(
    patient_id: str,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get data availability summary for a patient.
    
    Returns:
    - availability: complete | partial | sparse
    - present: which data types are available
    - missing: list of missing data types
    """
    if not validate_patient_id(patient_id):
        logger.warning(f"Invalid patient_id in data-availability: {repr(patient_id)}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_patient_id",
                "message": "patient_id is required"
            }
        )
    
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    # Check what data is available using quick queries
    present = {
        "vitals": False,
        "ddimer": False,
        "imaging": False,
        "meds": False,
        "conditions": False
    }
    missing = []
    
    try:
        # Try to get summary (uses cache if available)
        summary = await get_clinical_summary(
            fhir_base=session["fhir_base"],
            access_token=session["access_token"],
            patient_id=patient_id,
            debug=False
        )
        
        # Check vitals
        vitals_avail = summary.get("vitals_available", {})
        present["vitals"] = any(vitals_avail.values())
        if not present["vitals"]:
            missing.append("vitals")
        
        # Check anticoag/meds
        anticoag = summary.get("anticoagulation", {})
        present["meds"] = len(anticoag.get("active_meds", [])) > 0 or anticoag.get("status") != "unknown"
        if not present["meds"]:
            missing.append("medications")
        
        # Check conditions
        flags = summary.get("diagnosis_flags", {})
        present["conditions"] = any(flags.values())
        if not present["conditions"]:
            missing.append("conditions")
        
        # Quick check for d-dimer (use cached if available)
        try:
            ddimer_result = await get_ddimer_trend(
                fhir_base=session["fhir_base"],
                access_token=session["access_token"],
                patient_id=patient_id,
                days=30,
                debug=False
            )
            present["ddimer"] = len(ddimer_result.get("series", [])) > 0
        except:
            pass
        if not present["ddimer"]:
            missing.append("d-dimer")
        
        # Quick check for imaging (use cached if available)
        try:
            imaging_result = await get_imaging_studies(
                fhir_base=session["fhir_base"],
                access_token=session["access_token"],
                patient_id=patient_id,
                years=5,
                study_type="all",
                debug=False
            )
            present["imaging"] = len(imaging_result.get("studies", [])) > 0
        except:
            pass
        if not present["imaging"]:
            missing.append("imaging")
        
    except Exception as e:
        logger.error(f"Error checking data availability: {e}")
        missing = ["vitals", "d-dimer", "medications", "conditions", "imaging"]
    
    # Compute overall availability
    present_count = sum(1 for v in present.values() if v)
    if present_count >= 4:
        availability = "complete"
    elif present_count >= 2:
        availability = "partial"
    elif present_count >= 1:
        availability = "sparse"
    else:
        availability = "sparse"
    
    return {
        "availability": availability,
        "present": present,
        "missing": missing
    }


def validate_patient_id(patient_id: str) -> bool:
    """
    Validate patient_id is usable - rejects None, 'None', 'null', empty, etc.
    """
    if not patient_id:
        return False
    
    trimmed = patient_id.strip()
    
    if not trimmed:
        return False
    
    # Reject Python None or JavaScript null/undefined as strings
    invalid_values = ['none', 'null', 'undefined', '']
    if trimmed.lower() in invalid_values:
        return False
    
    return True


@app.get("/api/clinical/frontpage")
async def api_clinical_frontpage(
    patient_id: str,
    session: Dict[str, Any] = Depends(get_active_session)
):
    """
    Get stable frontpage data for a patient.
    
    Returns 400 for invalid patient_id.
    Returns 200 with consistent schema for valid patient_id (even if data missing).
    """
    if not validate_patient_id(patient_id):
        logger.warning(f"Invalid patient_id received: {repr(patient_id)}")
        raise HTTPException(
            status_code=400, 
            detail={
                "error": "missing_patient_id",
                "message": "patient_id is required and must be a valid identifier",
                "received": patient_id
            }
        )
    
    # Initialize response with safe defaults matching frontend expectations
    response = {
        "data_source": "EPIC",
        "patient": {
            "id": patient_id,
            "name": None
        },
        # Flat vitals_latest for Layer 1 snapshot - frontend expects this shape
        "vitals_latest": {
            "hr": None,
            "spo2": None,
            "rr": None,
            "sbp": None,
            "timestamp": None
        },
        # Include full vitals series so frontend strip and chart use same data
        "vitals_series": {
            "hr": [],
            "spo2": [],
            "rr": [],
            "sbp": []
        },
        # Labs latest for D-dimer
        "labs_latest": {
            "ddimer": None,
            "ddimer_units": None,
            "timestamp": None
        },
        # Also keep old format for backward compatibility
        "ddimer_latest": {"value": None, "ts": None, "unit": None},
        # History flags - frontend expects this shape
        "history_flags": {
            "prior_pe": False,
            "prior_dvt_vte": False,
            "active_cancer": False,
            "recent_surgery": False,
            "immobilization": False,
            "thrombophilia": False,
            "pregnancy_estrogen": False
        },
        # Also keep old format for backward compatibility
        "prior_risk_flags": {
            "prior_pe": False,
            "prior_dvt": False,
            "active_malignancy": False,
            "recent_surgery": False,
            "pregnancy": False,
            "thrombophilia": False
        },
        # List of factors we checked
        "history_checked": [
            "Prior PE", "Prior DVT/VTE", "Active cancer",
            "Recent surgery", "Immobilization", "Thrombophilia", "Pregnancy/estrogen"
        ],
        "top_conditions": [],
        "missingness": {
            "vitals_missing": True,
            "ddimer_missing": True,
            "history_missing": True,
            "notes": []
        },
        "availability": {
            "level": "sparse",
            "missing": [],
            "present": {
                "vitals": False,
                "ddimer": False,
                "imaging": False,
                "meds": False,
                "conditions": False
            }
        }
    }
    
    fhir_base = session["fhir_base"]
    access_token = session["access_token"]
    
    # Try to get patient info
    try:
        patient_data = await get_patient(fhir_base, access_token, patient_id)
        if patient_data:
            names = patient_data.get("name", [])
            if names and len(names) > 0:
                name = names[0]
                given = " ".join(name.get("given", []))
                family = name.get("family", "")
                response["patient"]["name"] = f"{given} {family}".strip() or None
    except Exception as e:
        logger.warning(f"Failed to get patient info: {e}")
    
    # Try to get clinical summary (uses cache)
    try:
        summary = await get_clinical_summary(
            fhir_base=fhir_base,
            access_token=access_token,
            patient_id=patient_id,
            debug=False
        )
        
        # Extract diagnosis flags - populate both formats
        flags = summary.get("diagnosis_flags", {})
        prior_pe = flags.get("prior_pe_dvt", False) or flags.get("prior_pe", False)
        prior_dvt = flags.get("prior_pe_dvt", False) or flags.get("prior_dvt", False)
        active_cancer = flags.get("active_malignancy", False) or flags.get("active_cancer", False)
        recent_surgery = flags.get("recent_surgery", False)
        thrombophilia = flags.get("thrombophilia", False)
        pregnancy = flags.get("pregnancy", False) or flags.get("pregnancy_estrogen", False)
        
        # New format for frontend
        response["history_flags"]["prior_pe"] = prior_pe
        response["history_flags"]["prior_dvt_vte"] = prior_dvt
        response["history_flags"]["active_cancer"] = active_cancer
        response["history_flags"]["recent_surgery"] = recent_surgery
        response["history_flags"]["thrombophilia"] = thrombophilia
        response["history_flags"]["pregnancy_estrogen"] = pregnancy
        response["missingness"]["history_missing"] = False
        
        # Old format for backward compatibility
        response["prior_risk_flags"]["prior_pe"] = prior_pe
        response["prior_risk_flags"]["prior_dvt"] = prior_dvt
        response["prior_risk_flags"]["active_malignancy"] = active_cancer
        response["prior_risk_flags"]["recent_surgery"] = recent_surgery
        response["prior_risk_flags"]["thrombophilia"] = thrombophilia
        response["prior_risk_flags"]["pregnancy"] = pregnancy
        
        # Extract conditions
        conditions_list = summary.get("conditions", [])
        for cond in conditions_list[:10]:
            category = "other"
            display = cond.get("display", "")
            code = cond.get("code", "").lower()
            
            # Categorize conditions
            if any(x in code.lower() for x in ["embol", "pe", "dvt", "thrombo"]):
                category = "risk"
            elif any(x in code.lower() for x in ["asthma", "anxiety", "panic", "copd", "heart failure", "chf", "pneumonia"]):
                category = "mimic"
            elif any(x in display.lower() for x in ["asthma", "anxiety", "panic", "copd", "heart failure", "chf", "pneumonia"]):
                category = "mimic"
            elif any(x in display.lower() for x in ["cancer", "malign", "neoplasm", "surgery", "pregnant", "postpartum"]):
                category = "risk"
            
            response["top_conditions"].append({
                "display": display,
                "category": category
            })
        
        # Extract vitals availability
        vitals_avail = summary.get("vitals_available", {})
        response["availability"]["present"]["vitals"] = any(vitals_avail.values())
        response["availability"]["present"]["conditions"] = len(conditions_list) > 0
        
        # Anticoag check
        anticoag = summary.get("anticoagulation", {})
        response["availability"]["present"]["meds"] = anticoag.get("status") != "unknown" or len(anticoag.get("active_meds", [])) > 0
        
    except Exception as e:
        logger.warning(f"Failed to get clinical summary: {e}")
        response["availability"]["missing"].append("conditions")
    
    # Try to get latest vitals - include full series for chart consistency
    try:
        vitals = await get_vitals_trend(
            fhir_base=fhir_base,
            access_token=access_token,
            patient_id=patient_id,
            hours=24,
            debug=False
        )
        
        series = vitals.get("series", {})
        
        # Store full series for frontend chart
        response["vitals_series"] = {
            "hr": series.get("hr", []),
            "spo2": series.get("spo2", []),
            "rr": series.get("rr", []),
            "sbp": series.get("sbp", [])
        }
        
        # Extract latest values from series - flat format for Layer 1 snapshot
        latest_timestamp = None
        for vital_type, data in [
            ("hr", series.get("hr", [])),
            ("spo2", series.get("spo2", [])),
            ("rr", series.get("rr", [])),
            ("sbp", series.get("sbp", []))
        ]:
            if data and len(data) > 0:
                latest = data[0]
                response["vitals_latest"][vital_type] = latest.get("value")
                if latest.get("time") and (not latest_timestamp or latest.get("time") > latest_timestamp):
                    latest_timestamp = latest.get("time")
                response["availability"]["present"]["vitals"] = True
                response["missingness"]["vitals_missing"] = False
        
        response["vitals_latest"]["timestamp"] = latest_timestamp
                
    except Exception as e:
        logger.warning(f"Failed to get vitals: {e}")
        if "vitals" not in response["availability"]["missing"]:
            response["availability"]["missing"].append("vitals")
    
    # Try to get latest D-dimer
    try:
        ddimer = await get_ddimer_trend(
            fhir_base=fhir_base,
            access_token=access_token,
            patient_id=patient_id,
            days=30,
            debug=False
        )
        
        series = ddimer.get("series", [])
        if series and len(series) > 0:
            latest = series[0]
            # New format for frontend
            response["labs_latest"]["ddimer"] = latest.get("value")
            response["labs_latest"]["ddimer_units"] = latest.get("unit", "μg/mL")
            response["labs_latest"]["timestamp"] = latest.get("time")
            # Keep old format for backward compatibility
            response["ddimer_latest"]["value"] = latest.get("value")
            response["ddimer_latest"]["ts"] = latest.get("time")
            response["ddimer_latest"]["unit"] = latest.get("unit", "μg/mL")
            response["missingness"]["ddimer_missing"] = False
            response["availability"]["present"]["ddimer"] = True
    except Exception as e:
        logger.warning(f"Failed to get D-dimer: {e}")
        response["availability"]["missing"].append("d-dimer")
    
    # Compute availability level
    present = response["availability"]["present"]
    present_count = sum(1 for v in present.values() if v)
    
    if not present["vitals"]:
        response["availability"]["missing"].append("vitals")
    if not present["ddimer"]:
        if "d-dimer" not in response["availability"]["missing"]:
            response["availability"]["missing"].append("d-dimer")
    if not present["conditions"]:
        if "conditions" not in response["availability"]["missing"]:
            response["availability"]["missing"].append("conditions")
    if not present["meds"]:
        response["availability"]["missing"].append("medications")
    
    if present_count >= 4:
        response["availability"]["level"] = "complete"
    elif present_count >= 2:
        response["availability"]["level"] = "partial"
    else:
        response["availability"]["level"] = "sparse"
    
    return response


@app.get("/api/debug/cookies")
async def debug_cookies(request: Request):
    """
    Debug endpoint to inspect cookie state.
    
    Returns info about session cookie presence and request headers
    to help diagnose authentication issues.
    """
    return get_cookie_debug_info(request)


@app.get("/api/auth/diagnostics")
async def get_auth_diagnostics(request: Request):
    """
    Get OAuth diagnostic information for debugging Epic auth issues.
    
    Returns all OAuth parameters being used so they can be compared
    against Epic app registration. Also includes active session info if available.
    
    This endpoint does NOT require authentication.
    """
    diagnostics = epic_config.get_diagnostics()
    
    # Add session info
    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    active_sessions = len(sessions)
    session_info = {
        "session_cookie_name": SESSION_COOKIE_NAME,
        "session_cookie_present": bool(session_cookie),
        "session_cookie_value": session_cookie[:20] + "..." if session_cookie else None,
        "session_valid": session_cookie in sessions if session_cookie else False,
        "active_sessions_count": active_sessions
    }
    diagnostics["session_info"] = session_info
    
    # Log when diagnostics are requested
    logger.info("=" * 60)
    logger.info("AUTH DIAGNOSTICS REQUESTED")
    logger.info("=" * 60)
    for key, value in diagnostics.items():
        if key != "session_info":
            logger.info(f"  {key}: {value}")
    logger.info(f"  session: cookie={session_cookie[:20] + '...' if session_cookie else 'none'}, valid={session_info['session_valid']}")
    logger.info("=" * 60)
    
    return diagnostics



# ---------------------------------------------------------------------------
# Docs file editing
# ---------------------------------------------------------------------------

_DOCS_ROOT = Path(__file__).parent.parent / "frontend" / "src"
_EDITABLE_DOCS: Dict[str, Path] = {
    "clinical-thresholds": _DOCS_ROOT / "utils" / "CLINICAL_THRESHOLDS.md",
    "fhir-data": _DOCS_ROOT / "docs" / "fhir-data.md",
}

class DocContent(BaseModel):
    content: str

@app.get("/api/docs/{doc_id}")
async def get_doc(doc_id: str):
    """Return the raw markdown content of an editable doc file."""
    path = _EDITABLE_DOCS.get(doc_id)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Unknown doc: {doc_id}")
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return {"content": path.read_text(encoding="utf-8")}

@app.put("/api/docs/{doc_id}")
async def update_doc(doc_id: str, body: DocContent):
    """Overwrite an editable doc file with new markdown content."""
    path = _EDITABLE_DOCS.get(doc_id)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Unknown doc: {doc_id}")
    path.write_text(body.content, encoding="utf-8")
    return {"ok": True}


# ---------------------------------------------------------------------------
# PRD (structured JSON document)
# ---------------------------------------------------------------------------

_PRD_PATH = _DOCS_ROOT / "docs" / "prd.json"

@app.get("/api/prd")
async def get_prd():
    """Return the PRD JSON document."""
    import json as _json
    if not _PRD_PATH.exists():
        raise HTTPException(status_code=404, detail="PRD file not found on disk")
    return _json.loads(_PRD_PATH.read_text(encoding="utf-8"))

@app.put("/api/prd")
async def update_prd(request: Request):
    """Save the PRD JSON document."""
    import json as _json
    body = await request.json()
    _PRD_PATH.write_text(_json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True}

# ---------------------------------------------------------------------------
# FHIR Data (structured JSON document)
# ---------------------------------------------------------------------------

_FHIR_DATA_PATH = _DOCS_ROOT / "docs" / "fhir-data.json"

@app.get("/api/fhir-data")
async def get_fhir_data():
    """Return the FHIR field reference JSON document."""
    import json as _json
    if not _FHIR_DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="FHIR data file not found on disk")
    return _json.loads(_FHIR_DATA_PATH.read_text(encoding="utf-8"))

@app.put("/api/fhir-data")
async def update_fhir_data(request: Request):
    """Save the FHIR field reference JSON document."""
    import json as _json
    body = await request.json()
    _FHIR_DATA_PATH.write_text(_json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True}

# Clinical Thresholds (structured JSON document)
# ---------------------------------------------------------------------------

_CT_PATH = _DOCS_ROOT / "docs" / "clinical-thresholds.json"

@app.get("/api/clinical-thresholds")
async def get_clinical_thresholds():
    """Return the Clinical Thresholds JSON document."""
    import json as _json
    if not _CT_PATH.exists():
        raise HTTPException(status_code=404, detail="Clinical thresholds file not found on disk")
    return _json.loads(_CT_PATH.read_text(encoding="utf-8"))

_CT_GENERATED_TS = _DOCS_ROOT / "utils" / "clinicalThresholds.generated.ts"

def _generate_ct_ts(data: dict) -> None:
    """Parse clinical-thresholds.json and write clinicalThresholds.generated.ts."""
    import re as _re, datetime as _dt

    def _first_num(s: str) -> float:
        # Prefer number immediately after a comparison operator (< > ≤ ≥)
        m = _re.search(r'[<>≤≥]\s*(\d+\.?\d*)', s)
        if m:
            return float(m.group(1))
        m = _re.search(r'\d+\.?\d*', s)
        return float(m.group()) if m else 0.0

    def _all_nums(s: str) -> list:
        # Extract all numbers that appear after comparison operators
        return [float(x) for x in _re.findall(r'[<>≤≥]\s*(\d+\.?\d*)', s)]

    try:
        # Vitals
        vital_map = {v['vital']: _first_num(v['condition']) for v in data['vitalStability']['vitals']}
        hr_alert   = vital_map.get('HR', 100)
        sbp_alert  = vital_map.get('BP (SBP)', 90)
        spo2_alert = vital_map.get('SPO2', 95)
        rr_alert   = vital_map.get('RR', 20)
        temp_alert = vital_map.get('TEMP', 38)

        # Shock index — extract upper bound of each state
        shock_states = data['hemodynamicStress']['shockStates']
        safe_si    = next(s for s in shock_states if s['status'] == 'Safe')
        caution_si = next(s for s in shock_states if s['status'] == 'Caution')
        si_safe_max    = max(_all_nums(safe_si['condition']))     # "≤ 0.7" → 0.7
        si_caution_max = max(_all_nums(caution_si['condition']))  # "> 0.7 and ≤ 0.9" → 0.9

        # GFR — extract lower bound of Safe/Caution states
        gfr_states  = data['ctpaSafety']['egfr']['badgeStates']
        safe_gfr    = next(s for s in gfr_states if s['badgeLabel'] == 'Safe')
        caution_gfr = next(s for s in gfr_states if s['badgeLabel'] == 'Caution')
        gfr_safe_min    = _first_num(safe_gfr['condition'])    # "≥ 60" → 60
        gfr_caution_min = _first_num(caution_gfr['condition']) # "≥ 30 and < 60" → 30

        # YEARS D-dimer thresholds
        yt = data['years']['thresholds']
        zero_t = next(t for t in yt if t['score'] == '0')
        high_t = next(t for t in yt if t['score'] != '0')
        ddimer_zero = _first_num(zero_t['threshold'])  # "1000 ng/mL" → 1000
        ddimer_high = _first_num(high_t['threshold'])  # "500 ng/mL"  → 500

        now = _dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

        ts = f"""// AUTO-GENERATED — do not edit manually.
// Source: frontend/src/docs/clinical-thresholds.json
// Last synced: {now}
// To update: edit thresholds in the Clinical Thresholds doc tab — changes sync here automatically.

export const CT = {{
  vitals: {{
    /** Alert fires when HR exceeds this value (bpm) */
    HR_ALERT: {hr_alert},
    /** Alert fires when SBP falls below this value (mmHg) */
    SBP_ALERT: {sbp_alert},
    /** Alert fires when SpO2 falls below this value (%) */
    SPO2_ALERT: {spo2_alert},
    /** Alert fires when RR exceeds this value (/min) */
    RR_ALERT: {rr_alert},
    /** Alert fires when temperature exceeds this value (°C) */
    TEMP_ALERT: {temp_alert},
  }},
  shockIndex: {{
    /** Shock index ≤ this value → Safe */
    SAFE_MAX: {si_safe_max},
    /** Shock index ≤ this value → Caution (above SAFE_MAX) */
    CAUTION_MAX: {si_caution_max},
  }},
  gfr: {{
    /** GFR ≥ this value → Safe for contrast */
    SAFE_MIN: {gfr_safe_min},
    /** GFR ≥ this value → Caution (below SAFE_MIN) */
    CAUTION_MIN: {gfr_caution_min},
  }},
  years: {{
    /** D-dimer threshold (ng/mL) when YEARS score = 0 */
    DDIMER_ZERO_SCORE_NGML: {ddimer_zero},
    /** D-dimer threshold (ng/mL) when YEARS score ≥ 1 */
    DDIMER_HIGH_SCORE_NGML: {ddimer_high},
  }},
}} as const;

export type ClinicalThresholds = typeof CT;
"""
        _CT_GENERATED_TS.write_text(ts, encoding="utf-8")
    except Exception as e:
        print(f"[codegen] Failed to generate clinicalThresholds.generated.ts: {e}")


@app.on_event("startup")
async def _startup_generate_ct():
    """Generate clinicalThresholds.generated.ts from JSON on server start."""
    import json as _json
    if _CT_PATH.exists():
        _generate_ct_ts(_json.loads(_CT_PATH.read_text(encoding="utf-8")))


@app.put("/api/clinical-thresholds")
async def update_clinical_thresholds(request: Request):
    """Save the Clinical Thresholds JSON document and regenerate the TS constants file."""
    import json as _json
    body = await request.json()
    _CT_PATH.write_text(_json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
    _generate_ct_ts(body)
    return {"ok": True}


_CDS_PATH = Path(__file__).parent.parent / "frontend" / "src" / "docs" / "cds-card-logic.json"

@app.get("/api/cds-card-logic")
async def get_cds_card_logic():
    """Return the CDS Card Logic JSON document."""
    import json as _json
    if not _CDS_PATH.exists():
        raise HTTPException(status_code=404, detail="CDS card logic file not found on disk")
    return _json.loads(_CDS_PATH.read_text(encoding="utf-8"))

@app.put("/api/cds-card-logic")
async def update_cds_card_logic(request: Request):
    """Save the CDS Card Logic JSON document."""
    import json as _json
    body = await request.json()
    _CDS_PATH.write_text(_json.dumps(body, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True}


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "PE Rule-Out SMART on FHIR Demo",
        "version": "1.0.0",
        "description": "Demonstration integration of PE rule-out model with Epic FHIR sandbox",
        "endpoints": {
            "/launch": "Initiate SMART on FHIR OAuth flow",
            "/callback": "OAuth callback endpoint",
            "/api/pe-assessment": "Run PE assessment (POST)",
            "/health": "Health check",
            "/docs": "API documentation (Swagger UI)"
        },
        "disclaimer": (
            "PROTOTYPE DEMONSTRATION ONLY. "
            "Not FDA approved. "
            "Not for clinical use. "
            "Requires physician oversight."
        )
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

