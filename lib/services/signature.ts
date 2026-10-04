import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { agreementText, hashAgreement } from "@/lib/signature-text";
import { buildAgreementFor } from "@/lib/services/agreement";
import { site } from "@/lib/site";

/* ===========================================================================
   E-signature, behind a driver.

   Two implementations of one interface:

     INTERNAL  — typed-name capture, live now. Records the signer's name, the
                 SHA-256 of the exact agreement text that was on screen, the
                 IP and the user agent.
     DOCUSIGN  — the real thing, once credentials exist. Its methods throw a
                 clear error rather than existing as silent no-ops, so a
                 half-configured deployment fails loudly at the point of use
                 instead of appearing to work.

   WHY HASH THE AGREEMENT TEXT
   ---------------------------
   "They signed" is worth nothing without "they signed THIS". If the MSA copy
   is edited after a signature, a stored hash is the only thing that shows the
   signed version differed — without it the record silently updates itself to
   whatever the current text happens to be, which is exactly the property a
   signature is supposed to prevent.

   WHY THE INTERNAL DRIVER IS NOT A TOY
   ------------------------------------
   A typed name is a valid electronic signature under E-SIGN/UETA when intent,
   attribution and record integrity are captured, which is what these columns
   are. It is still weaker than DocuSign's audit certificate, and the
   agreement page says so in as many words — see `INTERNAL_DISCLOSURE`.
   ========================================================================= */

export type SignatureRequest = {
  partnerId: string;
  signerName: string;
  signerEmail: string;
  /** The exact text the signer will see. Hashed, never paraphrased. */
  agreementText: string;
};

export type SignatureCapture = {
  envelopeId: string;
  typedName: string;
  agreementText: string;
  ip: string | null;
  userAgent: string | null;
};

export type SignatureDriverApi = {
  name: "INTERNAL" | "DOCUSIGN" | "SIGNEASY";
  /** Create the envelope and return its id. Does not send anything. */
  create(request: SignatureRequest): Promise<{ envelopeId: string }>;
  /** Where the signer goes to sign. */
  signingUrl(envelopeId: string): Promise<string>;
  /** Record a completed signature. Returns false if it was already signed. */
  complete(capture: SignatureCapture): Promise<boolean>;
};


/**
 * Shown above the signature box on the internal driver.
 *
 * Says plainly what is and is not being captured. A signature flow that
 * overstates itself is worse than one that is modest about it.
 */
export function internalDisclosure(
  documentLabel = "Master Service Agreement",
  buttonLabel = "Sign agreement"
): string {
  return `By typing your full legal name below and selecting "${buttonLabel}", you are signing this ${documentLabel} electronically. You agree that your electronic signature is the legal equivalent of your manual signature.

${site.name} records your name, the date and time, your IP address, and a cryptographic fingerprint of the exact text shown above. You may request a copy at any time.`;
}

/**
 * The MSA's disclosure.
 *
 * A change order passes its own label through `internalDisclosure` instead:
 * telling a verified partner they are "signing this Master Service Agreement"
 * when the screen above says Change Order 2 is the kind of mismatch that makes
 * a signature arguable, which is the one thing this paragraph exists to
 * prevent.
 */
export const INTERNAL_DISCLOSURE = internalDisclosure();

/* --- Internal ------------------------------------------------------------- */

const internalDriver: SignatureDriverApi = {
  name: "INTERNAL",

  async create({ partnerId, signerName, signerEmail, agreementText }) {
    const envelopeId = `int_${randomUUID()}`;

    await db.msaEnvelope.create({
      data: {
        partnerId,
        driver: "INTERNAL",
        envelopeId,
        status: "SENT",
        signerName,
        signerEmail,
        agreementHash: hashAgreement(agreementText),
        sentAt: new Date(),
      },
    });

    return { envelopeId };
  },

  async signingUrl() {
    // The internal driver signs in-app; there is no third-party URL to fetch.
    return "/portal/agreement";
  },

  async complete({ envelopeId, typedName, agreementText, ip, userAgent }) {
    const envelope = await db.msaEnvelope.findUnique({
      where: { envelopeId },
      select: { id: true, status: true, agreementHash: true },
    });

    if (!envelope) throw new SignatureError("That agreement could not be found.", 404);
    // Already signed: return false so the caller skips the transition rather
    // than attempting an invalid one. Double-submitting a form is ordinary.
    if (envelope.status === "COMPLETED") return false;

    const hash = hashAgreement(agreementText);
    if (envelope.agreementHash && envelope.agreementHash !== hash) {
      // The text changed between issue and signature. Refusing is the whole
      // point of storing the hash.
      throw new SignatureError(
        "The agreement has changed since it was sent to you. Please reload and read it again before signing.",
        409
      );
    }

    await db.msaEnvelope.update({
      where: { envelopeId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        signedName: typedName,
        agreementHash: hash,
        signedIp: ip,
        signedUserAgent: userAgent?.slice(0, 500) ?? null,
      },
    });

    return true;
  },
};

/* --- SignEasy ------------------------------------------------------------- */

/**
 * SignEasy.
 *
 * The template is already tagged with `\c_sig\`, `\c_date\`, `\m_sig\` and
 * the rest — SignEasy's own text-tag convention — so the file we render for a
 * partner is the file that goes to it. No second layout, no coordinate map
 * maintained in two places, and the tags we do NOT fill are exactly the ones
 * it is meant to turn into fields.
 *
 * Unimplemented methods throw a readable error rather than existing as silent
 * no-ops, for the same reason DocuSign's do: a half-configured deployment
 * should fail at the point of use instead of appearing to work.
 */
