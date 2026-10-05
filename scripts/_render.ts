import { writeFile } from "node:fs/promises";
import { buildMsaPdf } from "@/lib/services/msa-pdf";

async function main(){
const bytes = await buildMsaPdf({
  companyName: "Gulfside Wellness Group LLC",
  fields: {
    legalName: "Gulfside Wellness Group LLC",
    entityType: "Florida limited liability company",
    address: "1200 Beach Blvd, Suite 210, Clearwater, FL 33755",
    contact: "Dana Whitfield, Managing Partner",
    email: "dana@gulfsidewellness.com",
    phone: "(727) 555-0142",
  },
  lines: [
    { name: "Semaglutide", strength: "2.5 mg/ml", form: "Injectable", packageSize: "3 ml",
      listPrice: "249.00", discountPercent: "12.00", finalPrice: "219.12", unit: "vial" },
    { name: "Tirzepatide", strength: "10 mg/ml", form: "Injectable", packageSize: "2 ml",
      listPrice: "389.00", discountPercent: null, finalPrice: "389.00", unit: "vial" },
  ],
  profile: {
    tradingName: "Gulfside Wellness",
    businessType: "Telehealth practice",
    businessAddress: "1200 Beach Blvd, Suite 210, Clearwater, FL 33755",
    billingAddress: null,
    statesOfOperation: ["FL", "GA", "AL", "SC", "TN"],
    accountType: "New account",
    medicraftRep: "J. Ortiz",
    howHeard: "Referred by another practice in Tampa",
    signer: { name: "Dana Whitfield", title: "Managing Partner", email: "dana@gulfsidewellness.com" },
    prescribers: [
      { name: "Dr. Alice Moreau, DO", deaLast4: "4563", deaExpiration: "03-04-2027", npiLast4: "7893", stateLicenseLast4: "2210" },
      { name: "Priya Raman, APRN", deaLast4: null, deaExpiration: null, npiLast4: "4412", stateLicenseLast4: "8891" },
    ],
    licenses: [
      { type: "Pharmacy licence", state: "FL", numberLast4: "9023", expiresAt: "06-30-2027" },
      { type: "Certificate of insurance", state: null, numberLast4: "1180", expiresAt: "01-15-2027" },
    ],
  },
  signature: {
    signedName: "Dana Whitfield",
    signedTitle: "Managing Partner",
    signedAt: new Date("2026-10-03T12:00:00Z"),
    agreementHash: "9f2c1b7ae4d5c6f80a13b2e7d4c5968f1a2b3c4d5e6f708192a3b4c5d6e7f801",
    ip: "198.51.100.24",
  },
});

const out = process.argv[2]!;
await writeFile(out, bytes);
console.log(`wrote ${out} — ${(bytes.length / 1024).toFixed(0)} kB`);
}
main();
