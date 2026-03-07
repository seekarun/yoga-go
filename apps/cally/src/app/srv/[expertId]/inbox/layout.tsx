"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  useParams,
  useSearchParams,
  usePathname,
  useRouter,
} from "next/navigation";

type FolderType = "inbox" | "sent" | "drafts" | "archive" | "trash";
type FilterType = "all" | "unread" | "starred";

const FOLDERS: { key: FolderType; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "sent", label: "Sent" },
  { key: "drafts", label: "Drafts" },
  { key: "archive", label: "Archive" },
  { key: "trash", label: "Trash" },
];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "starred", label: "Starred" },
];

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const expertId = params.expertId as string;
  const activeFolder = (searchParams.get("folder") as FolderType) || "inbox";
  const activeFilter = (searchParams.get("filter") as FilterType) || "all";
  const urlSearch = searchParams.get("search") || "";

  // Local search input state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input when URL search param changes externally
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Helper to update a search param while preserving others
  const updateParam = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      router.push(`/srv/${expertId}/inbox?${newParams.toString()}`);
    },
    [searchParams, router, expertId],
  );

  // Debounced search update
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam("search", value);
    }, 300);
  };

  // Only show persistent bar on inbox routes
  const isInboxRoute = pathname.includes("/inbox");
  if (!isInboxRoute) return <>{children}</>;

  // Show filter/search row on the inbox list page (not email detail)
  const isListPage = pathname === `/srv/${expertId}/inbox`;

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Row 1: Folder Tabs + Actions */}
      <div className="flex items-end justify-between mb-4 border-b border-gray-200">
        <div className="flex items-center gap-0 overflow-x-auto">
          {FOLDERS.map((f) => (
            <Link
              key={f.key}
              href={`/srv/${expertId}/inbox?folder=${f.key}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                activeFolder === f.key
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {f.label}
            </Link>
          ))}
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("inbox-open-settings"))
            }
            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100 ml-2 mb-1"
            title="Email Settings"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("inbox-open-compose"))
          }
          className="flex items-center gap-2 px-4 py-2 mb-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Compose
        </button>
      </div>

      {/* Row 2: Filter buttons + Search (only on list page, not drafts) */}
      {isListPage && activeFolder !== "drafts" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => updateParam("filter", f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeFilter === f.key
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search emails... (try from: to: has:attachment)"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