/**
 * The REST surface, in one place.
 *
 * Isolated deliberately: these four paths are the ONLY part of this driver
 * that depends on SignEasy's current API shape, and the shape of a vendor API
 * is the thing most likely to have moved since this was written. Correcting
 * them is one edit here rather than a search through the methods below.
 */
const SIGNEASY_ROUTES = {
  upload: "/files",
  request: "/signature-requests",
  embedded: (id: string) => `/signature-requests/${id}/embedded-url`,
  status: (id: string) => `/signature-requests/${id}`,
};

async function signeasyFetch(path: string, init: RequestInit) {
  if (!env.SIGNEASY_API_KEY) {
    throw notConfiguredFor("SignEasy", "this call", "SIGNEASY_API_KEY");
  }

  const response = await fetch(`${env.SIGNEASY_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${env.SIGNEASY_API_KEY}`,
      ...(env.SIGNEASY_CLIENT_ID ? { "x-client-id": env.SIGNEASY_CLIENT_ID } : {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new SignatureError(
      `SignEasy returned ${response.status} for ${path}. ${detail.slice(0, 300)}`,
      502
    );
  }

  return response.json();
}

const signeasyDriver: SignatureDriverApi = {
  name: "SIGNEASY",

  /**
   * Upload the partner's own agreement and put it out for signature.
   *
   * The document sent is the one `buildAgreementFor` renders — their schedule,
   * their Exhibit C, their tags — NOT a stored SignEasy template. A template
   * would be a second copy of an agreement that is already per-partner, and
   * the two would drift the first time a price changed.
   *
   * No text-tag coordinates are sent. The template already carries `\c_sig\`,
   * `\c_date\`, `\c_name\` and `\c_title\`, which is SignEasy's own
   * convention, and `stampSignature` leaves them untouched on an unsigned
   * document for exactly this reason.
   */
  async create({ partnerId, signerName, signerEmail, agreementText }) {
    const document = await buildAgreementFor(partnerId);
    if (!document) throw new SignatureError("That partner could not be found.", 404);

    const form = new FormData();
    form.append("file", new Blob([document.bytes as BufferSource], { type: "application/pdf" }), document.filename);

    const uploaded = (await signeasyFetch(SIGNEASY_ROUTES.upload, {
      method: "POST",
      body: form,
    })) as { id: string };

    const created = (await signeasyFetch(SIGNEASY_ROUTES.request, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        file_id: uploaded.id,
        subject: `${site.name} — Master Service Agreement`,
        message: "Your Master Service Agreement is ready to sign.",
        // Embedded, so the signer never leaves the portal.
        embedded: true,
        use_text_tags: true,
        signers: [{ name: signerName, email: signerEmail, order: 1 }],
      }),
    })) as { id: string };

    await db.msaEnvelope.create({
      data: {
        partnerId,
        driver: "SIGNEASY",
        envelopeId: created.id,
        status: "SENT",
        signerName,
        signerEmail,
        // Stored for the same reason the internal driver stores it: it is what
        // makes "they signed THIS" checkable if the agreement text ever moves.
        agreementHash: hashAgreement(agreementText),
        sentAt: new Date(),
      },
    });

    return { envelopeId: created.id };
  },

  async signingUrl(envelopeId) {
    const json = (await signeasyFetch(SIGNEASY_ROUTES.embedded(envelopeId), {
      method: "GET",
    })) as { url?: string; embedded_url?: string };

    const url = json.url ?? json.embedded_url;
    if (!url) {
      throw new SignatureError("SignEasy did not return a signing URL for that envelope.", 502);
    }
    return url;
  },

  /**
   * Record a completed signature.
   *
   * Called from the webhook, never from a form. The agreement hash is NOT
   * re-derived from a posted body — SignEasy holds the signed artifact, and
   * what is stored here is the fingerprint captured at send time plus their
   * completion. Re-hashing an attacker-supplied string would defeat the check
   * the hash exists to make.
   */
  async complete({ envelopeId, typedName, ip, userAgent }) {
    const envelope = await db.msaEnvelope.findUnique({
      where: { envelopeId },
      select: { id: true, status: true },
    });

    if (!envelope) throw new SignatureError("That agreement could not be found.", 404);
    if (envelope.status === "COMPLETED") return false;

    await db.msaEnvelope.update({
      where: { envelopeId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        signedName: typedName,
        signedIp: ip,
        signedUserAgent: userAgent?.slice(0, 500) ?? null,
      },
    });

    return true;
  },
};

/* --- DocuSign ------------------------------------------------------------- */

const notConfiguredFor = (provider: string, method: string, needs: string) =>
  new SignatureError(
    `${provider} is selected but not configured — ${method} needs ${needs}. ` +
      `Set SIGNATURE_DRIVER=internal to sign in the portal instead.`,
    500
  );

const notConfigured = (method: string) =>
  notConfiguredFor(
    "DocuSign",
    method,
    "an integration key, RSA key, account id and template id"
  );

const docusignDriver: SignatureDriverApi = {
  name: "DOCUSIGN",
  async create() {
    throw notConfigured("envelope creation");
  },
  async signingUrl() {
    throw notConfigured("embedded signing");
  },
  async complete() {
    throw notConfigured("completion");
  },
};

export class SignatureError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number
  ) {
    super(message);
    this.name = "SignatureError";
  }
}

const DRIVERS: Record<string, SignatureDriverApi> = {
  docusign: docusignDriver,
  signeasy: signeasyDriver,
  internal: internalDriver,
};

export const signature: SignatureDriverApi =
  DRIVERS[env.SIGNATURE_DRIVER] ?? internalDriver;

/* --- The agreement -------------------------------------------------------- */

/* Text and hashing live in lib/signature-text.ts so the seed and the tests can
   produce the same fingerprint this file verifies against. */
export { agreementText, hashAgreement };
