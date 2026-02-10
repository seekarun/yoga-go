"use client";

import { useState, useEffect } from "react";
import { useSpamProtection } from "@core/hooks";
import { useOptionalAuth } from "@/contexts/AuthContext";

interface BookingFormProps {
  onSubmit: (data: {
    visitorName: string;
    visitorEmail: string;
    note: string;
    _hp: string;
    _t: string;
  }) => void;
  submitting: boolean;
}

export default function BookingForm({
  onSubmit,
  submitting,
}: BookingFormProps) {
  const auth = useOptionalAuth();
  const { honeypotProps, getSpamFields } = useSpamProtection();
  const [name, setName] = useState(
    auth?.isAuthenticated && auth.user?.profile.name
      ? auth.user.profile.name
      : "",
  );
  const [email, setEmail] = useState(
    auth?.isAuthenticated && auth.user?.profile.email
      ? auth.user.profile.email
      : "",
  );
  const [note, setNote] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Auto-populate from authenticated user when auth loads
  useEffect(() => {
    if (auth?.isAuthenticated && auth.user) {
      if (auth.user.profile.name && !name) {
        setName(auth.user.profile.name);
      }
      if (auth.user.profile.email && !email) {
        setEmail(auth.user.profile.email);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when auth state changes, not when name/email change
  }, [auth?.isAuthenticated, auth?.user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    // Client-side email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError(null);
    onSubmit({
      visitorName: name.trim(),
      visitorEmail: email.trim(),
      note: note.trim(),
      ...getSpamFields(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input {...honeypotProps} />
      <div>
        <label
          htmlFor="booking-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name *
        </label>
        <input
          id="booking-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="booking-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email *
        </label>
        <input
          id="booking-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder="you@example.com"
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${emailError ? "border-red-400" : "border-gray-300"}`}
        />
        {emailError && (
          <p className="mt-1 text-xs text-red-600">{emailError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="booking-note"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Note (optional)
        </label>
        <textarea
          id="booking-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything you'd like us to know..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !name.trim() || !email.trim()}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Booking..." : "Confirm Booking"}
      </button>
    </form>
  );
}
