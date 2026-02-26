import { z } from "zod";

export const identifySchema = z
    .object({
        email: z.string().email("Invalid email format").nullish(),
        phoneNumber: z.string().nullish(),
    })
    .refine(
        (data) => data.email != null || data.phoneNumber != null,
        { message: "At least one of email or phoneNumber must be provided" }
    );

export type IdentifyInput = z.infer<typeof identifySchema>;
