import { prisma } from "../lib/prisma";
import { Contact } from "../types/contact.types";

export const ContactRepository = {

    async findByEmailOrPhone(
        email: string | null | undefined,
        phoneNumber: string | null | undefined
    ): Promise<Contact[]> {
        const conditions: object[] = [];
        if (email) conditions.push({ email });
        if (phoneNumber) conditions.push({ phoneNumber });
        if (!conditions.length) return [];

        return prisma.contact.findMany({
            where: { OR: conditions, deletedAt: null },
            orderBy: { createdAt: "asc" },
        }) as Promise<Contact[]>;
    },

    async findById(id: number): Promise<Contact | null> {
        return prisma.contact.findFirst({
            where: { id, deletedAt: null },
        }) as Promise<Contact | null>;
    },

    async findAllInCluster(primaryId: number): Promise<Contact[]> {
        return prisma.contact.findMany({
            where: {
                OR: [{ id: primaryId }, { linkedId: primaryId }],
                deletedAt: null,
            },
            // 'primary' < 'secondary' lexicographically → ASC puts primary first
            orderBy: [{ linkPrecedence: "asc" }, { createdAt: "asc" }],
        }) as Promise<Contact[]>;
    },

    async createContact(data: {
        email?: string | null;
        phoneNumber?: string | null;
        linkedId?: number | null;
        linkPrecedence: "primary" | "secondary";
    }): Promise<Contact> {
        return prisma.contact.create({ data }) as Promise<Contact>;
    },

    async demoteContact(id: number, newPrimaryId: number): Promise<void> {
        await prisma.contact.update({
            where: { id },
            data: { linkPrecedence: "secondary", linkedId: newPrimaryId },
        });
    },

    async reattachSecondaries(
        oldPrimaryId: number,
        newPrimaryId: number
    ): Promise<void> {
        await prisma.contact.updateMany({
            where: { linkedId: oldPrimaryId },
            data: { linkedId: newPrimaryId },
        });
    },

};
