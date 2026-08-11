import type { IconName } from "@/components/icons/set";

/* ===========================================================================
   MediCraft — site copy.

   Every string in this file is the pharmacy owner's own writing, transcribed
   from the identity document he supplied ("medicraft-identity 5.html"). It is
   kept in one place, separate from the components that render it, so the copy
   can be revised without touching layout — and so it is obvious at a glance
   what is his voice and what is scaffolding.

   Two editorial rules are enforced throughout and must not be relaxed:

   1. PCAB accreditation and LegitScript certification are IN PROGRESS, not
      held. His copy is scrupulous about this ("MediCraft has not yet received
      PCAB accreditation"). Never render them as awarded.
   2. Licensure is Florida only today, with 49 states as the goal. Coverage
      copy says "currently licensed in Florida", never "licensed nationwide".
   ========================================================================= */

/* ---------------------------------------------------------------------------
   Hero + trust bar
--------------------------------------------------------------------------- */

export const hero = {
  badge: "10+ Years Executive Experience · Palm Harbor, FL · PCAB In Progress",
  /** The emphasised word is set apart so the hero can colour it. */
  headline: { before: "Wellness Is ", accent: "Crafted", after: ", Not Manufactured." },
  lead: "MediCraft Pharmacy delivers precision compounding solutions tailored to every patient's unique biology. Based in Palm Harbor, Florida, we partner with providers nationwide to move medicine beyond the mass-manufactured standard model.",
  actions: {
    primary: { label: "Open a Provider Account", href: "/providers" },
    secondary: { label: "Learn About Compounding", href: "/compounding" },
  },
  /**
   * The hero's four figures, set as a specification plate rather than a stat
   * row. His values are unchanged; each of his labels is split into the field
   * name that heads the column and the note that qualifies the value.
   *
   * The licensure note says "Florida licensed today" on purpose: "49" on its
   * own would read as 49 states served, which is the goal and not the fact.
   */
  spec: {
    docLabel: "Quality specification",
    docMeta: "MediCraft · Palm Harbor, FL",
    fields: [
      {
        field: "Quality engineering",
        value: "10+",
        note: "Years across 503A, 503B and cGMP",
      },
      {
        field: "Licensure",
        value: "49",
        note: "State target — Florida licensed today",
      },
      {
        field: "Scope",
        value: "503A",
        note: "Patient-specific compounding",
      },
      {
        field: "Standards",
        value: "USP",
        note: "795 · 797 · 800 compliant",
      },
    ],
  },
};

export const trustBar = [
  { icon: "hourglass" as IconName, label: "PCAB Accreditation In Progress" },
  { icon: "flask" as IconName, label: "USP 795/797/800 Compliant" },
  { icon: "microscope" as IconName, label: "ISO Class Cleanrooms" },
  { icon: "camera" as IconName, label: "Video-Verified Fulfillment" },
  { icon: "clipboard" as IconName, label: "FDA-Registered Third-Party Testing" },
  { icon: "truck" as IconName, label: "Nationwide Shipping" },
];

/* ---------------------------------------------------------------------------
   About
--------------------------------------------------------------------------- */

