export type LinkPrecedence = "primary" | "secondary";

export interface Contact {
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: LinkPrecedence;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface ConsolidatedContact {
    primaryContatctId: number;   // intentional typo — matches exact spec key
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
}

export interface IdentifyResponse {
    contact: ConsolidatedContact;
}
