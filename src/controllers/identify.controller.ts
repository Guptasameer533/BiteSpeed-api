import { Request, Response, NextFunction } from "express";
import { identifySchema } from "../validators/identify.validator";
import { ContactService } from "../services/contact.service";

export async function identifyController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const parsed = identifySchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
    }

    try {
        const { email, phoneNumber } = parsed.data;
        const contact = await ContactService.identify(email, phoneNumber);
        res.status(200).json({ contact });
    } catch (err) {
        next(err);
    }
}