export const about = {
  intro: {
    eyebrow: "Who We Are",
    title: "Precision Compounding, Built Around the Patient",
    body: [
      "MediCraft Pharmacy was established as an LLC in 2025 and opened its doors to patients and providers in 2026 — built from the ground up on a simple but powerful belief: every patient deserves medication that works for their body, not around it. We are a 503A compounding pharmacy serving patients and providers across the country with clinically rigorous, individually tailored formulations.",
      "Where traditional pharmacies dispense — we craft. Every compound we produce is designed in collaboration with the prescribing provider, formulated in our state-of-the-art cleanrooms, and tested to exceed federal quality standards before it reaches your patient.",
    ],
    checks: [
      "PCAB Accreditation In Progress — USP 795/797/800 Compliant",
      "503A patient-specific compounding",
      "Dedicated clinical support team for providers",
      "Third-party testing on every batch",
      "Working toward licensure in all 49 states for nationwide reach",
    ],
  },

  panel: {
    badge: "10+ Years Executive Experience · Palm Harbor, FL",
    title: "More Than a Pharmacy. A Clinical Partner.",
    body: "Our team of pharmacists, chemists, and compounding specialists work alongside your practice to deliver formulations you can trust and patients can feel.",
    metrics: [
      { value: "10+", label: "Yrs QA Engineering" },
      { value: "49", label: "States — Licensure Target" },
      { value: "100%", label: "Third-party tested" },
      { value: "24h", label: "Provider support" },
    ],
  },

  journey: {
    eyebrow: "Our Journey",
    title: "Building a Pharmacy That Puts Patients First",
    /** A genuine sequence — order carries information, so it is numbered by year. */
    timeline: [
      {
        year: "2025",
        title: "MediCraft LLC Established — Palm Harbor, FL",
        body: "MediCraft is incorporated with a clear mission: precision-compounded medications built on a quality engineering foundation spanning 503A, 503B, and cGMP environments. Quality systems, SOPs, and facility infrastructure are built and validated before the pharmacy opens its doors.",
      },
      {
        year: "2026",
        title: "Pharmacy Opens — Built Right from Day One",
        body: "MediCraft officially opens as a licensed 503A compounding pharmacy in Palm Harbor, FL — operating from a facility previously home to one of the largest oncology infusion pharmacies in the nation, with USP 795/797/800 compliant processes, a full quality leadership team, and a proven infrastructure already in place.",
      },
      {
        year: "2026",
        title: "PCAB Accreditation & 49-State Expansion Underway",
        body: "MediCraft formally initiates the PCAB accreditation process and begins pursuing licensure across all 49 eligible states — two milestones that reflect the quality and reach we have been building toward since the LLC was founded.",
      },
      {
        year: "2027",
        title: "Sterile Lab Expansion Goes Live",
        body: "MediCraft's dedicated sterile compounding labs reach full operational capacity — expanding USP 797/800 compliant sterile preparations and broadening the formulary available to providers and patients nationwide.",
      },
      {
        year: "Beyond",
        title: "Crafting the Future of Precision Medicine",
        body: "With PCAB accreditation secured, 49-state licensure underway, and sterile labs fully operational — MediCraft is building the compounding pharmacy of the future, one patient at a time.",
      },
    ],
  },

  principles: [
    {
      icon: "target" as IconName,
      tone: "blue" as const,
      title: "Our Mission",
      body: "To make precision medicine accessible to every patient by empowering providers with the highest-quality compounded formulations, delivered with clinical expertise and unwavering quality.",
    },
    {
      icon: "eye" as IconName,
      tone: "cyan" as const,
      title: "Our Vision",
      body: "A healthcare landscape where every prescription is a starting point — not a ceiling. We envision a future where individualized medicine is the standard, not the exception.",
    },
    {
      icon: "compass" as IconName,
      tone: "navy" as const,
      title: "Our Values",
      body: "Precision over convenience. Transparency over assumptions. Patient outcomes over volume. These aren't slogans — they're the principles behind every compound we produce.",
    },
  ],

  foundation: {
    eyebrow: "A Foundation Built on Quality",
    title: "A Leadership Team Built Across Every Level of Pharmaceutical Quality",
    body: [
      "MediCraft was built from the ground up by a team with something rare in compounding: over a decade of hands-on quality engineering experience spanning 503A compounding pharmacies, 503B outsourcing facilities, and full cGMP pharmaceutical manufacturing environments. That is the full spectrum of pharmaceutical quality rigor — and most compounding pharmacies have never operated inside even one of those environments at an engineering level.",
      "That means MediCraft's quality systems were not designed by people learning on the job. They were engineered by professionals who have spent years building, auditing, and enforcing quality systems at the highest levels of the industry — and who apply that same discipline to every SOP, every process, and every batch we produce.",
    ],
    specs: [
      {
        mark: "503A",
        title: "503A Compounding — Hands-On Experience",
        body: "Patient-specific compounding quality systems, USP compliance, and state pharmacy board standards",
      },
      {
        mark: "cGMP",
        title: "cGMP-Inspired Quality Practices",
        body: "We apply cGMP best practices within our 503A environment — bringing pharmaceutical-grade rigor to every SOP, batch record, and quality system we run",
      },
      {
        mark: "QE",
        title: "Quality Engineering Mindset — Applied to MediCraft",
        body: "Systems designed before they were required. SOPs built to hold up under scrutiny across all three regulatory environments",
      },
    ],
  },

  facility: {
    eyebrow: "Our Facility",
    title:
      "Operating From Infrastructure Built for the Most Demanding Compounding in Medicine",
    body: [
      "MediCraft is housed in a facility with a remarkable history. This space was formerly home to what was once recognized as one of the largest oncology infusion pharmacies in the nation — a high-complexity sterile compounding operation that served some of the most critical patient populations in the country — at a scale and standard of care that demanded pharmaceutical-grade infrastructure.",
      "Oncology infusion is widely considered the most exacting form of sterile pharmaceutical compounding. The infrastructure required to operate at that scale and that standard of care — cleanrooms, HVAC systems, utility architecture, cold storage, environmental controls — was engineered and built accordingly.",
      "When MediCraft moved in, we did not inherit a generic commercial space. We inherited the bones of a world-class sterile compounding facility — and we are building MediCraft's future on top of them.",
    ],
    checks: [
      "Facility engineered for one of the highest-volume oncology infusion operations in the nation",
      "Infrastructure designed for high-volume, high-complexity sterile compounding",
      "Cleanroom architecture built to oncology-grade standards — the most demanding in the field",
      "Cold storage, HVAC, and utility systems engineered for pharmaceutical-grade operations",
      "MediCraft continues to operate and upgrade this infrastructure to serve its growing compounding mission",
    ],
    panel: {
      badge: "Facility Heritage",
      title: "When the Building Has Already Proven Itself",
      body: "Most compounding pharmacies start from a blank slate and work up to the infrastructure they need. MediCraft started from infrastructure that was already built to handle the hardest compounding work in medicine — and we are using that advantage to deliver a level of quality that most pharmacies our size simply cannot offer.",
      note: "That legacy of clinical rigor and operational scale now forms the foundation of MediCraft's mission: precision compounding, crafted for every patient.",
      metrics: [
        { value: "Oncology", label: "Grade cleanroom infrastructure" },
        { value: "Inherited", label: "HVAC, utilities & cold storage" },
      ],
    },
  },
};

/* ---------------------------------------------------------------------------
   Quality
--------------------------------------------------------------------------- */

