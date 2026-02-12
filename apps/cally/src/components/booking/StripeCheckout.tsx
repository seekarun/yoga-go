"use client";

import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface StripeCheckoutProps {
  clientSecret: string;
  onBack: () => void;
}

export default function StripeCheckoutView({
  clientSecret,
  onBack,
}: StripeCheckoutProps) {
  const fetchClientSecret = useCallback(() => {
    return Promise.resolve(clientSecret);
  }, [clientSecret]);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Cancel payment
      </button>

      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
