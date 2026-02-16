"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/Button";
import InlineToast from "@/components/InlineToast";
import type { InlineToastType } from "@/components/InlineToast";
import type { DomainAvailabilityResult, DomainSuggestion } from "@/types";

type SearchState =
  | "initial"
  | "searching"
  | "results"
  | "confirming"
  | "purchasing"
  | "success"
  | "error";

interface DomainSearchCardProps {
  onPurchaseComplete: () => void;
}

/**
 * Format price from GoDaddy micro-units to display string
 */
function formatPrice(price: number, currency: string): string {
  const amount = (price / 1_000_000).toFixed(2);
  const symbol = currency === "USD" ? "$" : currency;
  return `${symbol}${amount}/yr`;
}

export default function DomainSearchCard({
  onPurchaseComplete,
}: DomainSearchCardProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("initial");
  const [results, setResults] = useState<DomainAvailabilityResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [confirmDomain, setConfirmDomain] = useState<string | null>(null);
  const [confirmPrice, setConfirmPrice] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: InlineToastType;
  } | null>(null);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setState("searching");
    setToast(null);
    setConfirmDomain(null);

    try {
      const response = await fetch(
        `/api/data/app/domain/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = await response.json();

      if (!data.success) {
        setToast({ message: data.error || "Search failed", type: "error" });
        setState("initial");
        return;
      }

      setResults(data.data.results);
      setSuggestions(data.data.suggestions);
      setState("results");
    } catch {
      setToast({ message: "Failed to search domains", type: "error" });
      setState("initial");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleBuyClick = (domain: string, price: string) => {
    setConfirmDomain(domain);
    setConfirmPrice(price);
    setState("confirming");
  };

  const handleConfirmPurchase = async () => {
    if (!confirmDomain) return;

    setState("purchasing");
    setToast(null);

    try {
      const response = await fetch("/api/data/app/domain/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: confirmDomain }),
      });
      const data = await response.json();

      if (!data.success) {
        setToast({
          message: data.error || "Purchase failed",
          type: "error",
        });
        setState("results");
        setConfirmDomain(null);
        return;
      }

      setState("success");
      setToast({
        message: `${confirmDomain} purchased successfully! Setting up your domain...`,
        type: "success",
      });

      // Notify parent to refresh status
      setTimeout(() => onPurchaseComplete(), 2000);
    } catch {
      setToast({ message: "Failed to purchase domain", type: "error" });
      setState("results");
      setConfirmDomain(null);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDomain(null);
    setState("results");
  };

  // Sort results: available first, then by price
  const sortedResults = [...results].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.price - b.price;
  });

  const availableCount = results.filter((r) => r.available).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">
          Search for a Domain
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Find the perfect domain for your business. CallyGo will register and
        manage it for you.
      </p>

      {/* Search input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter a domain name (e.g. mybusiness)"
          disabled={state === "purchasing" || state === "success"}
        />
        <PrimaryButton
          onClick={handleSearch}
          loading={state === "searching"}
          disabled={
            !query.trim() || state === "purchasing" || state === "success"
          }
        >
          Search
        </PrimaryButton>
      </div>

      {/* Confirmation banner */}
      {state === "confirming" && confirmDomain && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-indigo-900 mb-2">
            Confirm purchase of{" "}
            <span className="font-bold">{confirmDomain}</span> for{" "}
            {confirmPrice}?
          </p>
          <p className="text-xs text-indigo-700 mb-3">
            CallyGo will register this domain and configure it automatically.
            The domain will be managed by CallyGo with auto-renewal enabled.
          </p>
          <div className="flex gap-2">
            <PrimaryButton onClick={handleConfirmPurchase}>
              Confirm Purchase
            </PrimaryButton>
            <button
              onClick={handleCancelConfirm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Purchasing state */}
      {state === "purchasing" && (
        <div className="flex items-center gap-3 py-4 text-sm text-gray-600">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Purchasing {confirmDomain}... This may take a moment.
        </div>
      )}

      {/* Results table */}
      {(state === "results" || state === "confirming") &&
        sortedResults.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">
              {availableCount} of {results.length} domains available
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {sortedResults.map((result) => (
                    <tr
                      key={result.domain}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {result.domain}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {result.available
                          ? formatPrice(result.price, result.currency)
                          : "---"}
                      </td>
                      <td className="px-4 py-3 text-right w-28">
                        {result.available ? (
                          <button
                            onClick={() =>
                              handleBuyClick(
                                result.domain,
                                formatPrice(result.price, result.currency),
                              )
                            }
                            disabled={state === "confirming"}
                            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Buy
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Taken</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Suggestions */}
      {(state === "results" || state === "confirming") &&
        suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.domain}
                  onClick={() => {
                    const name = s.domain.replace(/\.[a-z.]+$/, "");
                    setQuery(name);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  {s.domain}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Toast */}
      {toast && (
        <div className="mt-4">
          <InlineToast
            message={toast.message}
            type={toast.type}
            duration={6000}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
