import { Router } from "express";
import { identifyController } from "../controllers/identify.controller";

const router = Router();
router.post("/identify", identifyController);

export default router;
