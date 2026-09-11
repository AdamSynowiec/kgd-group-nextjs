"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";

type PhoneNumber = { tel: string; display: string };
type Errors = {
  phoneRequired: string;
  phoneLength: string;
  submitFailed: string;
  submitSuccess: string;
  submitError: string;
};

type CallToUsFields = {
  bubbleGreeting?: EditableValue<string> | string;
  bubbleMessage?: EditableValue<string> | string;
  thankYouTitle?: EditableValue<string> | string;
  thankYouMessage?: EditableValue<string> | string;
  modalTitle?: EditableValue<string> | string;
  modalSubtitle?: EditableValue<string> | string;
  phonePlaceholder?: EditableValue<string> | string;
  consentLabel?: EditableValue<string> | string;
  submitLabel?: EditableValue<string> | string;
  submittingLabel?: EditableValue<string> | string;
  callUsLabel?: EditableValue<string> | string;
  phoneNumber?: EditableValue<PhoneNumber> | PhoneNumber;
  errors?: EditableValue<Errors> | Errors;
};

const phoneCountries = [
  { code: "PL", dial: "+48", length: 9 },
  { code: "DE", dial: "+49", length: 11 },
  { code: "CZ", dial: "+420", length: 9 },
  { code: "SK", dial: "+421", length: 9 },
  { code: "UA", dial: "+380", length: 9 },
  { code: "BY", dial: "+375", length: 9 },
  { code: "LT", dial: "+370", length: 8 },
  { code: "RU", dial: "+7", length: 10 },
];

const initialFormData = { phone: "", consent: false, country: "PL" };

/**
 * Pływający przycisk "szybki telefon" — dymek + modal z formularzem
 * "zostaw numer, oddzwonimy". Naprawdę globalny (identyczny na każdej
 * podstronie, patrz Contact.tsx) — montowany raz na layout, treść czytana
 * ze wspólnej sekcji "CallToUs" na stronie głównej ("/"), jedno miejsce
 * edycji dla całego serwisu.
 */
export default function CallToUs({ fields }: { fields: CallToUsFields }) {
  const bubbleGreeting = unwrap(fields.bubbleGreeting);
  const bubbleMessage = unwrap(fields.bubbleMessage);
  const thankYouTitle = unwrap(fields.thankYouTitle);
  const thankYouMessage = unwrap(fields.thankYouMessage);
  const modalTitle = unwrap(fields.modalTitle);
  const modalSubtitle = unwrap(fields.modalSubtitle);
  const phonePlaceholder = unwrap(fields.phonePlaceholder);
  const consentLabel = unwrap(fields.consentLabel);
  const submitLabel = unwrap(fields.submitLabel);
  const submittingLabel = unwrap(fields.submittingLabel);
  const callUsLabel = unwrap(fields.callUsLabel);
  const phoneNumber = unwrap(fields.phoneNumber);
  const errorsCopy = unwrap(fields.errors);

  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!errorsCopy || !phoneNumber) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const country = phoneCountries.find((c) => c.code === formData.country);

    if (!formData.phone.trim()) {
      setErrorMessage(errorsCopy.phoneRequired);
      return;
    }

    if (!country || formData.phone.length !== country.length) {
      setErrorMessage(errorsCopy.phoneLength.split("{{length}}").join(String(country?.length ?? "")));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("https://kgd-group.pl/server/pushbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "",
          phone: formData.phone,
          message: "KONTAKT TELEFONICZNY",
          consent: formData.consent,
          site: window.location.href,
          country: formData.country,
        }),
      });

      if (!res.ok) throw new Error(errorsCopy.submitFailed);

      setFormData(initialFormData);
      setOpen(false);
      setSubmitted(true);
      setShowBubble(true);
    } catch {
      setErrorMessage(errorsCopy.submitError);
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <div className="fixed bottom-3 right-3 md:bottom-6 md:right-6 z-50 flex flex-col items-end space-y-3">
        {showBubble && !open && (
          <div className="relative rounded-2xl bg-white/90 backdrop-blur-md border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-4 max-w-xs animate-fadeInRight">
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              className="cursor-pointer absolute top-2 right-3 text-gray-400 hover:text-[#C9AB8B] transition-colors"
              aria-label="Zamknij"
            >
              ✕
            </button>

            <div className="flex items-start gap-4">
              <img loading="lazy" decoding="async" src="/home/logo.svg" alt="KGD" className="min-w-12 h-12 p-1.5 rounded-full border border-[#C9AB8B]/40 bg-white" />

              <div className="flex flex-col">
                {!submitted ? (
                  <>
                    <span className="text-gray-900 font-medium text-sm">{bubbleGreeting}</span>
                    <span className="text-gray-600 text-xs leading-relaxed mt-1 whitespace-pre-line">{bubbleMessage}</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-900 font-medium text-sm">{thankYouTitle}</span>
                    <span className="text-gray-600 text-xs leading-relaxed mt-1">{thankYouMessage}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer group relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#C9AB8B] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(201,171,139,0.35)] transition-all duration-300 hover:scale-110"
          aria-label={modalTitle || "Zadzwoń do nas"}
        >
          <span className="absolute inset-0 rounded-full border border-[#C9AB8B] animate-ping opacity-40" />
          <img loading="lazy" decoding="async" src="/home/icons/phone.svg" alt="" className="w-7 h-7 relative z-10" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-white w-full max-w-lg p-6 md:p-8 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] animate-popup">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-[#C9AB8B] transition-colors"
              aria-label="Zamknij"
            >
              ✕
            </button>

            <h2 className="text-2xl md:text-3xl font-light text-[#C9AB8B] text-center mb-4">{modalTitle}</h2>
            <p className="text-gray-600 text-center text-sm mb-6 leading-relaxed">{modalSubtitle}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="w-full border-b border-gray-300 flex items-center gap-2 py-3 text-sm">
                <select
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value, phone: "" }))}
                  className="bg-transparent text-sm text-gray-500 outline-none"
                >
                  {phoneCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.dial}
                    </option>
                  ))}
                </select>

                <input
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    const country = phoneCountries.find((c) => c.code === formData.country);
                    setFormData((prev) => ({ ...prev, phone: onlyDigits.slice(0, country?.length) }));
                  }}
                  type="tel"
                  inputMode="numeric"
                  placeholder={phonePlaceholder}
                  className="w-full focus:outline-none"
                  required
                />
              </div>

              <label className="cursor-pointer flex items-start gap-3 text-xs text-gray-600">
                <input
                  name="consent"
                  checked={formData.consent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                  type="checkbox"
                  className="mt-1 accent-[#C9AB8B]"
                  required
                />
                <span>{consentLabel}</span>
              </label>

              {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer mt-4 px-6 py-3 rounded-full bg-[#C9AB8B] text-white font-light tracking-wide hover:bg-transparent hover:text-[#C9AB8B] border border-[#C9AB8B] transition-all duration-300"
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-600">
              {callUsLabel}{" "}
              <a href={`tel:${phoneNumber.tel}`} className="text-[#C9AB8B] hover:underline">
                {phoneNumber.display}
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
