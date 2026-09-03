"use client";

import { useState } from "react";
import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type FieldLabels = { company: string; address: string; phone: string; email: string; krs: string; nip: string; regon: string };
type Placeholders = { name: string; email: string; subject: string; message: string };
type ConsentBlock = { label: string; details: string };
type Consents = { consent: ConsentBlock; consentEmail: ConsentBlock; consentPhone: ConsentBlock };
type Errors = {
  name: string;
  emailRequired: string;
  emailInvalid: string;
  subject: string;
  phoneRequired: string;
  message: string;
  consent: string;
  phoneCountry: string;
  phoneLength: string;
  submitSuccess: string;
  submitFailed: string;
  submitError: string;
};

type ContactFields = {
  label?: EditableValue<string> | string;
  company?: EditableValue<string> | string;
  address?: EditableValue<string> | string;
  phone?: EditableValue<string> | string;
  email?: EditableValue<string> | string;
  nip?: EditableValue<string> | string;
  krs?: EditableValue<string> | string;
  regon?: EditableValue<string> | string;
  heading?: EditableValue<string> | string;
  fieldLabels?: EditableValue<FieldLabels> | FieldLabels;
  placeholders?: EditableValue<Placeholders> | Placeholders;
  consents?: EditableValue<Consents> | Consents;
  disclaimerText?: EditableValue<string> | string;
  privacyLinkLabel?: EditableValue<string> | string;
  submitLabel?: EditableValue<string> | string;
  submittingLabel?: EditableValue<string> | string;
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

const inputStyle = "w-full border-b border-gray-300 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-black transition-colors";
const errorInput = "border-red-500";
const maxChars = 5000;

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  address: "",
  consent: false,
  consentEmail: false,
  consentPhone: false,
  country: "PL",
};

