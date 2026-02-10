"use client";

import { useState, useEffect } from "react";
import { useSpamProtection } from "@core/hooks";
import { useOptionalAuth } from "@/contexts/AuthContext";

interface ContactFormProps {
  onSubmit: (data: {
    name: string;
    email: string;
    message: string;
    _hp: string;
    _t: string;
  }) => void;
  submitting: boolean;
}

export default function ContactForm({
  onSubmit,
  submitting,
}: ContactFormProps) {
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
  const [message, setMessage] = useState("");
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
    if (!name.trim() || !email.trim() || !message.trim()) return;

    // Client-side email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError(null);
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      ...getSpamFields(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input {...honeypotProps} />
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name *
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          disabled={submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email *
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          placeholder="you@example.com"
          disabled={submitting}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ${emailError ? "border-red-400" : "border-gray-300"}`}
        />
        {emailError && (
          <p className="mt-1 text-xs text-red-600">{emailError}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Message *
        </label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help you?"
          rows={4}
          disabled={submitting}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={
          submitting || !name.trim() || !email.trim() || !message.trim()
        }
        className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
