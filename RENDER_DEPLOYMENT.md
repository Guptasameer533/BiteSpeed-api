# Render.com Deployment Guide

This guide details the exact steps to deploy the Bitespeed Identity Reconciliation service to Render.com's free tier, fulfilling the assignment's hosting requirement.

## Step 1: Push Code to GitHub
Before deploying, ensure your code is pushed to a public or private GitHub repository.

```bash
git init
git add .
git commit -m "Initial commit: Bitespeed identity reconciliation service"
git branch -M main
git remote add origin https://github.com/your-username/bitespeed-identity-reconciliation.git
git push -u origin main
```

## Step 2: Create a PostgreSQL Database
The service requires a PostgreSQL database to store Contacts. Render provides a free managed PostgreSQL instance.

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **PostgreSQL**.
3. Fill in the details:
   - **Name:** `bitespeed-db` (or similar)
   - **Database:** `bitespeed`
   - **User:** `bitespeed_user`
   - **Region:** Choose the one closest to you.
   - **Instance Type:** Select the **Free** tier.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (it looks like `postgres://...`). You will need this for the Web Service.

## Step 3: Create the Web Service
Now, deploy the Node.js application.

1. Go back to the Render Dashboard, click **New +**, and select **Web Service**.
2. Connect your GitHub account and select your `bitespeed-identity-reconciliation` repository.
3. Fill in the deployment details:
   - **Name:** `bitespeed-identity-reconciliation` (this will be part of your URL).
   - **Region:** Choose the same region as your database.
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && npm start`
4. Select the **Free** instance type.

## Step 4: Configure Environment Variables
Before clicking "Create Web Service", scroll down and click **Advanced** -> **Add Environment Variable**.

Add the following variables:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | *(Paste the **Internal Database URL** from Step 2)* | Connects the app to your DB |
| `NODE_ENV` | `production` | Optimizes Express for production |

*(Note: You do not need to set the `PORT` variable; Render automatically injects it and Express will use it).*

## Step 5: Deploy and Test
1. Click **Create Web Service**.
2. Render will now build your app, run the Prisma migration (`db:deploy`), and start the server. This usually takes 2-3 minutes.
3. Once the status shows as **Live**, copy your service URL (e.g., `https://bitespeed-identity-reconciliation.onrender.com`).

### Verify Deployment
Test your live endpoint using your terminal:

```bash
curl -X POST https://YOUR_APP_NAME.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lorraine@hillvalley.edu",
    "phoneNumber": "123456"
  }'
```

You should receive a `200 OK` response with the expected JSON payload.

## Step 6: Finalize Submission
Don't forget to update your repository's `README.md` file with the final Live Endpoint URL before submitting your assignment link to Bitespeed!
