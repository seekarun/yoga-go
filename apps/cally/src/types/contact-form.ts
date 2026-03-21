/**
 * Configurable Contact Form Types
 *
 * Tenants can create custom contact forms with dynamic fields
 * and wire them to CTA buttons on their landing pages.
 */

export type ContactFieldType =
  | "text"
  | "textarea"
  | "dropdown"
  | "email"
  | "phone";

export interface ContactFormField {
  id: string;
  name: string;
  type: ContactFieldType;
  required: boolean;
  placeholder?: string;
  /** Dropdown options — only used when type is "dropdown" */
  options?: string[];
}

export interface ContactFormConfig {
  id: string;
  name: string;
  fields: ContactFormField[];
  createdAt: string;
  updatedAt: string;
}
