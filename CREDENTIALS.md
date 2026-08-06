# Demo Login Credentials

These accounts are pre-seeded for testing. Run `npm run seed` to create them.

## Accounts

### Admin Account
| Field | Value |
|-------|-------|
| Name | Admin User |
| Email | `admin@medcounsel.ai` |
| Password | `Admin@123` |
| Role | admin |

### Student Account (Primary)
| Field | Value |
|-------|-------|
| Name | Swaraj Sah |
| Email | `swaraj@medcounsel.ai` |
| Password | `Swaraj@123` |
| Role | student |

### Student Account (Demo)
| Field | Value |
|-------|-------|
| Name | Demo Student |
| Email | `demo@medcounsel.ai` |
| Password | `Demo@123` |
| Role | student |

## Quick Start

```bash
# 1. Seed the demo accounts
npm run seed

# 2. Start the app
npm run dev

# 3. Open http://localhost:5173 and login with any account above
```

## Password Requirements

When creating new accounts or resetting passwords, passwords must meet:

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

## Forgot Password (Dev Mode)

In development mode, the forgot password flow works without email delivery:

1. Go to `/forgot-password`
2. Enter any registered email
3. The reset token is displayed on screen (dev mode only)
4. Click the link to go to `/reset-password?token=...`
5. Enter a new password

In production, the reset token would be sent via email instead.

## Session Details

- Access tokens expire after **15 minutes**
- Refresh tokens (httpOnly cookie) expire after **7 days**
- "Remember Me" saves the email for next login prefill
- Logout invalidates the refresh token server-side

## Re-seeding

Running `npm run seed` again is safe. It skips accounts that already exist:

```
[skip] admin@medcounsel.ai already exists
[skip] swaraj@medcounsel.ai already exists
[skip] demo@medcounsel.ai already exists
```

To start fresh, delete `server/data/db.json` and re-seed:

```bash
rm server/data/db.json
npm run seed
```
