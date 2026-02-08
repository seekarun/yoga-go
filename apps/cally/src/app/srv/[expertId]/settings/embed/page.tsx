"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type WidgetType = "booking" | "contact" | "chat";
type EmbedMode = "popup" | "inline" | "float";

const WIDGET_OPTIONS: { value: WidgetType; label: string }[] = [
  { value: "booking", label: "Booking" },
  { value: "contact", label: "Contact" },
  { value: "chat", label: "Chat" },
];

const MODE_OPTIONS: Record<
  WidgetType,
  { value: EmbedMode; label: string; description: string }[]
> = {
  booking: [
    {
      value: "popup",
      label: "Popup",
      description: 'Shows a "Book Now" button that opens an overlay',
    },
    {
      value: "inline",
      label: "Inline",
      description: "Embeds the booking form directly in a page section",
    },
  ],
  contact: [
    {
      value: "popup",
      label: "Popup",
      description: 'Shows a "Contact Us" button that opens an overlay',
    },
    {
      value: "inline",
      label: "Inline",
      description: "Embeds the contact form directly in a page section",
    },
  ],
  chat: [
    {
      value: "float",
      label: "Floating Bubble",
      description:
        "Shows a chat bubble in the corner that expands into a chat panel",
    },
    {
      value: "inline",
      label: "Inline",
      description: "Embeds the chat panel directly in a page section",
    },
  ],
};

const BASE_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "cally.app";

type SnippetFormat = "html" | "react";

function generateSnippet(
  tenantId: string,
  widget: WidgetType,
  mode: EmbedMode,
  format: SnippetFormat,
): string {
  const base = `https://${BASE_DOMAIN}`;

  if (format === "react") {
    return generateReactSnippet(tenantId, widget, mode, base);
  }

  if (mode === "inline") {
    const containerId = `cally-${widget}`;
    return `<div id="${containerId}"></div>\n<script src="${base}/embed.js"\n  data-tenant-id="${tenantId}"\n  data-widget="${widget}"\n  data-mode="inline"\n  data-container="#${containerId}">\n</script>`;
  }

  return `<script src="${base}/embed.js"\n  data-tenant-id="${tenantId}"\n  data-widget="${widget}"\n  data-mode="${mode}">\n</script>`;
}

function generateReactSnippet(
  tenantId: string,
  widget: WidgetType,
  mode: EmbedMode,
  base: string,
): string {
  if (mode === "inline") {
    return `import { useEffect, useRef } from "react";

export default function Cally${widget.charAt(0).toUpperCase() + widget.slice(1)}() {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${base}/embed.js";
    script.setAttribute("data-tenant-id", "${tenantId}");
    script.setAttribute("data-widget", "${widget}");
    script.setAttribute("data-mode", "inline");
    script.setAttribute("data-container", "#cally-${widget}");
    document.body.appendChild(script);
    return () => { script.remove(); window.CallyEmbed = undefined; };
  }, []);

  return <div id="cally-${widget}" ref={containerRef} />;
}`;
  }

  return `import { useEffect } from "react";

export default function Cally${widget.charAt(0).toUpperCase() + widget.slice(1)}() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${base}/embed.js";
    script.setAttribute("data-tenant-id", "${tenantId}");
    script.setAttribute("data-widget", "${widget}");
    script.setAttribute("data-mode", "${mode}");
    document.body.appendChild(script);
    return () => { script.remove(); window.CallyEmbed = undefined; };
  }, []);

  return null; // ${mode === "float" ? "Floating bubble renders at bottom-right of page" : "Popup trigger appends to document.body"}
}`;
}

