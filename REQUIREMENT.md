# Bitespeed Backend Task: Identity Reconciliation

## Background

Meet the brilliant yet eccentric Dr. Emmett Brown, better known as Doc. Hopelessly stuck in 2023, he is fixing his time machine to go back to the future and save his friend. His favourite online store FluxKart.com sells all the parts required to build this contraption. To avoid drawing attention to his grandiose project, Doc is using different email addresses and phone numbers for each purchase.

FluxKart.com is deadpan serious about their customer experience. To personalise it, FluxKart decides to integrate Bitespeed into their platform. Bitespeed collects contact details from shoppers for a personalised customer experience.

However, given Doc's modus operandi, Bitespeed faces a unique challenge: **linking different orders made with different contact information to the same person**.

---

## Database Schema

Bitespeed keeps track of collected contact information in a relational database table named `Contact`:

```
{
  id              Int
  phoneNumber     String?
  email           String?
  linkedId        Int?          // the ID of another Contact linked to this one
  linkPrecedence  "secondary" | "primary"  // "primary" if it's the first Contact in the link
  createdAt       DateTime
  updatedAt       DateTime
  deletedAt       DateTime?
}
```

One customer can have multiple `Contact` rows. All rows are linked together with the **oldest one treated as "primary"** and the rest as **"secondary"**.

Contact rows are linked if they have either `email` or `phoneNumber` in common.

### Example

If a customer placed an order with `email=lorraine@hillvalley.edu` & `phoneNumber=123456`, and later came back with `email=mcfly@hillvalley.edu` & `phoneNumber=123456`, the database will have:

```json
{
  "id": 1,
  "phoneNumber": "123456",
  "email": "lorraine@hillvalley.edu",
  "linkedId": null,
  "linkPrecedence": "primary",
  "createdAt": "2023-04-01T00:00:00.374Z",
  "updatedAt": "2023-04-01T00:00:00.374Z",
  "deletedAt": null
},
{
  "id": 23,
  "phoneNumber": "123456",
  "email": "mcfly@hillvalley.edu",
  "linkedId": 1,
  "linkPrecedence": "secondary",
  "createdAt": "2023-04-20T05:30:00.11Z",
  "updatedAt": "2023-04-20T05:30:00.11Z",
  "deletedAt": null
}
```

---

## Requirements

Design a web service with an endpoint `/identify` that receives HTTP POST requests:

### Request

```json
{
  "email"?: "string",
  "phoneNumber"?: "number"
}
```

### Response `HTTP 200`

```json
{
  "contact": {
    "primaryContatctId": "number",
    "emails": ["string"],         // first element = primary contact's email
    "phoneNumbers": ["string"],   // first element = primary contact's phone
    "secondaryContactIds": ["number"]
  }
}
```

### Example

**Request:**
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

---

## Behaviour Rules

### No Existing Contact
If there are no existing contacts matching the incoming request, create a new `Contact` row with `linkPrecedence="primary"` and return it with an empty `secondaryContactIds` array.

### Secondary Contact Creation
If an incoming request has either `phoneNumber` or `email` common to an existing contact but contains **new information**, create a new `secondary` Contact row linked to the existing primary.

### Primary Contact Demotion
Two separate primary contacts can get linked when an incoming request references both. In that case, the **newer** primary is demoted to secondary (linked to the older primary).

**Example:**

Existing state:
```json
{ "id": 11, "phoneNumber": "919191", "email": "george@hillvalley.edu", "linkedId": null, "linkPrecedence": "primary" },
{ "id": 27, "phoneNumber": "717171", "email": "biffsucks@hillvalley.edu", "linkedId": null, "linkPrecedence": "primary" }
```

Request:
```json
{ "email": "george@hillvalley.edu", "phoneNumber": "717171" }
```

New state:
```json
{ "id": 11, "phoneNumber": "919191", "email": "george@hillvalley.edu", "linkedId": null, "linkPrecedence": "primary" },
{ "id": 27, "phoneNumber": "717171", "email": "biffsucks@hillvalley.edu", "linkedId": 11, "linkPrecedence": "secondary" }
```

Response:
```json
{
  "contact": {
    "primaryContatctId": 11,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [27]
  }
}
```

---

## Tech Stack

| Layer | Requirement |
|---|---|
| **Database** | Any SQL database |
| **Backend** | Node.js with TypeScript (preferred); any other framework also acceptable |

---

## Submission Checklist

1. Publish the code repository to **GitHub**
2. Make small commits with insightful messages
3. Expose the `/identify` endpoint
4. **Host the app online** and share the endpoint URL in the README (e.g. [Render.com](https://render.com) free tier)
5. Use **JSON body** for request payloads — not form-data
