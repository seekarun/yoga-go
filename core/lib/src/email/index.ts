// Core Email Module
export * from "./types";
export { createEmailClient } from "./client";

// Email validation
export {
  isValidEmail,
  isValidEmailFormat,
  isDisposableEmail,
} from "./validator";
export type { EmailValidatorConfig, EmailValidationResult } from "./validator";
