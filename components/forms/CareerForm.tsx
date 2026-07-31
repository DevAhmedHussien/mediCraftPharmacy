"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { REFERRAL_SOURCES } from "@/lib/forms";

const inputClass =
  "w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1.5 block text-sm font-medium text-ink-soft";

export function CareerForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Thank you for applying — our team will review your application and be in
          touch soon.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input id="firstName" name="firstName" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input id="lastName" name="lastName" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input id="phone" name="phone" type="tel" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="referral" className={labelClass}>
          How did you hear about us?
        </label>
        <select id="referral" name="referral" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select…
          </option>
          {REFERRAL_SOURCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>Are you willing to relocate?</legend>
        <div className="flex gap-3">
          {["Yes", "No"].map((o) => (
            <label
              key={o}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink-soft transition-colors hover:border-brand-400 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input type="radio" name="relocate" value={o} required className="accent-brand-600" />
              {o}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="resume" className={labelClass}>
          Resume <span className="text-xs text-ink-muted">(PDF or Word, max 25 MB)</span>
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.doc,.docx"
          required
          className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink-soft file:mr-4 file:rounded-full file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
      </div>

      <button type="submit" className="btn-primary w-full">
        Submit application
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
