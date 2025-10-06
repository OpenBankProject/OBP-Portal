# Changes Made for Subdomain Cookie Sharing

## ✅ Changes Completed

### 1. Portal - `src/hooks.server.ts`
- Added cookie domain configuration
- **Lines changed:** 24 lines added

### 2. Opey - `src/auth/session.py` 
- Changed `domain=None` to `domain=os.getenv("COOKIE_DOMAIN")`
- **Lines changed:** 1 line modified

### 3. Portal - `.env.example`
- Added `COOKIE_DOMAIN` and `SESSION_SECRET` documentation

---

## 📝 Environment Variables Required

### Portal `.env`
```bash
# Leave empty for localhost, set for production subdomains
COOKIE_DOMAIN=.example.com           # Production only
SESSION_SECRET=xxx                    # Generate: openssl rand -base64 32
```

### Opey `.env`
```bash
# Must match Portal's domain
COOKIE_DOMAIN=.example.com           # Production only

# Already exists - just add your Portal domain
CORS_ALLOWED_ORIGINS=https://portal.example.com
```

---

## 🏠 For Localhost Development

**Leave `COOKIE_DOMAIN` empty or unset in both Portal and Opey!**

Cookies work across ports on localhost automatically.

---

## ✅ Testing

1. Deploy with `COOKIE_DOMAIN=.example.com` set in both
2. Log in to Portal
3. DevTools → Check cookie domain = `.example.com`
4. Use Opey chat
5. Opey logs: `Session cookie present: True` ✅

---

## Summary

- **Files changed:** 3 (Portal hooks, Opey session, Portal .env.example)
- **Total lines:** ~25 lines
- **Ready to deploy** ✅

