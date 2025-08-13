41111## Getting Started

### Install dependencies
```bash
npm install
```

### Configure Environment
copy .env.example to .env and fill out as needed

Make sure you set the `ORIGIN` variable to the domain that you are deploying to i.e. https://obp-portal.openbankproject.com or something like that

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# To run on a specific port use:
# Note: Another port will be used if the target is port is already in use
npm run dev -- --port 5174

# To force the use of a port use the following (an error will be thrown if the target port is already in use) use:
npm run dev -- --port 5174 --strictPort

# To see other server options see : https://vite.dev/config/server-options (note remove the word server.)

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Deploying in production
Make sure to deploy the latest commit/docker image.

Look carefully at the `.env.example` provided, Copy to `.env` (`.env-docker`) and fill out the variables as needed.

A common mistake is to not change the `APP_CALLBACK_URL`, which should be the domain that the portal is deployed to, not `localhost`.

## Logging Configuration

### Username Logging for Opey Communication

The OBP-Portal automatically logs the username from consent JWTs when communicating with Opey. This feature helps with monitoring and debugging by showing which user is making requests to the Opey service.

The logging includes:
- Function name that created the log entry
- Username extracted from the consent JWT token (with explicit field identification)
- Opey session creation details
- Success/failure status of operations

Example log output:
```
INFO [2025-08-13T15:03:36.690Z] [INFO] [OBPIntegrationService] getOrCreateOpeyConsent says: Created new consent JWT for user: 91be7e0b-bf6b-4476-8a89-75850a11313b
INFO [2025-08-13T15:03:36.691Z] [INFO] [OpeyAuthServer] _getAuthenticatedSession says: Sending consent JWT to Opey for user: 91be7e0b-bf6b-4476-8a89-75850a11313b
INFO [2025-08-13T15:03:36.692Z] [INFO] [OpeyAuthServer] _getAuthenticatedSession says: Making request to http://localhost:5000/create-session with consent for user: 91be7e0b-bf6b-4476-8a89-75850a11313b
INFO [2025-08-13T15:03:36.720Z] [INFO] [OpeyAuthServer] _getAuthenticatedSession says: Successfully created authenticated Opey session for user: 91be7e0b-bf6b-4476-8a89-75850a11313b
```

### JWT User Identification Fields

The system attempts to extract user identifiers from these JWT fields in order (prioritizing human-readable identifiers):
1. `email`
2. `name`
3. `preferred_username`
4. `username`
5. `user_name` 
6. `login`
7. `sub`
8. `user_id`

The system will log which field was used for user identification:
```
INFO [timestamp] [INFO] [JWTUtils] extractUsernameFromJWT says: User identifier extracted from JWT field 'email': john.doe@example.com
INFO [timestamp] [INFO] [JWTUtils] extractUsernameFromJWT says: User identifier extracted from JWT field 'sub': 91be7e0b-bf6b-4476-8a89-75850a11313b
```

### Function Name Prefixes

All log messages include the service/function name that generated the log for easier debugging:

- `extractUsernameFromJWT says:` - JWT user identifier extraction logs
- `getOrCreateOpeyConsent says:` - Consent JWT creation/retrieval logs
- `_getAuthenticatedSession says:` - Authenticated session creation logs
- `_getAnonymousSession says:` - Anonymous session creation logs
- `ConsentSessionService says:` - Session service operation logs

### Development vs Production Logging

When no user identifier can be found in the JWT, the system will log all available JWT fields to help with debugging. The system prioritizes human-readable identifiers like email addresses and display names over system identifiers like UUIDs.

Make sure that the `APP_CALLBACK_URL` is registered with the OAuth2/OIDC provider, so that it will properly redirect. Without this the Portal will not work.
