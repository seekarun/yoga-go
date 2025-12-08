"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout";
import { usePreferences, type EventTag } from "@/contexts";

interface User {
  email: string;
  sub: string;
  tenantId?: string;
  tenantName?: string;
}

const DATE_FORMATS = [
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY (12/07/2025)" },
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY (07/12/2025)" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD (2025-12-07)" },
];

const TIMEZONE_OPTIONS = [
  {
    region: "Pacific",
    zones: ["Pacific/Honolulu", "Pacific/Auckland", "Pacific/Fiji"],
  },
  {
    region: "Americas",
    zones: [
      "America/Anchorage",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Toronto",
      "America/Sao_Paulo",
    ],
  },
  {
    region: "Europe",
    zones: ["Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow"],
  },
  {
    region: "Asia",
    zones: [
      "Asia/Dubai",
      "Asia/Kolkata",
      "Asia/Bangkok",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Asia/Shanghai",
      "Asia/Tokyo",
    ],
  },
  {
    region: "Australia",
    zones: [
      "Australia/Perth",
      "Australia/Adelaide",
      "Australia/Sydney",
      "Australia/Melbourne",
    ],
  },
];

// Major cities for autocomplete
const CITIES = [
  "New York, USA",
  "Los Angeles, USA",
  "Chicago, USA",
  "Houston, USA",
  "San Francisco, USA",
  "Seattle, USA",
  "Miami, USA",
  "Boston, USA",
  "Denver, USA",
  "Toronto, Canada",
  "Vancouver, Canada",
  "Montreal, Canada",
  "London, UK",
  "Manchester, UK",
  "Edinburgh, UK",
  "Paris, France",
  "Berlin, Germany",
  "Munich, Germany",
  "Amsterdam, Netherlands",
  "Madrid, Spain",
  "Barcelona, Spain",
  "Rome, Italy",
  "Milan, Italy",
  "Vienna, Austria",
  "Zurich, Switzerland",
  "Stockholm, Sweden",
  "Oslo, Norway",
  "Copenhagen, Denmark",
  "Dublin, Ireland",
  "Brussels, Belgium",
  "Moscow, Russia",
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Mumbai, India",
  "Delhi, India",
  "Bangalore, India",
  "Chennai, India",
  "Hyderabad, India",
  "Kolkata, India",
  "Singapore",
  "Hong Kong",
  "Tokyo, Japan",
  "Osaka, Japan",
  "Seoul, South Korea",
  "Beijing, China",
  "Shanghai, China",
  "Bangkok, Thailand",
  "Kuala Lumpur, Malaysia",
  "Jakarta, Indonesia",
  "Manila, Philippines",
  "Ho Chi Minh City, Vietnam",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Brisbane, Australia",
  "Perth, Australia",
  "Auckland, New Zealand",
  "Wellington, New Zealand",
  "Cape Town, South Africa",
  "Johannesburg, South Africa",
  "Cairo, Egypt",
  "Lagos, Nigeria",
  "Nairobi, Kenya",
  "Sao Paulo, Brazil",
  "Rio de Janeiro, Brazil",
  "Buenos Aires, Argentina",
  "Mexico City, Mexico",
  "Lima, Peru",
  "Bogota, Colombia",
];

// Preset colors for tags
const TAG_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart?.value || "";
  } catch {
    return "";
  }
}

export default function PreferencesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { preferences, updatePreference } = usePreferences();

  // Tag editing state
  const [editingTag, setEditingTag] = useState<EventTag | null>(null);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleAddTag = () => {
    if (!newTagLabel.trim()) return;
    const newTag: EventTag = {
      id: `tag-${Date.now()}`,
      label: newTagLabel.trim(),
      color: newTagColor,
    };
    updatePreference("tags", [...preferences.tags, newTag]);
    setNewTagLabel("");
    setNewTagColor(TAG_COLORS[0]);
  };

  const handleUpdateTag = (tag: EventTag) => {
    const updatedTags = preferences.tags.map((t) =>
      t.id === tag.id ? tag : t,
    );
    updatePreference("tags", updatedTags);
    setEditingTag(null);
  };

  const handleDeleteTag = (tagId: string) => {
    const updatedTags = preferences.tags.filter((t) => t.id !== tagId);
    updatePreference("tags", updatedTags);
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (!data.success || !data.data?.isAuthenticated) {
          router.push("/auth/signin");
          return;
        }

        setUser(data.data.user);
      } catch (error) {
        console.error("[DBG][preferences] Session check failed:", error);
        router.push("/auth/signin");
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Save to backend
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/auth/signin");
    } catch (error) {
      console.error("[DBG][preferences] Sign out failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="px-6 py-3 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">Preferences</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Timezone Section */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Timezone
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Set your timezone to ensure appointments are displayed
                correctly.
              </p>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreference("timezone", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TIMEZONE_OPTIONS.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.zones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace(/_/g, " ")} ({getTimezoneOffset(zone)})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </section>

            {/* Location Section */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Location
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Set your city for location-based features.
              </p>
              <div className="relative">
                <input
                  type="text"
                  list="cities-list"
                  value={preferences.location}
                  onChange={(e) => updatePreference("location", e.target.value)}
                  placeholder="Start typing a city name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <datalist id="cities-list">
                  {CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </section>

            {/* Date & Time Format Section */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Date & Time Format
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      updatePreference("dateFormat", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Format
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timeFormat"
                        value="12h"
                        checked={preferences.timeFormat === "12h"}
                        onChange={() => updatePreference("timeFormat", "12h")}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        12-hour (2:30 PM)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timeFormat"
                        value="24h"
                        checked={preferences.timeFormat === "24h"}
                        onChange={() => updatePreference("timeFormat", "24h")}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">
                        24-hour (14:30)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Event Tags Section */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Event Tags
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Create tags to categorize your events. Tags will appear as
                colored borders on the calendar.
              </p>

              {/* Existing Tags */}
              <div className="space-y-3 mb-6">
                {preferences.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    {editingTag?.id === tag.id ? (
                      <>
                        <input
                          type="text"
                          value={editingTag.label}
                          onChange={(e) =>
                            setEditingTag({
                              ...editingTag,
                              label: e.target.value,
                            })
                          }
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                setEditingTag({ ...editingTag, color })
                              }
                              className={`w-6 h-6 rounded-full border-2 ${
                                editingTag.color === color
                                  ? "border-gray-800"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateTag(editingTag)}
                          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-sm text-gray-700">
                          {tag.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingTag(tag)}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {preferences.tags.length === 0 && (
                  <p className="text-sm text-gray-400 italic">
                    No tags created yet. Add one below.
                  </p>
                )}
              </div>

              {/* Add New Tag */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Add New Tag
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="Tag name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newTagColor === color
                            ? "border-gray-800"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTagLabel.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {/* More colors */}
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-2">
                    More colors:
                  </span>
                  {TAG_COLORS.slice(5).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={`w-5 h-5 rounded-full border-2 ${
                        newTagColor === color
                          ? "border-gray-800"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Saved!
                  </>
                ) : (
                  "Save Preferences"
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