export const quality = {
  banner: {
    eyebrow: "Quality Commitment",
    title: "Quality Is Built Into Our DNA — Not Added at the End",
    body: "At MediCraft, quality is not a department — it's the operating philosophy of every person in our building. We've assembled a leadership team whose combined experience in pharmacy regulation, compliance, and formulation science gives us a foundation that most compounding pharmacies spend years trying to build.",
    specs: [
      {
        mark: "PCAB",
        title: "PCAB Accreditation — Actively In Progress",
        body: "We are currently working through the formal PCAB accreditation process. Our SOPs, cleanroom practices, and quality systems are already built to PCAB standards — accreditation is the formal recognition of work we are doing every day.",
      },
      {
        mark: "USP",
        title: "USP 795 · 797 · 800 Compliance",
        body: "Non-sterile compounds (795) · Sterile compounds (797) · Hazardous drug handling (800)",
      },
      {
        mark: "ISO",
        title: "ISO Class Cleanrooms",
        body: "Controlled environments with automated cleaning and environmental monitoring",
      },
      {
        mark: "LS",
        title: "LegitScript Certification — In Progress",
        body: "Pursuing recognized e-commerce compliance certification",
      },
    ],
  },

  facilityCallout: {
    icon: "building" as IconName,
    title: "Infrastructure Built for Oncology-Grade Sterile Compounding",
    body: "MediCraft operates from a facility that previously supported one of the largest oncology infusion pharmacies in the nation — an operation recognized as one of the nation's largest oncology infusion pharmacies. The physical infrastructure — cleanrooms, HVAC, environmental controls, cold storage — was engineered for the most demanding form of sterile pharmaceutical compounding that exists. That is the foundation MediCraft is built on.",
  },

  leadership: {
    eyebrow: "The People Behind the Quality",
    title: "A Leadership Team Built for the Highest Standard",
    lead: "Our quality infrastructure wasn't designed by consultants — it was built by people who have spent careers setting the rules others follow. Every SOP, every protocol, every quality checkpoint at MediCraft traces back to this team.",
    team: [
      {
        icon: "institution" as IconName,
        tone: "blue" as const,
        title: "Ex–Board of Pharmacy Inspector",
        body: "Our Quality Partner spent years as an official Board of Pharmacy inspector — the same role responsible for auditing and enforcing compliance at pharmacies across the state. He now brings that regulatory perspective inside our walls, helping us build SOPs that don't just meet inspection standards — they reflect how inspectors think.",
        credential: "SOP Architecture · Regulatory Preparedness · Compliance Auditing",
      },
      {
        icon: "ruler" as IconName,
        tone: "cyan" as const,
        title: "Director of Quality & Compliance Officer",
        body: "Our Director of Quality oversees every standard operating procedure from cleanroom entry protocols to batch release criteria. As our internal Compliance Officer, they ensure every process — from raw material receiving to patient shipment — is documented, defensible, and consistently executed to the letter.",
        credential: "SOP Management · Batch Oversight · Regulatory Compliance",
      },
      {
        icon: "flask" as IconName,
        tone: "navy" as const,
        title: "Formulation Expert",
        body: "Formulation is a science, not a template. Our in-house Formulation Expert brings deep pharmaceutical chemistry expertise to every compound we develop — evaluating excipient compatibility, delivery mechanism optimization, stability data, and beyond-use dating with the rigor of a research laboratory.",
        credential: "Formula Development · Stability Analysis · Excipient Science",
      },
      {
        icon: "factory" as IconName,
        tone: "blue" as const,
        title: "Senior Production Engineer — Big Pharma Background",
        body: "Most compounding pharmacies have never had a production engineer on their team. MediCraft does. Our Senior Production Engineer comes from one of the largest pharmaceutical manufacturing companies in the world — bringing large-scale GMP production experience, process automation expertise, and a manufacturing mindset that most pharmacies our size simply don't have access to. They are responsible for engineering the production workflows, equipment validation, and process controls that ensure every batch is produced consistently, efficiently, and to the highest possible standard.",
        credential:
          "GMP Production · Process Automation · Equipment Validation · Manufacturing Quality · Batch Process Engineering",
      },
      {
        icon: "graduation" as IconName,
        tone: "blue" as const,
        title:
          "Lead Pharmacist & Formulation Expert — Quality Engineering Background",
        body: "At the clinical and scientific core of MediCraft is a licensed pharmacist who is also a trained formulation expert with deep roots in quality engineering and pharmaceutical production. This isn't a background built in a single setting — it spans 503A compounding, 503B outsourcing, and cGMP manufacturing environments, giving MediCraft's formulation and quality leadership a perspective that most compounding pharmacies can't replicate. Every compound we produce, every SOP we follow, and every quality decision we make reflects that multi-disciplinary foundation.",
        credential:
          "Licensed Pharmacist · Formulation Science · Quality Engineering · 503A · 503B · cGMP · Production Background",
      },
      {
        icon: "terminal" as IconName,
        tone: "cyan" as const,
        title: "Chief Technology Officer & API Integration Specialist",
        body: "Technology should remove friction, not create it. Our CTO is also a seasoned API specialist with the capability to integrate MediCraft's systems with virtually any practice management software, pharmacy platform, or EMR/EHR system on the market. Whether your practice runs on Epic, Athenahealth, DrChrono, or a custom system — our CTO can build the connection and make the data flow seamlessly. From provider onboarding to real-time prescription tracking to automated refill workflows, every touchpoint is engineered to work within the tools your team already uses.",
        credential:
          "EMR/EHR Integration · API Development · Provider Onboarding · Order Workflow · Software Interoperability",
      },
    ],
  },

  sops: {
    eyebrow: "SOPs & Accreditation",
    title: "Written by Regulators. Executed by Pharmacists.",
    body: [
      "Standard Operating Procedures at MediCraft were not purchased from a template library. They were written from the ground up by a team that includes a former Board of Pharmacy inspector — someone who has personally evaluated SOP systems at dozens of pharmacies across the state.",
      "Every SOP reflects not just what the rules require, but what an inspector looks for, what failure modes look like, and how to build systems that hold up under the most rigorous scrutiny. We are currently working through the formal PCAB accreditation submission process. MediCraft has not yet received PCAB accreditation — but our SOP library, quality team, and cleanroom practices are already written and operating to that standard. Accreditation is the formal recognition of a quality system we are already running.",
    ],
    checks: [
      "Full SOP library spanning compounding, cleaning, QA, and dispensing",
      "Written with active input from ex–Board of Pharmacy inspector",
      "Reviewed and updated quarterly by our Compliance Officer",
      "PCAB-aligned protocols ahead of formal accreditation submission",
      "Every staff member trained and documented on applicable SOPs",
    ],
    panel: {
      badge: "Accreditation Roadmap",
      title: "On the Path to PCAB & LegitScript",
      body: "We believe transparency about where we are matters as much as where we're going. MediCraft is actively pursuing both PCAB accreditation and LegitScript certification — two of the most recognized marks of pharmacy quality and legitimacy in the industry.",
      note: "Our SOPs, cleanroom practices, and quality team are already built to those standards. Accreditation is the formal recognition of work we're already doing every day.",
      cta: { label: "Contact Us About Quality", href: "/contact" },
    },
  },

  automation: {
    eyebrow: "Facility & Automation",
    title: "Automated Where It Matters Most",
    lead: "Human attention is essential in compounding — but so is eliminating human error from repeatable mechanical tasks. MediCraft has invested in facility automation that protects product integrity, ensures consistency across every batch, and documents every order on camera before it leaves the building.",
    items: [
      {
        icon: "cycle" as IconName,
        tone: "blue" as const,
        title: "Automated Cleanroom Cleaning Systems",
        body: "Our cleanrooms are equipped with automated surface cleaning equipment that executes validated cleaning cycles with consistent chemical coverage and contact times — eliminating variability in one of the most compliance-critical tasks in sterile compounding. Every cycle is logged, timestamped, and available for audit.",
      },
      {
        icon: "gear" as IconName,
        tone: "navy" as const,
        title: "Automated Vial Crimping Machines",
        body: "Every injectable vial produced at MediCraft is sealed with a validated automated crimping machine — not by hand. This ensures consistent, uniform crimp quality across every vial in every batch, eliminating the risk of improper seals that can compromise sterility and product integrity.",
      },
      {
        icon: "sensor" as IconName,
        tone: "cyan" as const,
        title: "Environmental Monitoring Technology",
        body: "Our ISO-classified cleanrooms are continuously monitored with automated environmental control systems tracking air particulate counts, temperature, humidity, and pressure differentials in real time — with alarm thresholds that trigger immediate review before any product is affected.",
      },
      {
        icon: "camera" as IconName,
        tone: "blue" as const,
        title: "Video-Verified Fulfillment",
        body: "Every order is filmed during pick, pack, and seal — before the package ever leaves our premises. The footage is matched to the prescription number and archived alongside the shipping record, so what went into the box is documented, not assumed.",
      },
    ],
  },

  custody: {
    panel: {
      badge: "Chain of Custody",
      title: "Every Package Filmed. Every Shipment Tracked.",
      body: "Most pharmacies can tell you a package shipped. We can show you exactly what was in it. Every MediCraft order is recorded on camera through the entire fulfillment sequence — from the moment the prescription is pulled to the moment the box is sealed — and every shipment carries end-to-end tracking from our door to the patient's. If a provider or patient ever asks what happened to an order, we don't reconstruct it from memory. We pull the file.",
      metrics: [
        { value: "100%", label: "Orders filmed before shipping" },
        { value: "100%", label: "Shipments tracked door to door" },
        { value: "Rx#", label: "Footage matched to prescription" },
        { value: "On File", label: "Retained & retrievable on request" },
      ],
    },
    recorded: {
      title: "What Gets Recorded",
      lead: "Four checkpoints, captured on every single order — no sampling, no exceptions.",
      /** A real sequence: pick → pack → seal → hand-off. Numbering is meaningful. */
      steps: [
        {
          icon: "clipboard" as IconName,
          title: "Pick & Verify",
          body: "The finished product is pulled against the prescription on camera, with lot and beyond-use date visible in frame.",
        },
        {
          icon: "box" as IconName,
          title: "Pack & Protect",
          body: "Contents, quantity, ancillary supplies, and cold-chain packaging are filmed as they go into the box.",
        },
        {
          icon: "shield" as IconName,
          title: "Seal & Label",
          body: "The carton is sealed and the shipping label applied on camera, tying the recording to a specific tracking number.",
        },
        {
          icon: "truck" as IconName,
          title: "Hand-Off & Track",
          body: "Carrier pickup is logged and tracking goes live — visible to the provider in the portal from that moment forward.",
        },
      ],
    },
    why: {
      title: "Why It Matters",
      lead: "Disputes over what shipped, what was missing, or what arrived damaged are one of the most common friction points between a pharmacy and a practice. Documentation resolves them in minutes instead of days.",
      checks: [
        'Resolves "wrong item" and "missing item" claims with recorded evidence, not recollection',
        "Distinguishes fulfillment errors from carrier damage and loss in transit",
        "Confirms cold-chain packaging was applied correctly before dispatch",
        "Supports investigation of any adverse event or product complaint after the fact",
        "Strengthens recall readiness — every shipped unit ties back to a lot and a recording",
        "Footage available to prescribers on request for any order we fulfilled",
      ],
      callout:
        "Tracking is live in the Provider Portal the moment a label is generated. Fulfillment footage for any order is available on request through your account representative.",
      calloutLabel: "Provider access.",
    },
  },

  sourcing: {
    eyebrow: "API & Raw Material Sourcing",
    title: "We Don't Just Buy Ingredients — We Vet Them",
    lead: "The quality of a compound begins long before it enters our cleanroom. Our raw material qualification process is one of the most rigorous in the compounding industry — because we know that what goes in determines what comes out.",
    /** Sequential by design — each gate must pass before the next. */
    steps: [
      {
        icon: "institution" as IconName,
        title: "Supplier Qualification",
        body: "Every API and raw material supplier must pass our internal vendor qualification process before a single ingredient is purchased — including review of FDA registration, quality agreements, and facility audit status.",
      },
      {
        icon: "document" as IconName,
        title: "Certificate of Analysis Review",
        body: "Every incoming lot is accompanied by a full Certificate of Analysis from the manufacturer, reviewed by our pharmacist and quality team against established specifications before acceptance.",
      },
      {
        icon: "microscope" as IconName,
        title: "Identity Testing on Receipt",
        body: "We do not accept vendor documentation at face value. Every raw material is identity-tested upon receipt using validated analytical methods to confirm it is exactly what it claims to be.",
      },
      {
        icon: "chart" as IconName,
        title: "Potency & Purity Verification",
        body: "Beyond identity, we verify potency and purity through independent, FDA-registered third-party laboratory testing before any ingredient is cleared for use in patient compounds.",
      },
    ],
    aside: {
      title: "FDA-Registered Sources Only",
      body: [
        "MediCraft sources all Active Pharmaceutical Ingredients (APIs) and excipients exclusively from FDA-registered manufacturers and distributors. We do not accept raw materials from unverified or overseas sources without validated documentation and independent testing.",
        "Our Formulation Expert evaluates each supplier on an ongoing basis — reviewing stability data, manufacturing history, and any FDA warning letters or recalls. When a supplier's quality record raises a question, we find a better one before it ever becomes a patient safety issue.",
      ],
      checks: [
        "FDA-registered suppliers only — no exceptions",
        "Ongoing supplier performance monitoring",
        "Immediate supplier review triggered by any FDA action",
        "Quarantine and rejection protocol for non-conforming lots",
      ],
    },
  },

  testing: {
    banner: {
      eyebrow: "Finished Product Testing",
      title: "Every Batch Tested. Every Time. No Exceptions.",
      body: "We test every finished product before it ships — not as a regulatory obligation, but because it's the only way to know with certainty that your patient is receiving exactly what was prescribed, at the potency they need, in a sterile and stable formulation.",
      specs: [
        {
          mark: "POTENCY",
          title: "Potency Testing",
          body: "Every batch verified at labeled concentration by third-party registered lab",
        },
        {
          /** USP General Chapter 71 — the chapter mark is part of the citation. */
          mark: "USP ⟨71⟩",
          title: "Sterility Testing",
          body: "USP ⟨71⟩ sterility testing on all sterile compounded preparations",
        },
        {
          mark: "LAL",
          title: "Endotoxin Testing",
          body: "Bacterial endotoxin (LAL) testing for all injectable formulations",
        },
        {
          mark: "VISUAL",
          title: "Container Integrity & Appearance",
          body: "100% visual inspection — particulates, color, clarity, crimp quality",
        },
      ],
    },
    cards: [
      {
        icon: "chart" as IconName,
        tone: "blue" as const,
        title: "Third-Party Lab Verification",
        body: "Our finished products are tested exclusively by independent, FDA-registered analytical laboratories — no conflicts of interest. Every potency, sterility, and endotoxin result is produced by a third party with no stake in the outcome. Test reports are available to providers upon request.",
      },
      {
        icon: "folder" as IconName,
        tone: "cyan" as const,
        title: "Full Batch Record Traceability",
        body: "Every compound is linked to a complete batch record — from the raw material lot numbers used to the final test results and dispensing record. Fully traceable, fully documented, and ready for any audit.",
      },
      {
        icon: "shield" as IconName,
        tone: "navy" as const,
        title: "No Shipment Without Release",
        body: "Nothing leaves MediCraft without pharmacist review of the complete batch record and passing test results. Product that doesn't meet specification is rejected and destroyed — not released, not repriced, not shipped.",
      },
    ],
  },

  technology: {
    eyebrow: "The Technology Layer",
    title: "A Seamless Process, Built by Our Own CTO",
    body: [
      "Most pharmacies stitch together off-the-shelf software and hope it works. MediCraft has an in-house CTO who is also a skilled API specialist — someone who doesn't just manage technology, but builds the integrations that make your practice's workflow truly seamless.",
      "Whatever software your practice runs — Epic, Athenahealth, DrChrono, Kareo, Jane, a custom EHR, or anything else — our CTO can build the API connection to integrate MediCraft directly into your existing systems. No double entry, no manual status checks, no friction.",
    ],
    checks: [
      "EMR/EHR integration with any major or custom platform",
      "API-level connectivity — not just portal logins",
      "E-prescribing with real-time order tracking in your system",
      "Automated refill and status notifications pushed to your workflow",
      "Secure, HIPAA-compliant data handling at every integration point",
      "Custom reporting and analytics available for high-volume practices",
    ],
    panel: {
      badge: "Technology-Enabled Quality",
      title: "From Rx Received to Package Shipped — Seamlessly Tracked",
      body: "Our in-house CTO has built a digital workflow that eliminates paper-based handoffs and gives every team member — from receiving to compounding to QA to shipping — a clear, real-time picture of every order's status.",
      metrics: [
        { value: "100%", label: "Orders digitally tracked" },
        { value: "0", label: "Paper-based handoffs" },
        { value: "24/7", label: "Provider portal access" },
        { value: "Real-time", label: "Order status visibility" },
      ],
    },
  },
};

