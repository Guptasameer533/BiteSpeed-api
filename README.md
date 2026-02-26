# Bitespeed Identity Reconciliation

A Node.js + TypeScript service that links customer contact records sharing an email or phone number.

## 🚀 Live Endpoint

```
POST https://bitespeed-api-yj3g.onrender.com/identify
```

---

## 🏗 Backend Architecture

```
  ┌─────────────────────────────────────────┐
  │           Client  (curl / HTTP)         │
  └───────────────────┬─────────────────────┘
                      │  POST /identify
                      ▼
  ┌─────────────────────────────────────────┐
  │   Express Router                        │
  │   routes/identify.route.ts              │
  └───────────────────┬─────────────────────┘
                      │
                      ▼
  ┌─────────────────────────────────────────┐
  │   Zod Validator                         │──── 400 Bad Request ──▶ Client
  │   validators/identify.validator.ts      │
  └───────────────────┬─────────────────────┘
                      │  parsed & valid data
                      ▼
  ┌─────────────────────────────────────────┐
  │   identifyController                    │
  │   controllers/identify.controller.ts    │
  └───────────────────┬─────────────────────┘
                      │  identify(email, phone)
                      ▼
  ┌─────────────────────────────────────────┐
  │   ContactService                        │
  │   services/contact.service.ts           │
  │                                         │
  │   1. Find contacts by email / phone     │
  │   2. Resolve root primaries             │
  │   3. Merge clusters (demote newer)      │
  │   4. Create secondary if new info       │
  │   5. Return consolidated response       │
  └───────────────────┬─────────────────────┘
                      │  Prisma queries
                      ▼
  ┌─────────────────────────────────────────┐
  │   ContactRepository                     │
  │   repositories/contact.repository.ts    │
  └───────────────────┬─────────────────────┘
                      │  SQL
                      ▼
  ┌─────────────────────────────────────────┐
  │   PostgreSQL  (Render)                  │
  │   table: Contact                        │
  └─────────────────────────────────────────┘
```

---

## 🛠 Local Setup

```bash
git clone https://github.com/Guptasameer533/BiteSpeed-api.git
cd BiteSpeed-api
cp .env.example .env      # fill DATABASE_URL with your Postgres URL
npm install
npm run db:migrate
npm run dev
```

---

## 📦 Tech Stack

| Layer      | Technology                |
|------------|---------------------------|
| Runtime    | Node.js 22 + TypeScript   |
| Framework  | Express 4.x               |
| Database   | PostgreSQL + Prisma ORM   |
| Validation | Zod                       |
| Hosting    | Render.com (free tier)    |

---

## 🧪 API Tests

> Based on examples from the official requirement spec.

### Example 1 — Secondary Contact Creation

A customer orders with `lorraine`'s email, then returns using a new email but same phone:

```bash
# Step 1 — first order (creates primary contact)
curl -X POST https://bitespeed-api-yj3g.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

```bash
# Step 2 — second order: same phone, new email → creates secondary
curl -X POST https://bitespeed-api-yj3g.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

**Expected response (Step 2):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

### Example 2 — Primary Contact Demotion (Cluster Merge)

Two completely unrelated primaries get linked by a single request that references both:

```bash
# Setup — create two separate primaries
curl -X POST https://bitespeed-api-yj3g.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "919191"}'

curl -X POST https://bitespeed-api-yj3g.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "biffsucks@hillvalley.edu", "phoneNumber": "717171"}'
```

```bash
# Merge trigger — bridges both clusters
curl -X POST https://bitespeed-api-yj3g.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "717171"}'
```

**Expected response:** Older contact (`george`) stays primary, newer (`biffsucks`) is demoted:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [2]
  }
}
```
