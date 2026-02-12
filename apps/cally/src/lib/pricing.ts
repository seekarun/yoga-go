/**
 * Pricing tier configuration for CallyGo
 * Shared between homepage and subscription settings page
 */
import type { SubscriptionTier } from "@/types/subscription";

export interface PricingTier {
  tier: SubscriptionTier;
  name: string;
  price: number; // monthly price in USD
  trialDays: number;
  trialLabel: string; // e.g. "6 months free", "1 month free"
  description: string;
  features: string[];
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    tier: "starter",
    name: "Starter",
    price: 12,
    trialDays: 180,
    trialLabel: "6 months free",
    description: "For professionals getting started online",
    features: [
      "Professional landing page",
      "Booking calendar with working hours",
      "Google Calendar & Outlook sync",
      "Stripe payment collection",
      "Email notifications & reminders",
      "Subscriber management",
      "Feedback & reviews",
      "Surveys",
      "Products & services listing",
      "Custom domain support",
    ],
    highlighted: false,
  },
  {
    tier: "professional",
    name: "Professional",
    price: 29,
    trialDays: 30,
    trialLabel: "1 month free",
    description: "For busy professionals who need video & AI",
    features: [
      "Everything in Starter",
      "Built-in HD video calls",
      "Meeting recording & transcription",
      "AI-powered landing page editor",
      "Business email inbox",
      "AI chat assistant (basic)",
      "Phone morning briefing",
      "Priority email support",
    ],
    highlighted: true,
  },
  {
    tier: "business",
    name: "Business",
    price: 120,
    trialDays: 30,
    trialLabel: "1 month free",
    description: "Full AI-powered business on autopilot",
    features: [
      "Everything in Professional",
      "Unlimited AI assistant usage",
      "AI-generated client communications",
      "Smart scheduling suggestions",
      "Automated follow-ups & re-booking",
      "Advanced analytics & insights",
      "AI content creation for your page",
      "Dedicated account support",
    ],
    highlighted: false,
  },
];
