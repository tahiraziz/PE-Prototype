"""
Centralized configuration for Epic SMART on FHIR integration.

This module handles environment-based client ID selection and validates
that required configuration is present.
"""

import os
import logging

logger = logging.getLogger(__name__)


class EpicConfig:
    """
    Epic FHIR configuration with environment-based client ID selection.
    
    Usage:
        from config import epic_config
        client_id = epic_config.client_id
    """
    
    # Client IDs for different environments
    CLIENT_ID_SANDBOX = "3030ba26-36d2-4af2-866c-ce0101280315"
    CLIENT_ID_PROD = "8eb380b5-deda-47aa-8f8b-6aac19d1b705"
    
    # OAuth scopes - controlled by EPIC_SCOPE_MODE env var
    # "patient" mode: for sandbox testing with patient context (includes launch/patient for patient picker)
    # "user" mode: for clinician context (NO launch/patient - clinician selects patient manually)
    OAUTH_SCOPE_PATIENT = "openid fhirUser patient/Patient.read patient/Observation.read launch/patient"
    OAUTH_SCOPE_USER = "openid fhirUser user/Patient.read user/Observation.read"
    
    def __init__(self):
        self._load_config()
    
    def _load_config(self):
        """Load configuration from environment variables."""
        # Determine environment: sandbox or prod
        # Check EPIC_ENV first, then fall back to SANDBOX_MODE for backwards compatibility
        epic_env = os.getenv("EPIC_ENV", "").lower()
        sandbox_mode = os.getenv("SANDBOX_MODE", "").lower() == "true"
        
        if epic_env == "prod":
            self.env = "prod"
            self.is_sandbox = False
        elif epic_env == "sandbox":
            self.env = "sandbox"
            self.is_sandbox = True
        elif sandbox_mode:
            # Backwards compatibility: SANDBOX_MODE=true means sandbox
            self.env = "sandbox"
            self.is_sandbox = True
        else:
            # Default to sandbox for safety
            self.env = "sandbox"
            self.is_sandbox = True
        
        # Select client ID based on environment
        # Allow override via EPIC_CLIENT_ID for backwards compatibility
        env_client_id = os.getenv("EPIC_CLIENT_ID")
        
        if env_client_id and env_client_id != "your_client_id_from_epic_here":
            # Use explicitly provided client ID (backwards compatible)
            self.client_id = env_client_id
            self._client_id_source = "EPIC_CLIENT_ID env var"
        elif self.is_sandbox:
            # Use sandbox client ID (can be overridden via env)
            self.client_id = os.getenv("EPIC_CLIENT_ID_SANDBOX", self.CLIENT_ID_SANDBOX)
            self._client_id_source = "sandbox (EPIC_CLIENT_ID_SANDBOX)"
        else:
            # Use production client ID (can be overridden via env)
            self.client_id = os.getenv("EPIC_CLIENT_ID_PROD", self.CLIENT_ID_PROD)
            self._client_id_source = "production (EPIC_CLIENT_ID_PROD)"
        
        # Other Epic OAuth config
        self.redirect_uri = os.getenv("EPIC_REDIRECT_URI", "http://localhost:8000/callback")
        self.auth_url = os.getenv("EPIC_AUTH_URL", "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize")
        self.token_url = os.getenv("EPIC_TOKEN_URL", "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token")
        self.fhir_base_url = os.getenv("FHIR_BASE_URL", "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4")
        self.client_secret = os.getenv("EPIC_CLIENT_SECRET", "")
        
        # Frontend URL for redirects after OAuth
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Scope mode: "patient" or "user"
        # Default to "user" for clinician workflow (avoids 403 on Patient.read)
        self.scope_mode = os.getenv("EPIC_SCOPE_MODE", "user").lower()
        if self.scope_mode not in ("patient", "user"):
            logger.warning(f"Invalid EPIC_SCOPE_MODE '{self.scope_mode}', defaulting to 'user'")
            self.scope_mode = "user"
        
        # Select scope based on mode
        if self.scope_mode == "user":
            self._scope = self.OAUTH_SCOPE_USER
        else:
            self._scope = self.OAUTH_SCOPE_PATIENT
    
    def validate(self) -> bool:
        """
        Validate that required configuration is present and URLs are correct.
        
        Returns:
            True if valid, raises ValueError if not.
        """
        if not self.client_id:
            raise ValueError(
                "Epic Client ID not configured. "
                "Set EPIC_ENV=sandbox or EPIC_ENV=prod, "
                "or provide EPIC_CLIENT_ID directly."
            )
        
        if not self.auth_url:
            raise ValueError("EPIC_AUTH_URL must be configured")
        
        if not self.token_url:
            raise ValueError("EPIC_TOKEN_URL must be configured")
        
        # Validate URLs are NOT MyChart URLs (common mistake)
        for name, url in [("auth_url", self.auth_url), ("token_url", self.token_url), ("fhir_base_url", self.fhir_base_url)]:
            if "mychart" in url.lower():
                raise ValueError(
                    f"{name} contains 'mychart' which is incorrect for SMART on FHIR. "
                    f"Current value: {url}. "
                    f"Use the FHIR server URLs (e.g., fhir.epic.com/interconnect-fhir-oauth/...)"
                )
        
        # Validate auth_url ends with /authorize
        if not self.auth_url.endswith("/authorize"):
            logger.warning(f"EPIC_AUTH_URL should end with /oauth2/authorize. Current: {self.auth_url}")
        
        # Validate token_url ends with /token
        if not self.token_url.endswith("/token"):
            logger.warning(f"EPIC_TOKEN_URL should end with /oauth2/token. Current: {self.token_url}")
        
        return True
    
    def get_config_errors(self) -> list:
        """
        Comprehensive config mismatch detector.
        Returns list of ERROR/WARNING strings.
        """
        errors = []
        
        # ERROR: MyChart URLs detected
        for name, url in [("authorize_url", self.auth_url), ("token_url", self.token_url), ("fhir_base_url", self.fhir_base_url)]:
            if "mychart" in url.lower():
                errors.append(f"ERROR: {name} contains 'mychart' - this is WRONG for SMART on FHIR!")
        
        # ERROR: Auth URL format
        if not self.auth_url.endswith("/authorize"):
            errors.append(f"ERROR: authorize_url must end with /oauth2/authorize. Current: {self.auth_url}")
        
        # ERROR: Token URL format
        if not self.token_url.endswith("/token"):
            errors.append(f"ERROR: token_url must end with /oauth2/token. Current: {self.token_url}")
        
        # WARNING: FHIR base URL format
        if "/api/FHIR/" not in self.fhir_base_url:
            errors.append(f"WARNING: fhir_base_url should contain /api/FHIR/. Current: {self.fhir_base_url}")
        
        # ERROR: Scope missing FHIR scopes (only has openid/fhirUser)
        scope_parts = self.scope.split()
        fhir_scopes = [s for s in scope_parts if s.startswith("patient/") or s.startswith("user/")]
        if not fhir_scopes:
            errors.append(f"ERROR: Scope missing FHIR scopes! Only has: {self.scope}")
        
        # ERROR: Patient mode but no patient/* scopes
        if self.scope_mode == "patient":
            if "patient/Patient.read" not in self.scope:
                errors.append(f"ERROR: EPIC_SCOPE_MODE=patient but scope missing 'patient/Patient.read'")
            if "patient/Observation.read" not in self.scope:
                errors.append(f"ERROR: EPIC_SCOPE_MODE=patient but scope missing 'patient/Observation.read'")
        
        # ERROR: User mode but no user/* scopes  
        if self.scope_mode == "user":
            if "user/Patient.read" not in self.scope:
                errors.append(f"ERROR: EPIC_SCOPE_MODE=user but scope missing 'user/Patient.read'")
            if "user/Observation.read" not in self.scope:
                errors.append(f"ERROR: EPIC_SCOPE_MODE=user but scope missing 'user/Observation.read'")
        
        # WARNING: redirect_uri issues
        if "127.0.0.1" in self.redirect_uri and "localhost" in self.auth_url:
            errors.append(f"WARNING: redirect_uri uses 127.0.0.1 but auth_url uses localhost - potential mismatch")
        if self.redirect_uri.endswith("/"):
            errors.append(f"WARNING: redirect_uri has trailing slash - may cause mismatch")
        
        return errors
    
    def get_url_warnings(self) -> list:
        """Alias for backwards compatibility."""
        return self.get_config_errors()
    
    def log_config(self):
        """Log the active configuration with startup assertions."""
        masked_id = f"{self.client_id[:8]}...{self.client_id[-4:]}" if len(self.client_id) > 12 else "***"
        
        logger.info("=" * 70)
        logger.info("EPIC SMART ON FHIR CONFIGURATION")
        logger.info("=" * 70)
        logger.info(f"  EPIC_ENV: {self.env}")
        logger.info(f"  EPIC_SCOPE_MODE: {self.scope_mode}")
        logger.info(f"  Client ID: {masked_id} (from {self._client_id_source})")
        logger.info(f"  Redirect URI: {self.redirect_uri} (EXACT - no https upgrade)")
        logger.info("-" * 70)
        logger.info("  CRITICAL URLs (aud = FHIR_BASE_URL):")
        logger.info(f"    FHIR_BASE_URL (aud): {self.fhir_base_url}")
        logger.info(f"    EPIC_AUTH_URL:       {self.auth_url}")
        logger.info(f"    EPIC_TOKEN_URL:      {self.token_url}")
        logger.info("-" * 70)
        logger.info(f"  Scope: {self.scope}")
        logger.info("=" * 70)
        
        # Log config errors/warnings
        errors = self.get_config_errors()
        if errors:
            logger.warning("CONFIG ISSUES DETECTED:")
            for err in errors:
                if err.startswith("ERROR"):
                    logger.error(f"  {err}")
                else:
                    logger.warning(f"  {err}")
    
    @property
    def masked_client_id(self) -> str:
        """Return a masked version of the client ID for display."""
        if len(self.client_id) > 12:
            return f"{self.client_id[:8]}...{self.client_id[-4:]}"
        return "***"
    
    @property
    def scope(self) -> str:
        """OAuth scope string based on EPIC_SCOPE_MODE."""
        return self._scope
    
    def get_normalize_redirect_uri(self) -> str:
        """
        Return normalized redirect_uri to prevent subtle mismatches.
        Ensures no trailing slash.
        
        NOTE: Does NOT auto-upgrade to https. Uses the exact value from config.
        For sandbox testing, this should be: http://localhost:8000/callback
        """
        uri = self.redirect_uri.rstrip('/')
        # NO https upgrade - use exactly what's configured
        return uri
    
    def build_authorize_url(self, state: str = "<state>", iss: str = None) -> str:
        """
        Build the full authorize URL for diagnostics.
        
        Args:
            state: State parameter (use "<state>" for diagnostics display)
            iss: Optional ISS parameter override
        
        Returns:
            Full authorize URL string
        """
        from urllib.parse import urlencode
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.get_normalize_redirect_uri(),
            "scope": self.scope,
            "state": state,
            "aud": iss or self.fhir_base_url,
        }
        
        query = urlencode(params)
        return f"{self.auth_url}?{query}"
    
    def get_diagnostics(self) -> dict:
        """
        Return diagnostic information for debugging OAuth issues.
        
        Returns:
            Dict with all relevant OAuth parameters and validation results
        """
        config_errors = self.get_config_errors()
        has_errors = any(e.startswith("ERROR") for e in config_errors)
        
        return {
            # Environment
            "epic_env": self.env,
            "epic_scope_mode": self.scope_mode,
            "is_sandbox": self.is_sandbox,
            
            # Client
            "client_id": self.client_id,
            "client_id_source": self._client_id_source,
            
            # URLs (critical - single source of truth)
            "authorize_url": self.auth_url,
            "token_url": self.token_url,
            "fhir_base_url": self.fhir_base_url,
            "aud": self.fhir_base_url,  # ASSERTION: aud MUST equal fhir_base_url
            "redirect_uri": self.get_normalize_redirect_uri(),
            
            # Scope
            "scope": self.scope,
            "scope_parts": self.scope.split(),
            
            # Computed full authorize URL (copy/pasteable)
            "computed_authorize_url": self.build_authorize_url(),
            
            # Validation
            "config_errors": config_errors,
            "has_errors": has_errors,
            
            # Breakdown of authorize URL params
            "authorize_params": {
                "response_type": "code",
                "client_id": self.client_id,
                "redirect_uri": self.get_normalize_redirect_uri(),
                "scope": self.scope,
                "state": "<generated_at_runtime>",
                "aud": self.fhir_base_url,
            },
            
            # Verification assertions
            "assertions": {
                "aud_equals_fhir_base_url": True,  # By design
                "scope_has_fhir_scopes": any(s.startswith("patient/") or s.startswith("user/") for s in self.scope.split()),
                "authorize_url_is_interconnect": "interconnect" in self.auth_url.lower(),
                "no_mychart_urls": not any("mychart" in url.lower() for url in [self.auth_url, self.token_url, self.fhir_base_url]),
            }
        }


# Singleton instance
epic_config = EpicConfig()

