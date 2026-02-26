# Bitespeed Identity Reconciliation

## Live Endpoint
POST https://bitespeed-identity-reconciliation.onrender.com/identify

*(Replace the URL above with your actual deployed URL on Render.com)*

## Local Setup
1. Clone the repository
2. `cp .env.example .env` and fill in the `DATABASE_URL` for your Postgres instance
3. `npm install`
4. `npm run db:migrate`
5. `npm run dev`

## Tech Stack
- Node.js 20 LTS + TypeScript
- Express 4.x
- PostgreSQL + Prisma ORM
- Zod for Validation

## Canonical Example Spec Test
```bash
# Setup: 
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "email": "george@hillvalley.edu", "phoneNumber": "919191" }'
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "email": "biffsucks@hillvalley.edu", "phoneNumber": "717171" }'

# Request (triggers cross-cluster merge):
curl -X POST http://localhost:3000/identify -H "Content-Type: application/json" -d '{ "email": "george@hillvalley.edu", "phoneNumber": "717171" }'

# Response matches exact spec output:
# {"contact":{"primaryContatctId":1,"emails":["george@hillvalley.edu","biffsucks@hillvalley.edu"],"phoneNumbers":["919191","717171"],"secondaryContactIds":[2]}}
```
