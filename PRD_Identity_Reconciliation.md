# Product Requirement Document
## Bitespeed — Identity Reconciliation Service

---

## 1. Problem Statement

Customers often use different email addresses and/or phone numbers across multiple purchases on FluxKart.com. This makes it impossible to link their orders to a single identity, breaking personalization and loyalty experiences.

Bitespeed needs a backend service that **identifies and consolidates contact information** from multiple purchases into a single unified customer identity — even when different contact details are used each time.

---

## 2. Target User

| Actor | Role |
|---|---|
| **FluxKart.com** | E-commerce platform that triggers identity lookup at checkout |
| **Bitespeed System** | Internal — consumes and maintains the Contact database |

> End customers are not direct users of this service. This is a backend B2B integration.

---

## 3. Core User Flows

### Flow 1 — New Contact (No Match Found)
1. FluxKart sends `POST /identify` with `email` and/or `phoneNumber`.
2. No existing contact matches either field.
3. System creates a new `primary` Contact record.
4. Returns consolidated contact with empty `secondaryContactIds`.

### Flow 2 — Existing Contact (Exact Match)
1. FluxKart sends `POST /identify` with known `email` and/or `phoneNumber`.
2. System finds existing contact(s) matching one or both fields.
3. No new record is created.
4. Returns the consolidated contact linked to the oldest (primary) contact.

### Flow 3 — Partial Match with New Information
1. FluxKart sends `POST /identify` with one field matching an existing contact and one new field.
2. System creates a new `secondary` Contact record linked to the existing primary.
3. Returns consolidated contact including the new secondary.

### Flow 4 — Two Separate Primaries Get Linked
1. FluxKart sends `POST /identify` with fields that match two different existing `primary` contacts.
2. System demotes the **newer** primary to `secondary`, linking it to the **older** primary.
3. Returns consolidated contact with the older contact as primary.

---

## 4. Feature List

### MVP (Required for Submission)

| # | Feature | Description |
|---|---|---|
| F1 | `POST /identify` endpoint | Accepts `{ email?: string, phoneNumber?: string }` JSON body |
| F2 | Contact creation | Creates a new `primary` contact when no match exists |
| F3 | Secondary contact creation | Creates a `secondary` contact when partial match with new info exists |
| F4 | Primary–secondary linking | Links contacts via `linkedId`; oldest contact is always `primary` |
| F5 | Primary demotion | Converts a newer `primary` to `secondary` when two clusters are merged |
| F6 | Consolidated response | Returns `primaryContactId`, deduplicated `emails`, `phoneNumbers`, and `secondaryContactIds` |
| F7 | Ordered response fields | Primary contact's email/phone appear **first** in respective arrays |
| F8 | Null/missing field handling | Handles requests with one of `email` or `phoneNumber` being `null` or absent |
| F9 | Persistent storage | SQL database with a `Contact` table matching the specified schema |

### Future (Out of Scope for This Assignment)

| # | Feature |
|---|---|
| FF1 | Soft-delete / `deletedAt` support in query logic |
| FF2 | Admin dashboard to view/manage contact clusters |
| FF3 | Webhook notifications on contact merge events |
| FF4 | Rate limiting and API key authentication |

---

## 5. Data Model

```
Contact {
  id              Int           (PK, auto-increment)
  phoneNumber     String?
  email           String?
  linkedId        Int?          (FK → Contact.id)
  linkPrecedence  "primary" | "secondary"
  createdAt       DateTime
  updatedAt       DateTime
  deletedAt       DateTime?
}
```

**Linking rules:**
- A contact is `primary` if it is the oldest in its identity cluster (`linkedId = null`).
- All other contacts in the cluster are `secondary` and have `linkedId` pointing to the primary's `id`.
- Two contacts are in the same cluster if they share a `phoneNumber` **or** `email`.

---

## 6. API Contract

### Request
```
POST /identify
Content-Type: application/json

{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```
> At least one of `email` or `phoneNumber` must be provided.

### Response
```
HTTP 200 OK

{
  "contact": {
    "primaryContatctId": number,
    "emails": string[],          // primary email first
    "phoneNumbers": string[],    // primary phone first
    "secondaryContactIds": number[]
  }
}
```

---

## 7. Edge Cases

| # | Edge Case | Expected Behaviour |
|---|---|---|
| E1 | Both `email` and `phoneNumber` are `null`/missing | Return `400 Bad Request` |
| E2 | Incoming request matches two separate primary contacts | Merge clusters; demote newer primary to secondary |
| E3 | Incoming request is an exact duplicate (same email + phone already exist together) | No new record; return existing consolidated contact |
| E4 | Only one field provided, matches multiple contacts in different clusters | Merge all matched clusters under the oldest primary |
| E5 | Primary contact has no email or no phone | Still return available fields; missing fields not included in arrays |
| E6 | Very first request to the system (empty database) | Create first `primary` contact |
| E7 | Same email, different phones across many secondary contacts | All phones appear in `phoneNumbers`; all secondary IDs in `secondaryContactIds` |

---

## 8. Non-Goals

- **No authentication/authorization** — endpoint is open for this assignment scope.
- **No soft-delete enforcement** — `deletedAt` column exists in schema but query logic need not filter on it for MVP.
- **No pagination** — consolidated contact response returns all linked contacts.
- **No frontend / UI** — this is a pure backend REST API.
- **No real-time event streaming** — no webhooks or pub/sub on merge events.
- **No multi-tenancy** — single global Contact table, no tenant isolation.

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Correct contact consolidation | All provided test scenarios in the spec return exactly matching responses |
| New contact creation | Primary contact created when no match exists |
| Secondary contact creation | Secondary created when partial match + new info detected |
| Primary demotion accuracy | Newer primary correctly demoted on cross-cluster merge |
| Response format compliance | Response strictly matches the specified JSON shape |
| Endpoint availability | `/identify` endpoint publicly accessible via hosted URL |

---

## 10. Technical Constraints

| Constraint | Detail |
|---|---|
| Language | Node.js with TypeScript (preferred) |
| Database | Any SQL database (PostgreSQL recommended for hosted deployment) |
| Hosting | Must be publicly accessible (e.g., Render.com free tier) |
| Request format | JSON body only — no form-data |
| Submission | GitHub repo with meaningful commit history + hosted URL in README |
