import express, { Request, Response, NextFunction } from "express";
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