/** Naprawdę globalna sekcja (identyczna w każdej inwestycji) — patrz AGENTS.md, wyjątek dla Footer/Contact/Deweloper. */
export default function Contact({ fields }: { fields: ContactFields }) {
  const label = unwrap(fields.label);
  const company = unwrap(fields.company);
  const address = unwrap(fields.address);
  const phone = unwrap(fields.phone);
  const email = unwrap(fields.email);
  const nip = unwrap(fields.nip);
  const krs = unwrap(fields.krs);
  const regon = unwrap(fields.regon);
  const heading = unwrap(fields.heading);
  const fieldLabels = unwrap(fields.fieldLabels);
  const placeholders = unwrap(fields.placeholders);
  const consents = unwrap(fields.consents);
  const disclaimerText = unwrap(fields.disclaimerText);
  const privacyLinkLabel = unwrap(fields.privacyLinkLabel);
  const submitLabel = unwrap(fields.submitLabel);
  const submittingLabel = unwrap(fields.submittingLabel);
  const errorsCopy = unwrap(fields.errors);

  const withCompany = (text: string) => text.split("{{company}}").join(company || "");

  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [showConsentDetails, setShowConsentDetails] = useState({ consent: false, consentEmail: false, consentPhone: false });

  if (!fieldLabels || !placeholders || !consents || !errorsCopy) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { type, checked, name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (type === "checkbox") {
      setShowConsentDetails((prev) => ({ ...prev, [name]: checked }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = errorsCopy.name;

    if (!formData.email.trim()) newErrors.email = errorsCopy.emailRequired;
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = errorsCopy.emailInvalid;

    if (!formData.subject.trim()) newErrors.subject = errorsCopy.subject;

    if (!message.trim()) newErrors.message = errorsCopy.message;

    if (!formData.consent) newErrors.consent = errorsCopy.consent;
    if (!formData.consentEmail) newErrors.consentEmail = errorsCopy.consent;
    if (!formData.consentPhone) newErrors.consentPhone = errorsCopy.consent;

    const country = phoneCountries.find((c) => c.code === formData.country);
    if (!formData.phone.trim()) newErrors.phone = errorsCopy.phoneRequired;
    else if (!country) newErrors.phone = errorsCopy.phoneCountry;
    else if (formData.phone.length !== country.length) newErrors.phone = errorsCopy.phoneLength.split("{{length}}").join(String(country.length));

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("https://kgd-group.pl/server/mailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, message, target: email }),
      });

      if (!res.ok) throw new Error(errorsCopy.submitFailed);

      setSuccessMessage(errorsCopy.submitSuccess);
      setFormData(initialFormData);
      setMessage("");
    } catch {
      setErrors({ form: errorsCopy.submitError });
    }

    setIsSubmitting(false);
  };

  return (
    <section id="kontakt" className="bg-[#fdfdfd] py-20 font-poppins">
      <div className="container mx-auto px-6 grid grid-cols-12 gap-y-16 md:gap-16">
        <div className="order-2 md:order-1 col-span-12 md:col-span-4">
          <h2 className="hidden md:block text-[#1D1D1D] text-3xl font-semibold mb-6">{heading}</h2>

          {label && <p className="text-gray-600 mb-10 text-sm leading-relaxed whitespace-pre-line">{label}</p>}

          <div className="space-y-6 text-sm text-gray-700">
            {company && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.company}</p>
                <p>{company}</p>
              </div>
            )}

            {address && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.address}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {address}
                </a>
              </div>
            )}

            {phone && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.phone}</p>
                <p>
                  <a className="hover:underline" href={`tel:${phone}`}>
                    {phone}
                  </a>
                </p>
              </div>
            )}

            {email && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.email}</p>
                <p>
                  <a className="hover:underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                </p>
              </div>
            )}

            {krs && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.krs}</p>
                <p>{krs}</p>
              </div>
            )}

            {nip && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.nip}</p>
                <p>{nip}</p>
              </div>
            )}

            {regon && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">{fieldLabels.regon}</p>
                <p>{regon}</p>
              </div>
            )}
          </div>
        </div>

        <h2 className="block md:hidden text-[#1D1D1D] text-3xl font-semibold mb-6">{heading}</h2>

        <form onSubmit={handleSubmit} className="order-1 md:order-2 col-span-12 md:col-span-8 grid grid-cols-2 gap-x-12 gap-y-10">
          <div>
            <input
              required
              type="text"
              name="name"
              placeholder={placeholders.name}
              className={`${inputStyle} ${errors.name ? errorInput : ""}`}
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <input
              required
              type="email"
              name="email"
              placeholder={placeholders.email}
              className={`${inputStyle} ${errors.email ? errorInput : ""}`}
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className={`${inputStyle} flex items-center gap-2 ${errors.phone ? errorInput : ""}`}>
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
                required
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  const country = phoneCountries.find((c) => c.code === formData.country);
                  setFormData((prev) => ({ ...prev, phone: onlyDigits.slice(0, country?.length) }));
                }}
                inputMode="numeric"
                className="w-full outline-none bg-transparent text-sm"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <input type="text" name="address" placeholder={fieldLabels.address} value={formData.address} onChange={handleChange} style={{ display: "none" }} />

          <div>
            <input
              required
              type="text"
              name="subject"
              placeholder={placeholders.subject}
              className={`${inputStyle} ${errors.subject ? errorInput : ""}`}
              value={formData.subject}
              onChange={handleChange}
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>

          <div className="col-span-2">
            <textarea
              required
              placeholder={placeholders.message}
              rows={4}
              value={message}
              onChange={(e) => e.target.value.length <= maxChars && setMessage(e.target.value)}
              className={`w-full border-b border-gray-300 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-black resize-none transition-colors ${errors.message ? "border-red-500" : ""}`}
            />

            <div className="flex justify-between text-xs mt-2">
              {errors.message && <p className="text-red-500">{errors.message}</p>}
              <span className="text-gray-400 ml-auto">
                {message.length} / {maxChars}
              </span>
            </div>
          </div>

          <div className="col-span-2 space-y-5 text-sm text-gray-600">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="consent" className="mt-1 w-4 h-4 border-gray-300" checked={formData.consent} onChange={handleChange} />
              <div className="leading-relaxed">
                <span>{consents.consent.label}</span>
                {showConsentDetails.consent && (
                  <p className="mt-1 text-xs text-gray-500">
                    {withCompany(consents.consent.details)}{" "}
                    <Link href="/polityka-prywatnosci" className="underline">
                      {privacyLinkLabel}
                    </Link>
                  </p>
                )}
              </div>
            </label>
            {errors.consent && <p className="text-red-500 text-xs">{errors.consent}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="consentEmail" className="mt-1 w-4 h-4 border-gray-300" checked={formData.consentEmail} onChange={handleChange} />
              <div className="leading-relaxed">
                <span>{consents.consentEmail.label}</span>
                {showConsentDetails.consentEmail && (
                  <p className="mt-1 text-xs text-gray-500">
                    {withCompany(consents.consentEmail.details)}{" "}
                    <Link href="/polityka-prywatnosci" className="underline">
                      {privacyLinkLabel}
                    </Link>
                  </p>
                )}
              </div>
            </label>
            {errors.consentEmail && <p className="text-red-500 text-xs">{errors.consentEmail}</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="consentPhone" className="mt-1 w-4 h-4 border-gray-300" checked={formData.consentPhone} onChange={handleChange} />
              <div className="leading-relaxed">
                <span>{consents.consentPhone.label}</span>
                {showConsentDetails.consentPhone && (
                  <p className="mt-1 text-xs text-gray-500">
                    {withCompany(consents.consentPhone.details)}{" "}
                    <Link href="/polityka-prywatnosci" className="underline">
                      {privacyLinkLabel}
                    </Link>
                  </p>
                )}
              </div>
            </label>

            {disclaimerText && <p>{disclaimerText}</p>}

            {errors.consentPhone && <p className="text-red-500 text-xs">{errors.consentPhone}</p>}
            {errors.form && <p className="text-red-500 text-md">{errors.form}</p>}
            {successMessage && <p className="text-green-600 text-md">{successMessage}</p>}
          </div>

          <button
            disabled={isSubmitting}
            type="submit"
            className="mb-12 md:mb-0 cursor-pointer col-span-2 border border-black py-4 text-sm tracking-wide hover:bg-black hover:text-white transition-colors"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
