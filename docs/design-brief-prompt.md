# Design brief — copy everything below this line into a new Claude chat

---

You are a senior product designer. I want you to redesign a website. Read all
of this before proposing anything, then show me a design direction before you
write any code.

## What the business actually is

**MediCraft Pharmacy** — a 503A sterile and non-sterile compounding pharmacy at
12320 Race Track Rd, Tampa, Florida. Phone (727) 309-6666.

A 503A pharmacy compounds **patient-specific** medications against a
prescription from a named prescriber. It is not a manufacturer and not a
retailer. Nothing can be bought on the site. Every preparation requires a valid
prescription.

Positioning line the owner uses: **"Wellness Is Crafted, Not Manufactured."**

Licensed in Florida today, working toward licensure in all 49 eligible states.
PCAB accreditation is **in progress, not held** — the site must never imply
otherwise.

## Who it is for — two different audiences on one domain

**1. Prescribers and their practice staff (the real customer).** Doctors, PAs,
nurse practitioners and practice managers deciding whether to trust a compounder
with their patients' prescriptions. They are clinical, sceptical, time-poor, and
usually on a desktop between appointments. They are not shopping. They are
assessing risk. What persuades them is evidence: USP <797> and <795>
compliance, third-party potency and sterility testing, beyond-use dating,
chain-of-custody, and who to call when something is wrong.

**2. Patients.** They arrive only to request a refill. They never see pricing
and never order directly.

## The three parts of the product

**A. Public marketing site (~24 pages).** Home, about, compounding, quality,
for-providers, licences, products (a 692-item formulary in 10 categories:
Weight Management, HRT, TRT, Sexual Health, Wellness, Supplies, Skin Care, Hair
Loss, Pain Management), individual product pages, a blog, contact, careers,
patient refill, and legal pages.

**B. Partner portal (~10 pages).** Where a practice becomes an account. A strict
five-stage pipeline: **Application → Pricing → Onboarding → Agreement →
Verified.** The practice uploads a photo ID, picks the medications it
dispenses, negotiates a price schedule, fills in prescriber DEA/NPI details and
billing, then signs a Master Service Agreement with their agreed prices bound in
as Exhibit A-1. Each stage gates the next.

**C. Admin console (~14 pages).** Staff move applications through that pipeline,
price formularies, review documents, manage the catalogue and the blog, and read
an audit log. It is a working tool used all day, not a showcase.

## The brand — keep these exactly, they are matched to printed identity

```
Brand blue   #1b54fb   the "M" mortar in the logo
Pestle cyan  #23dce1   accent only; too bright for text on white
Brand navy   #0d193e   dark grounds
```

Typeface is **Satoshi** (the identity face — the logo lockup is Satoshi Black
over Satoshi Regular), with IBM Plex Mono for data and figures. Both are
self-hosted. There is **no dark mode** and I don't want one.

Current type scale: display 2.875rem / 2.25rem, intro 1.25rem, body 1rem,
meta 0.875rem, caption 0.75rem.

## What I don't like about the current design

It is correct and competent and **boring**. It reads as a template: white
sections alternating with a pale blue tint, a hero with a product shot on the
right, rows of icon-and-paragraph claims, and a navy band near the bottom.
Nothing about it looks like a precision compounding lab. It could be any B2B
SaaS company.

I want **modern** — but modern for a pharmacy that prescribers are trusting with
patient safety, not modern like a crypto startup. Credible and confident. If a
prescriber lands on it, it should feel like a serious clinical operation, not a
marketing page about one.

## What I want from you

1. **Ask me anything you need first.** Do not start designing if something is
   unclear.
2. Then give me **two or three distinct visual directions** — not variations of
   one idea. For each: the concept in a sentence, a colour and type treatment
   built on the brand above, what the home page hero does, and why it suits a
   compounding pharmacy specifically.
3. Show me layouts as **ASCII wireframes or described structure first**. I want
   to pick a direction before anyone writes CSS.
4. Once I pick one, build it.

## Hard constraints — a design that breaks these is unusable to me

- **Next.js 14 App Router, TypeScript, Tailwind, PostgreSQL.** Pages are Server
  Components; only interactive leaves are `"use client"`.
- **SEO is critical.** All real content — headings, product names, descriptions,
  CTA text — must be plain text in the server-rendered HTML. Never text that
  only appears after a client effect, and never text inside canvas or SVG.
- **No heavy graphics.** No three.js, no WebGL, no canvas backgrounds, no
  particle effects. Animation is transform and opacity only, 150–300ms, and must
  respect `prefers-reduced-motion`.
- **Accessibility AA.** Keyboard navigable, visible focus states, one `h1` per
  page, logical heading order, real alt text, 4.5:1 contrast for body text.
  Note that the cyan only clears contrast on white at its darkened step.
- **Mobile first.** A practice manager will open this on a phone.
- **One component system.** The marketing site, the portal and the admin console
  share one set of primitives. Do not design three unrelated looks.
- **Honesty is a design constraint.** This is a regulated pharmacy. Do not
  invent statistics, testimonials, prescriber names, accreditations or
  certifications to fill a layout. If a section needs a number I do not have,
  tell me and I will get a real one or we cut the section.

## What would genuinely impress me

Something that uses the subject matter. This is a lab where sterile
preparations are compounded under USP standards, tested by third parties, and
shipped cold. There is real visual vocabulary in that — labels, lot numbers,
beyond-use dates, certificates of analysis, the specific blue of the vial cap —
and none of it is being used. Show me a design that could only be this pharmacy.

---
