import express, { Request, Response, NextFunction } from "express";
import { execSync } from "child_process";
import identifyRouter from "./routes/identify.route";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(identifyRouter);

// Health check (useful for Render.com uptime monitoring)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler — MUST be last middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[ERROR]", err.stack);
    res.status(500).json({ error: "Internal server error" });
});

async function main() {
    // Run DB migrations before accepting traffic.
    // Critical on Render free tier where the start-command `&&` chain
    // can fail silently if the DB isn't immediately reachable.
    try {
        console.log("[STARTUP] Running prisma migrate deploy...");
        execSync("npx prisma migrate deploy", { stdio: "inherit" });
        console.log("[STARTUP] Migrations applied successfully.");
    } catch (err) {
        console.error("[STARTUP] Migration failed — aborting server start.", err);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

main();
