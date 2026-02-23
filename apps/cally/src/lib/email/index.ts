/**
 * CallyGo Email Client
 * Uses the core email module backed by AWS SES
 */
import { createEmailClient } from "@core/lib";

const FALLBACK_FROM_EMAIL = "hi@callygo.com";

export const emailClient = createEmailClient({
  region: process.env.SES_REGION || "us-west-2",
  fromEmail: process.env.SES_FROM_EMAIL || FALLBACK_FROM_EMAIL,
  configSet: process.env.SES_CONFIG_SET || undefined,
});

export { FALLBACK_FROM_EMAIL };
