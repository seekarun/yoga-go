import type { ContactFormConfig } from "@/types";

/**
 * Hardcoded form configuration for CallyGo "Express Interest" CTA.
 * Used on the CallyGo homepage to collect richer lead data than the simple waitlist.
 */
export const EXPRESS_INTEREST_FORM_CONFIG: ContactFormConfig = {
  id: "express-interest",
  name: "Express Interest",
  fields: [
    {
      id: "_name",
      name: "Name",
      type: "text",
      required: true,
      placeholder: "Your full name",
    },
    {
      id: "_email",
      name: "Email",
      type: "email",
      required: true,
      placeholder: "you@example.com",
    },
    {
      id: "_mobile",
      name: "Mobile",
      type: "phone",
      required: false,
      placeholder: "Your phone number",
    },
    {
      id: "businessType",
      name: "Business Type",
      type: "dropdown",
      required: true,
      placeholder: "Select your business type",
      options: [
        "Hair / Beauty",
        "Yoga / Fitness",
        "Coaching / Consulting",
        "Finance / Tax",
        "Wellness / Therapy",
        "Other",
      ],
    },
    {
      id: "comments",
      name: "Comments",
      type: "textarea",
      required: false,
      placeholder: "Tell us about your business (optional)",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