/* ---------------------------------------------------------------------------
   State coverage
--------------------------------------------------------------------------- */

export const coverage = {
  intro: {
    eyebrow: "Currently Licensed",
    title: "Currently Serving Florida. Expanding Nationwide.",
    body: "MediCraft Pharmacy is currently licensed to serve patients and providers in Florida. We are actively working toward licensure across all 49 eligible states — more coverage is coming. Contact us to be notified when we expand to your state.",
  },
  features: [
    { value: "FL", label: "Currently Licensed" },
    { value: "49", label: "State Licensure Goal" },
    { value: "100%", label: "Cold-Chain Compliant Shipping" },
  ],
  licensed: {
    eyebrow: "Licensed States",
    title: "Where We Can Serve You Today",
    states: ["Florida"],
    note: "We are actively pursuing pharmacy licensure across all 49 eligible states. If you're a provider or patient outside Florida, reach out — we'll notify you the moment we're licensed in your state.",
    noteLabel: "Expanding soon.",
  },
  shipping: {
    eyebrow: "Shipping & Fulfillment",
    title: "Same Quality. Everywhere.",
    body: "Our fulfillment process is built to maintain compound integrity across every state, every season. Temperature-sensitive medications travel with validated cold-chain packaging and real-time tracking, so providers and patients know exactly where their order is — and because every package is filmed before it leaves our premises, we can document exactly what was in it.",
    checks: [
      "Validated cold-chain shipping for injectables and biologics",
      "Real-time tracking available for every order",
      "Video-documented pick, pack, and seal on every shipment",
      "Direct-to-patient or direct-to-practice prescription fulfillment",
      "HIPAA-compliant packaging and labeling on all shipments",
      "Expedited options available for time-sensitive prescriptions",
    ],
    panel: {
      badge: "Expansion in Progress",
      title: "Always Growing Our Reach",
      body: "We're actively pursuing licensure in additional states. If your state isn't currently listed, reach out — we may be able to serve you sooner than you think, or we can refer you to a trusted partner network.",
      cta: { label: "Check My State", href: "/contact" },
    },
  },
};

