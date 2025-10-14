# Troubleshooting Guide: OBP-20208 Error

## Error Description

**Error Code:** OBP-20208
**Error Message:** "Cannot match the issuer and JWKS URI at this server instance"
**HTTP Status:** 401 Unauthorized

This error occurs when the OBP API server cannot validate JWT access tokens due to a mismatch between the issuer claim in the token and the expected JWKS URI configuration.

## Root Cause Analysis

The OBP-20208 error happens when:

1. **Issuer Mismatch**: The `iss` (issuer) claim in the JWT access token doesn't match what the OBP API server expects
2. **JWKS URI Unreachable**: The OBP API server cannot reach the JWKS endpoint to fetch public keys for token validation
3. **Configuration Inconsistency**: The OIDC provider configuration differs from the OBP API server's OAuth configuration

## Quick Diagnosis

### 1. Use Debug Tools

Run the provided debug scripts:

```bash
# Test network connectivity
./check-connectivity.sh

# Analyze JWT token (replace YOUR_TOKEN with actual access token)
node debug-oauth.js YOUR_ACCESS_TOKEN
```

### 2. Check Key Configuration Values

Verify these environment variables are consistent:

```bash
# Portal environment
VITE_OIDC_ISSUER=http://127.0.0.1:9000
OBP_OAUTH_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
PUBLIC_OBP_BASE_URL=http://localhost:8080

# OBP API server configuration (check OBP server config)
# These should match the OIDC provider values
```

## Step-by-Step Troubleshooting

### Step 1: Verify OIDC Configuration

Test the OIDC well-known endpoint:

```bash
curl -s http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration | jq .
```

Expected response should include:
- `issuer`: The issuer URL
- `jwks_uri`: The JWKS endpoint URL
- `token_endpoint`: Token exchange endpoint
- `authorization_endpoint`: Authorization endpoint

### Step 2: Test JWKS Endpoint Accessibility

From the OBP API server, test if the JWKS endpoint is reachable:

```bash
# Replace with actual JWKS URI from step 1
curl -s http://127.0.0.1:9000/obp-oidc/jwks | jq .
```

This should return a JSON Web Key Set with public keys.

### Step 3: Analyze JWT Token Claims

Decode your access token to check the `iss` claim:

```bash
# Use the debug script or online JWT decoder
node debug-oauth.js YOUR_ACCESS_TOKEN
```

Key claims to verify:
- `iss` (issuer): Should match OIDC configuration issuer
- `aud` (audience): Should include your client ID
- `exp` (expiration): Should not be expired
- `iat` (issued at): Should be reasonable

### Step 4: Check Network Connectivity

Ensure the OBP API server can reach the OIDC provider:

```bash
# From OBP API server machine/container
curl -I http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
curl -I http://127.0.0.1:9000/obp-oidc/jwks
```

### Step 5: Verify OBP API Configuration

Check OBP API server configuration for OAuth settings. Look for:
- Expected issuer configuration
- JWKS URI configuration
- OAuth client configurations

## Common Solutions

### Solution 1: Fix Issuer Mismatch

If JWT token issuer differs from expected:

1. **Option A**: Update OBP API configuration to expect the correct issuer
2. **Option B**: Update OIDC provider to issue tokens with expected issuer

### Solution 2: Fix Network Connectivity

For Docker/container environments:

```yaml
# docker-compose.yml - ensure services can communicate
services:
  obp-api:
    networks:
      - obp-network

  oidc-provider:
    networks:
      - obp-network

networks:
  obp-network:
    driver: bridge
```

Use container names instead of localhost:
```bash
# Instead of
VITE_OIDC_ISSUER=http://localhost:9000

# Use
VITE_OIDC_ISSUER=http://oidc-provider:9000
```

### Solution 3: Update Environment Variables

Ensure consistency across all components:

**Portal (.env):**
```bash
VITE_OIDC_ISSUER=http://127.0.0.1:9000
OBP_OAUTH_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
PUBLIC_OBP_BASE_URL=http://localhost:8080
```

**OBP API Server configuration:**
- Issuer should match `VITE_OIDC_ISSUER`
- JWKS URI should be reachable from OBP API server

### Solution 4: Certificate/TLS Issues

If using HTTPS:

1. Ensure certificates are valid
2. Check certificate chain
3. Verify certificate authorities are trusted

## Docker-Specific Issues

### Container Name Resolution

```bash
# Wrong - using localhost in containers
VITE_OIDC_ISSUER=http://localhost:9000

# Correct - using container/service names
VITE_OIDC_ISSUER=http://obp-oidc:9000
```

### Network Configuration

Ensure all services are on the same Docker network:

```bash
docker network inspect obp-network
```

### Port Mapping

Verify port mappings are correct:

```yaml
services:
  obp-oidc:
    ports:
      - "9000:9000"  # host:container
```

## Advanced Debugging

### Enable Debug Logging

**Portal:**
```bash
# Enable debug logging
DEBUG=*
```

**OBP API Server:**
Check OBP API server logs for detailed OAuth validation errors.

### JWT Token Validation

Manually validate JWT token:

```bash
# Decode token parts
echo "YOUR_TOKEN" | cut -d. -f1 | base64 -d | jq .  # Header
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d | jq .  # Payload
```

### Network Tracing

Use network tools to trace requests:

```bash
# Monitor network traffic
tcpdump -i any port 9000

# Test with verbose curl
curl -v http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
```

## Prevention

### 1. Configuration Management

- Use configuration files or environment variable templates
- Document all OAuth/OIDC endpoints and their relationships
- Implement configuration validation on startup

### 2. Health Checks

Implement health checks for:
- OIDC provider availability
- JWKS endpoint accessibility
- Token validation functionality

### 3. Monitoring

Monitor for:
- OAuth token validation failures
- OIDC provider connectivity issues
- JWT token expiration patterns

## Related Documentation

- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Specification](https://datatracker.ietf.org/doc/html/rfc7519)
- [OBP API Documentation](https://github.com/OpenBankProject/OBP-API)

## Support

If the issue persists after following this guide:

1. Check OBP API server logs for detailed error messages
2. Verify OIDC provider logs for token issuance details
3. Use the debug tools provided in this repository
4. Contact your system administrator or OBP support team

## Checklist

Use this checklist to systematically troubleshoot the issue:

- [ ] OIDC well-known endpoint is accessible
- [ ] JWKS endpoint is accessible from OBP API server
- [ ] JWT token issuer matches OIDC configuration
- [ ] JWT token is not expired
- [ ] Network connectivity between all components
- [ ] Environment variables are consistent
- [ ] Docker network configuration (if applicable)
- [ ] Certificate validation (if using HTTPS)
- [ ] OBP API server OAuth configuration matches OIDC provider
- [ ] Debug logs reviewed for additional details