export default function EmbedSettingsPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [selectedWidget, setSelectedWidget] = useState<WidgetType>("booking");
  const [selectedMode, setSelectedMode] = useState<EmbedMode>("popup");
  const [snippetFormat, setSnippetFormat] = useState<SnippetFormat>("html");
  const [copied, setCopied] = useState(false);

  const tenantId = expertId; // tenantId matches expertId in single-tenant setup

  const availableModes = MODE_OPTIONS[selectedWidget];
  const snippet = generateSnippet(
    tenantId,
    selectedWidget,
    selectedMode,
    snippetFormat,
  );
  const previewUrl = `https://${BASE_DOMAIN}/embed/${tenantId}/${selectedWidget}`;

  // Reset mode when widget changes
  const handleWidgetChange = useCallback(
    (w: WidgetType) => {
      setSelectedWidget(w);
      const firstMode = MODE_OPTIONS[w][0].value;
      if (
        !MODE_OPTIONS[w].some(
          (m: { value: EmbedMode }) => m.value === selectedMode,
        )
      ) {
        setSelectedMode(firstMode);
      }
    },
    [selectedMode],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("[DBG][embed/settings] Failed to copy to clipboard");
    }
  }, [snippet]);

  return (
    <div className="p-6">
      {/* Back link */}
      <Link
        href={`/srv/${expertId}/settings`}
        className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] mb-6"
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
        Back to Settings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Embed Widgets
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Add booking, contact, or chat widgets to your external website.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Widget type selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
              Widget Type
            </label>
            <div className="flex gap-2">
              {WIDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleWidgetChange(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    selectedWidget === opt.value
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-white text-[var(--text-main)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
              Display Mode
            </label>
            <div className="space-y-2">
              {availableModes.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedMode(opt.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedMode === opt.value
                      ? "border-[var(--color-primary)] bg-indigo-50"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                  }`}
                >
                  <div className="font-medium text-sm text-[var(--text-main)]">
                    {opt.label}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Code snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-main)]">
                Embed Code
              </label>
              <div className="flex items-center gap-3">
                {/* Format toggle */}
                <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setSnippetFormat("html")}
                    className={`px-2.5 py-1 transition-colors ${
                      snippetFormat === "html"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetFormat("react")}
                    className={`px-2.5 py-1 transition-colors ${
                      snippetFormat === "react"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    React
                  </button>
                </div>
                {/* Copy button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
                >
                  {copied ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {snippet}
            </pre>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {snippetFormat === "html"
                ? "Paste this into your website's HTML where you want the widget to appear."
                : "Create a new component file and import it where you want the widget."}
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
            Preview
          </label>
          <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-gray-50">
            <iframe
              key={`${selectedWidget}-${selectedMode}`}
              src={previewUrl}
              className="w-full border-none"
              style={{ height: selectedWidget === "chat" ? "520px" : "500px" }}
              title={`${selectedWidget} widget preview`}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-10 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          How to embed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HTML instructions */}
          <div className="bg-white border border-[var(--color-border)] rounded-lg p-5">
            <h3 className="font-medium text-[var(--text-main)] mb-2">
              HTML / Static websites
            </h3>
            <ol className="text-sm text-[var(--text-muted)] space-y-2 list-decimal list-inside">
              <li>Select the widget type and display mode above.</li>
              <li>
                Switch to <span className="font-medium">HTML</span> format and
                copy the code snippet.
              </li>
              <li>
                Paste it into your page&apos;s HTML — either inside the{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  &lt;body&gt;
                </code>{" "}
                where you want the button/widget, or before the closing{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  &lt;/body&gt;
                </code>{" "}
                tag for popup/float modes.
              </li>
              <li>
                For <span className="font-medium">inline</span> mode, place the{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  &lt;div&gt;
                </code>{" "}
                container where you want the widget to appear.
              </li>
            </ol>
          </div>

          {/* React instructions */}
          <div className="bg-white border border-[var(--color-border)] rounded-lg p-5">
            <h3 className="font-medium text-[var(--text-main)] mb-2">
              React / Next.js
            </h3>
            <ol className="text-sm text-[var(--text-muted)] space-y-2 list-decimal list-inside">
              <li>
                Switch to <span className="font-medium">React</span> format and
                copy the component code.
              </li>
              <li>
                Create a new file (e.g.{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  CallyBooking.jsx
                </code>
                ) and paste the code.
              </li>
              <li>
                Import and render the component anywhere in your app:{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  &lt;CallyBooking /&gt;
                </code>
              </li>
              <li>
                The script loads dynamically via{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">
                  useEffect
                </code>{" "}
                and cleans up on unmount.
              </li>
            </ol>
          </div>
        </div>

        {/* Programmatic API */}
        <div className="mt-6 bg-white border border-[var(--color-border)] rounded-lg p-5">
          <h3 className="font-medium text-[var(--text-main)] mb-2">
            Programmatic API
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            After the script loads, a global{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">CallyEmbed</code>{" "}
            object is available for manual control:
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono">
            {`// Open the widget programmatically\nCallyEmbed.open();\n\n// Close it\nCallyEmbed.close();\n\n// Check state\nCallyEmbed.isOpen(); // true | false`}
          </pre>
          <p className="text-sm text-[var(--text-muted)] mt-3">
            You can also listen to events dispatched on{" "}
            <code className="bg-gray-100 px-1 rounded text-xs">document</code>:
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono mt-2">
            {`document.addEventListener("cally:booked", (e) => {\n  console.log("Booking confirmed!", e.detail);\n});\n\ndocument.addEventListener("cally:contacted", (e) => {\n  console.log("Contact form sent!", e.detail);\n});`}
          </pre>
        </div>
      </div>
    </div>
  );
}