/* ---------------------------------------------------------------------------
   For providers
--------------------------------------------------------------------------- */

export const providers = {
  intro: {
    eyebrow: "Provider Partnership",
    title: "The Compounding Partner Your Practice Deserves",
    body: [
      "MediCraft was built with providers in mind. We know that when you partner with a compounding pharmacy, you're putting your name behind our quality. That's why we've built every process — from onboarding to ongoing support — to make your experience seamless and your patients' outcomes exceptional.",
      "Whether you're a solo practitioner or a multi-location practice, our team acts as an extension of your clinical operation.",
    ],
    checks: [
      "Dedicated account representative for your practice",
      "Electronic prescribing with real-time status tracking",
      "Clinical consultation support on compounding decisions",
      "Formulary guidance tailored to your patient population",
      "HIPAA-compliant ordering and patient management tools",
      "Flexible billing and wholesale pricing for practices",
    ],
  },

  benefits: [
    {
      icon: "microscope" as IconName,
      tone: "blue" as const,
      title: "Clinical Consultation",
      body: "Our pharmacists are available to consult on formulation selection, dosing strategies, drug interactions, and therapeutic alternatives — at no extra cost to your practice.",
    },
    {
      icon: "bolt" as IconName,
      tone: "blue" as const,
      title: "Fast Turnaround, Every Time",
      body: "Most compounded prescriptions are processed and shipped within 2–3 business days of receiving a valid prescription. Sterile preparations including injectables are typically fulfilled within 3–5 business days. Expedited processing is available for time-sensitive clinical needs — contact your account representative to arrange.",
    },
    {
      icon: "terminal" as IconName,
      tone: "cyan" as const,
      title: "Provider Portal",
      body: "Submit, track, and manage all your prescriptions from a single secure dashboard. Refill reminders, patient status, and order history — all in one place.",
    },
    {
      icon: "box" as IconName,
      tone: "navy" as const,
      title: "Flexible, Documented Fulfillment",
      body: "Choose direct-to-patient shipping or direct-to-practice delivery for patient-specific prescriptions. Every order is filmed during pick, pack, and seal, and tracked from our door to the destination — so you always know where it is and what was in it. We adapt to your workflow, not the other way around.",
    },
  ],

  onboarding: {
    eyebrow: "Getting Started",
    title: "Partner with MediCraft in 4 Simple Steps",
    lead: "Opening a provider account takes less than 10 minutes, and our team will have you up and running within one business day.",
    steps: [
      {
        icon: "document" as IconName,
        title: "Submit Your Provider Application",
        body: "Complete our short online form with your DEA number, NPI, and practice information. No lengthy paperwork — just the essentials to verify your credentials.",
      },
      {
        icon: "phone" as IconName,
        title: "Meet Your Account Representative",
        body: "A dedicated MediCraft pharmacy liaison will reach out within one business day to walk you through your formulary options and preferred workflows.",
      },
      {
        icon: "terminal" as IconName,
        title: "Access the Provider Portal",
        body: "Receive your secure login credentials. Send your first e-prescription, browse the formulary, and set up your preferred shipping preferences.",
      },
      {
        icon: "rx" as IconName,
        title: "Start Prescribing",
        body: "Your first order is processed with white-glove attention. We'll follow up to confirm delivery and ensure your patient's experience exceeded expectations.",
      },
    ],
    panel: {
      badge: "Provider Exclusive",
      title: "What Providers Say About MediCraft",
      quote:
        "Switching to MediCraft was the best decision for my practice. Their turnaround is faster, their quality is undeniable, and having a dedicated pharmacist I can call makes all the difference.",
      attribution: "Functional Medicine Physician, Tampa FL",
      cta: { label: "Open a Provider Account", href: "/providers" },
    },
  },

  therapeuticAreas: {
    eyebrow: "Therapeutic Areas",
    title: "Formulations Across Every Specialty",
    items: [
      {
        icon: "scale" as IconName,
        tone: "blue" as const,
        title: "Weight Management",
        body: "GLP-1 receptor agonists, lipotropic injectables, and metabolic support compounds for evidence-based weight loss programs.",
        href: "/products/weight-management",
      },
      {
        icon: "dna" as IconName,
        tone: "cyan" as const,
        title: "Hormone Therapy",
        body: "Bioidentical hormone replacement for men and women, including testosterone, estradiol, progesterone, and thyroid formulations.",
        href: "/products/hormone-therapy",
      },
      {
        icon: "vial" as IconName,
        tone: "blue" as const,
        title: "Peptide Therapy",
        body: "Research-supported peptides for anti-aging, recovery, immune function, and performance — compounded to your exact patient specifications.",
        href: "/products/peptide-therapy",
      },
      {
        icon: "leaf" as IconName,
        tone: "navy" as const,
        title: "Dermatology",
        body: "Custom topical formulations for acne, hyperpigmentation, rosacea, and anti-aging — tailored by concentration, base, and delivery mechanism.",
        href: "/products/dermatology",
      },
      {
        icon: "stethoscope" as IconName,
        tone: "cyan" as const,
        title: "Pain Management",
        body: "Topical analgesics, nerve blocks, and compounded pain formulations designed to reduce systemic exposure while maximizing local efficacy.",
        href: "/products/pain-management",
      },
      {
        icon: "heart" as IconName,
        tone: "blue" as const,
        title: "Vitality & Longevity",
        body: "NAD+, glutathione, IV formulations, and functional wellness compounds for longevity-focused practices and concierge medicine.",
        href: "/products/vitality-longevity",
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
   Compounding
--------------------------------------------------------------------------- */

export const compounding = {
  intro: {
    eyebrow: "The Science of Compounding",
    title: "What Makes Compounded Medications Different",
    lead: "Commercial pharmaceuticals are manufactured for the statistical average. Compounded medications are formulated for the individual. Here's what that difference means in practice.",
  },
  customized: {
    title: "Customized for Outcomes, Not Convenience",
    body: [
      "Compounding gives providers and patients a therapeutic option that commercial manufacturing simply cannot offer. When a patient needs a specific dose, delivery form, or formulation free of certain excipients — compounding is the answer.",
      "At MediCraft, we don't just compound prescriptions. We collaborate with providers to design formulations that align with the patient's biology, tolerances, and clinical goals.",
    ],
    checks: [
      "Custom dosage strengths unavailable commercially",
      "Allergen-free formulations (preservative, dye, gluten, lactose free)",
      "Multiple delivery forms: injectables, capsules, creams, nasal sprays, troches",
      "Combination compounds to simplify complex regimens",
      "Flavored oral preparations for pediatric and sensitive patients",
    ],
    panel: {
      badge: "503A",
      title: "Patient-Specific Compounding, One Standard of Quality",
      label: "503A Compounding",
      body: "Patient-specific prescriptions formulated individually. Ideal for personalized therapy when a commercial equivalent doesn't exist or isn't appropriate.",
    },
  },
  delivery: {
    eyebrow: "Delivery Methods",
    title: "Every Form Your Patient Needs",
    items: [
      {
        icon: "syringe" as IconName,
        tone: "blue" as const,
        title: "Injectables",
        body: "Sterile subcutaneous, intramuscular, and IV formulations compounded in ISO-classified cleanrooms to pharmacopeial standards.",
      },
      {
        icon: "jar" as IconName,
        tone: "cyan" as const,
        title: "Topical Creams & Gels",
        body: "Transdermal delivery for hormones, pain agents, dermatological actives — formulated with penetration enhancers matched to each compound.",
      },
      {
        icon: "capsule" as IconName,
        tone: "navy" as const,
        title: "Oral Capsules & Tablets",
        body: "Custom-dosed oral solids including slow-release formulations and allergen-free options not available through commercial channels.",
      },
      {
        icon: "spray" as IconName,
        tone: "blue" as const,
        title: "Nasal Sprays",
        body: "Metered-dose nasal formulations for peptides, hormones, and symptom relief — precise dosing with fast onset and excellent bioavailability.",
      },
      {
        icon: "troche" as IconName,
        tone: "cyan" as const,
        title: "Troches & Sublingual",
        body: "Buccal and sublingual delivery for hormones and peptides — bypassing first-pass metabolism for superior absorption and patient compliance.",
      },
      {
        icon: "droplet" as IconName,
        tone: "navy" as const,
        title: "IV Solutions",
        body: "Customized IV formulations for clinical infusion therapy including NAD+, glutathione, amino acid blends, and vitamin protocols.",
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
   Products
--------------------------------------------------------------------------- */

export const formulary = {
  eyebrow: "Our Formulary",
  title: "Precision-Compounded Medications Across Every Specialty",
  lead: "MediCraft offers a growing formulary of patient-specific compounded medications. All formulations require a valid prescription from a licensed provider. Select a category below to explore available compounds.",
  /** Shown where a category has no published items yet. */
  comingSoon: {
    badge: "Products Coming Soon",
    title: "Product listings coming soon",
    body: "Contact our provider team for current formulary availability in this category.",
    cta: { label: "Request Formulary", href: "/contact" },
  },
  rxNotice: {
    label: "Prescription Required.",
    body: "All MediCraft compounds are prepared in response to a valid prescription from a licensed healthcare provider for a specific, identified patient. Products displayed are for provider reference only and are not available for direct consumer purchase. Contact our provider team to open an account and access the full formulary.",
  },
};

/* ---------------------------------------------------------------------------
   Resources & FAQ
--------------------------------------------------------------------------- */

export const resources = {
  intro: {
    eyebrow: "Knowledge Base",
    title: "Resources & Frequently Asked Questions",
    lead: "Everything providers and patients need to understand compounding, work with MediCraft, and make informed decisions about their care.",
  },

  patientFaqs: {
    title: "For Patients",
    lead: "Common questions about compounded medications and how MediCraft works.",
    items: [
      {
        q: "What is compounding and why would I need it?",
        a: "Compounding is the process of creating a medication specifically for you — tailored to your exact dose, delivery form, and formulation needs. You might need a compounded medication if a commercial version doesn't exist at the dose your provider prescribed, if you have an allergy to an ingredient in the commercial product, if you need a different delivery form (e.g. a cream instead of a tablet), or if the commercial version is unavailable or discontinued.",
      },
      {
        q: "Do I need a prescription to get a compounded medication?",
        a: "Yes — always. As a 503A compounding pharmacy, every medication we prepare requires a valid prescription from a licensed healthcare provider written specifically for you as an identified patient. We do not dispense compounded medications without a prescription, and we do not sell compounds directly to the public without provider authorization.",
      },
      {
        q: "Will my insurance cover compounded medications?",
        a: "In most cases, no. Compounded medications are patient-specific preparations and are generally not covered by commercial insurance, Medicare, or Medicaid. We accept major credit cards and HSA/FSA accounts. We provide transparent pricing before your prescription is processed — there are no surprise charges. If you have questions about cost, contact our team before your provider sends the prescription.",
      },
      {
        q: "How long does it take to receive my medication?",
        a: "Most non-sterile compounds are fulfilled within 2–3 business days of receiving a valid prescription. Sterile preparations such as injectables typically take 3–5 business days. Shipping time varies by location and carrier. Temperature-sensitive medications are shipped with validated cold-chain packaging to ensure they arrive in optimal condition. You'll receive tracking information once your order ships.",
      },
      {
        q: "How do I get a refill?",
        a: "If your prescription has refills authorized, you can request a refill by contacting us by phone or through our Patient Refill portal. If your prescription has expired or has no refills remaining, your provider will need to send a new prescription before we can process your next fill. We recommend requesting refills at least 5–7 days before you run out, especially for medications that require cold-chain shipping.",
      },
    ],
  },

  providerFaqs: {
    title: "For Providers",
    lead: "Everything you need to know about working with MediCraft as a prescribing partner.",
    items: [
      {
        q: "How do I send a prescription to MediCraft?",
        a: "Once your provider account is approved, you can send prescriptions electronically through our provider portal, via e-prescribing through your EMR (if integrated), by fax, or by secure message. Our CTO can set up direct EMR/EHR integration with virtually any platform so prescriptions flow directly from your system to ours — eliminating manual steps entirely.",
      },
      {
        q: "Can I request a custom formulation not listed in your formulary?",
        a: "Yes. Our formulation team evaluates custom compound requests on a case-by-case basis. We review the clinical rationale, ingredient availability, stability data, and regulatory compliance before accepting a custom formula. Contact your account representative or our clinical pharmacist team with the proposed formulation and we'll provide a feasibility assessment, typically within 1–2 business days.",
      },
      {
        q: "Can I get batch records and Certificates of Analysis for my records?",
        a: "Yes — always available on request. Full batch records, third-party Certificates of Analysis (COAs), beyond-use dating documentation, and raw material lot traceability are maintained for every compound and available to prescribing providers upon request. We believe transparency in quality documentation is a baseline expectation, not a premium service.",
      },
      {
        q: "Can MediCraft integrate with my EMR system?",
        a: "Yes. Our in-house CTO and API specialist can build integrations with virtually any EMR, EHR, or practice management platform — including Epic, Athenahealth, DrChrono, Kareo, Jane, and custom systems. API-level integration means prescriptions, refill requests, and order status flow directly between your system and ours without manual re-entry. Setup typically takes less than a week. Contact us to get started.",
      },
      {
        q: "What states does MediCraft ship to?",
        a: "MediCraft is actively pursuing licensure in all 49 eligible states. State coverage is expanding — contact us to confirm whether we are currently licensed to ship to your state. The State Coverage page reflects our current and in-progress licensing status.",
      },
    ],
  },

  guides: {
    eyebrow: "Clinical Resources",
    title: "Provider Education & Clinical Guides",
    lead: "In-depth guides, clinical references, and educational content for providers working with compounded medications. Full resource library coming soon.",
    items: [
      {
        icon: "document" as IconName,
        tone: "blue" as const,
        title: "Understanding 503A Compounding",
        body: "A comprehensive guide for providers on what 503A compounding is, when it's appropriate, and how to prescribe compounded medications compliantly.",
      },
      {
        icon: "vial" as IconName,
        tone: "cyan" as const,
        title: "GLP-1 Compounding: Clinical Overview",
        body: "Evidence-based guidance on compounded GLP-1 receptor agonists for weight management — dosing, titration, and patient selection considerations.",
      },
      {
        icon: "dna" as IconName,
        tone: "navy" as const,
        title: "Bioidentical HRT: Formulation Guide",
        body: "A clinical reference for prescribers navigating hormone therapy formulations — delivery mechanisms, dosing considerations, and monitoring parameters.",
      },
    ],
    status: "Coming Soon",
  },
};

/* ---------------------------------------------------------------------------
   Contact
--------------------------------------------------------------------------- */

export const contact = {
  intro: {
    eyebrow: "Get In Touch",
    title: "We're Here To Help",
    lead: "Whether you're a provider opening an account, a patient with questions, or a partner exploring a relationship — our team is ready to assist.",
  },
  form: {
    title: "Send Us a Message",
    lead: "Fill out the form below and our team will respond within one business day.",
    roles: [
      "Prescribing Provider / Physician",
      "Nurse Practitioner / PA",
      "Clinic or Practice Manager",
      "Patient",
      "Industry Partner",
      "Other",
    ],
    submit: "Send Message",
    success: "Message sent. We'll be in touch within one business day.",
  },
  providerQuickStart: {
    title: "Ready to Open a Provider Account?",
    body: "Get your practice set up quickly. Our onboarding team handles everything — from DEA verification to EMR integration support.",
    cta: "Start Onboarding",
  },
};

/* ---------------------------------------------------------------------------
   Closing CTA, shared across pages
--------------------------------------------------------------------------- */

export const closingCta = {
  title: "Ready to Partner with MediCraft?",
  body: "Join the providers who trust MediCraft to craft the precision compounds their patients need.",
  primary: { label: "Open a Provider Account", href: "/providers" },
  secondary: { label: "Request a Formulary", href: "/contact" },
};

/* ---------------------------------------------------------------------------
   Legal — from the owner's privacy and terms modals
--------------------------------------------------------------------------- */

export const legal = {
  effectiveDate: "January 1, 2026",

  privacy: {
    title: "Privacy Policy",
    intro:
      'MediCraft Pharmacy ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal and health information in compliance with applicable federal and state laws, including HIPAA.',
    sections: [
      {
        heading: "Information We Collect",
        body: "We collect information necessary to dispense compounded medications and provide pharmacy services — including your name, contact information, date of birth, prescriber information, and prescription details. This information is used solely for the purpose of providing pharmacy services and is protected health information (PHI) under HIPAA.",
      },
      {
        heading: "How We Use Your Information",
        body: "Your information is used to process prescriptions, communicate with your prescriber, coordinate shipping, and fulfill legal and regulatory obligations. We do not sell, rent, or share your personal information with third parties for marketing purposes.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to access, correct, and request deletion of your personal information, subject to legal and regulatory requirements. To exercise these rights, contact us at privacy@medicraftpharmacy.com.",
      },
    ],
  },

  terms: {
    title: "Terms of Use",
    intro:
      "By accessing the MediCraft Pharmacy website, you agree to these Terms of Use. This site is intended for informational purposes and to facilitate communication between patients, healthcare providers, and MediCraft Pharmacy.",
    sections: [
      {
        heading: "Intended Use",
        body: "MediCraft Pharmacy is a 503A compounding pharmacy that fills patient-specific prescriptions issued by licensed healthcare providers. This website does not constitute medical advice, nor does it replace a professional prescriber-patient relationship.",
      },
      {
        heading: "Prescription Requirement",
        body: "All compounded medications require a valid prescription from a licensed prescriber. MediCraft does not dispense medications without a valid prescription on file. Patients may not order medications directly.",
      },
      {
        heading: "Limitation of Liability",
        body: "MediCraft Pharmacy makes no representations about the completeness or accuracy of information on this website. Content is provided for general informational purposes only and is subject to change without notice.",
      },
    ],
  },
};

/** The footer's brand blurb. */
export const footerBlurb =
  "Precision compounding, crafted for every patient. Currently licensed in Florida and working toward licensure in all 49 eligible states, with PCAB accreditation in progress.";
