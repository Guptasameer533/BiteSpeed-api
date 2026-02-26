import { ContactRepository } from "../repositories/contact.repository";
import { Contact, ConsolidatedContact } from "../types/contact.types";

export const ContactService = {

    async identify(
        email: string | null | undefined,
        phoneNumber: string | null | undefined
    ): Promise<ConsolidatedContact> {

        // ── STEP 1: Find all contacts matching email OR phone ────────────────────
        const matched = await ContactRepository.findByEmailOrPhone(email, phoneNumber);

        // ── STEP 2: No match — brand-new primary contact ─────────────────────────
        if (!matched.length) {
            const newContact = await ContactRepository.createContact({
                email: email ?? null,
                phoneNumber: phoneNumber ?? null,
                linkPrecedence: "primary",
            });
            return await _buildResponse(newContact.id);
        }

        // ── STEP 3: Resolve root primaries ────────────────────────────────────────
        // IMPORTANT: A matched secondary contact may belong to a primary that was
        // NOT itself returned by the initial query (different email/phone).
        // We MUST fetch the root from the DB, not just from matched[].
        const primaryMap = new Map<number, Contact>();

        for (const contact of matched) {
            const root = await _resolvePrimary(contact);
            primaryMap.set(root.id, root);
        }

        const primaries = Array.from(primaryMap.values()).sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        const oldestPrimary = primaries[0];

        // ── STEP 4: Merge clusters if > 1 primary ────────────────────────────────
        if (primaries.length > 1) {
            for (const other of primaries.slice(1)) {
                // ① Re-point all secondaries of 'other' to the oldest primary FIRST
                await ContactRepository.reattachSecondaries(other.id, oldestPrimary.id);
                // ② Only then demote 'other' itself
                await ContactRepository.demoteContact(other.id, oldestPrimary.id);
            }
        }

        // ── STEP 5: Check for new information ────────────────────────────────────
        const clusterContacts = await ContactRepository.findAllInCluster(oldestPrimary.id);

        if (_isNewInfo(email, phoneNumber, clusterContacts)) {
            await ContactRepository.createContact({
                email: email ?? null,
                phoneNumber: phoneNumber ?? null,
                linkedId: oldestPrimary.id,
                linkPrecedence: "secondary",
            });
        }

        // ── STEP 6: Return consolidated response ──────────────────────────────────
        return await _buildResponse(oldestPrimary.id);
    },

};

// ── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Resolves the root primary for any contact.
 * For a primary contact, returns itself.
 * For a secondary, fetches its parent from the DB.
 * DB invariant guarantees secondaries point directly to a primary (no chains),
 * so one DB hop is always sufficient.
 */
async function _resolvePrimary(contact: Contact): Promise<Contact> {
    if (contact.linkPrecedence === "primary") return contact;

    // contact is secondary → fetch its root primary by linkedId
    const parent = await ContactRepository.findById(contact.linkedId!);
    if (!parent) {
        // Data inconsistency guard: treat this contact as primary if parent missing
        return contact;
    }
    return parent;
}

/**
 * Returns true if the incoming (email, phoneNumber) pair introduces
 * information not already present in the cluster.
 *
 * Logic: iterate cluster contacts; if ANY contact "covers" both provided fields,
 * there is nothing new.
 * "Covers" means:
 *   - If email    was provided → contact.email    === email
 *   - If phone    was provided → contact.phone    === phone
 *   - If a field was NOT provided (null/undefined) → that field is ignored
 */
function _isNewInfo(
    email: string | null | undefined,
    phoneNumber: string | null | undefined,
    clusterContacts: Contact[]
): boolean {
    let emailExists = false;
    let phoneExists = false;

    for (const c of clusterContacts) {
        if (email && c.email === email) emailExists = true;
        if (phoneNumber && c.phoneNumber === phoneNumber) phoneExists = true;
    }

    const emailIsNew = email && !emailExists;
    const phoneIsNew = phoneNumber && !phoneExists;

    return Boolean(emailIsNew || phoneIsNew);
}

/**
 * Fetches the full cluster and assembles the standardised API response.
 */
async function _buildResponse(primaryId: number): Promise<ConsolidatedContact> {
    const all = await ContactRepository.findAllInCluster(primaryId);
    const primary = all.find((c) => c.id === primaryId)!;
    const secondaries = all.filter((c) => c.id !== primaryId);

    const emails = _deduplicate([primary.email, ...secondaries.map((c) => c.email)]);
    const phoneNumbers = _deduplicate([primary.phoneNumber, ...secondaries.map((c) => c.phoneNumber)]);

    return {
        primaryContatctId: primaryId,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaries.map((c) => c.id),
    };
}

function _deduplicate(values: (string | null | undefined)[]): string[] {
    const seen = new Set<string>();
    return values.filter((v): v is string => {
        if (!v || seen.has(v)) return false;
        seen.add(v);
        return true;
    });
}
