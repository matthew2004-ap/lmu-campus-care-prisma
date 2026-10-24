# Deployment checklist

- [ ] PostgreSQL database provisioned and reachable from the host.
- [ ] `DATABASE_URL` configured as a server-side secret.
- [ ] `AUTH_SECRET` is a random value of at least 32 characters and not a placeholder.
- [ ] `npm run build` passes locally.
- [ ] Database schema/migrations applied to the target database.
- [ ] Separate student and council test accounts created.
- [ ] Role permissions tested for Welfare, Transport, P.R.O. and VCM.
- [ ] Arrival registration, inspection, delivery PIN, and ₦1,000 transport charge tested.
- [ ] Gate schedule publish/archive tested.
- [ ] Lost item reports, private proof, found-item claim and P.R.O. approval tested.
- [ ] Hostel report submit/update/resolve tested.
- [ ] Mobile navigation and forms tested on a real phone.
- [ ] Google OAuth callback configured if Google sign-in is enabled.
- [ ] Backups, rate limiting, account recovery, email verification, and monitoring configured before a public launch.
