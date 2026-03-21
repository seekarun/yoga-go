"use client";

import { useState, useRef } from "react";
import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

interface ParsedContact {
  name: string;
  email: string;
}

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (created: number, skipped: number) => void;
}

export default function ImportContactsModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportContactsModalProps) {
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setContacts([]);
    setFileName("");
    setParseError("");
    setImportError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (!importing) {
      reset();
      onClose();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setImportError("");
    setFileName(file.name);

    try {
      const text = await file.text();
      const ext = file.name.toLowerCase().split(".").pop();

      let parsed: ParsedContact[];
      if (ext === "vcf" || ext === "vcard") {
        parsed = parseVCard(text);
      } else if (ext === "csv" || ext === "tsv" || ext === "txt") {
        parsed = parseCsv(text);
      } else {
        setParseError(
          "Unsupported file format. Please use CSV, TSV, or vCard (.vcf) files.",
        );
        setContacts([]);
        return;
      }

      if (parsed.length === 0) {
        setParseError(
          "No valid contacts found. Make sure the file has name and email columns.",
        );
        setContacts([]);
        return;
      }

      // Deduplicate by email
      const seen = new Set<string>();
      const unique = parsed.filter((c) => {
        const key = c.email.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setContacts(unique);
    } catch {
      setParseError("Failed to read the file. Please try again.");
      setContacts([]);
    }
  };

  const handleImport = async () => {
    if (contacts.length === 0) return;

    setImporting(true);
    setImportError("");

    try {
      const res = await fetch("/api/data/app/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: contacts.map((c) => ({
            name: c.name,
            email: c.email,
            message: `Imported from ${fileName}`,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const { created, skipped } = data.data;
        reset();
        onImportComplete(created, skipped);
      } else {
        setImportError(data.error || "Failed to import contacts");
      }
    } catch {
      setImportError("Failed to import contacts. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-2xl"
      closeOnBackdropClick={!importing}
      closeOnEscape={!importing}
    >
      <ModalHeader onClose={handleClose}>Import Contacts</ModalHeader>

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Upload a CSV or vCard (.vcf) file to import contacts.
      </p>

      {/* File upload */}
      <div className="mb-4">
        <label
          htmlFor="contact-file"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border)] px-4 py-6 transition-colors hover:border-[var(--color-primary)] hover:bg-gray-50"
        >
          <svg
            className="h-5 w-5 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm text-[var(--text-muted)]">
            {fileName || "Choose a file (.csv, .vcf)"}
          </span>
          <input
            ref={fileInputRef}
            id="contact-file"
            type="file"
            accept=".csv,.tsv,.txt,.vcf,.vcard"
            onChange={handleFileChange}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>

      {parseError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {parseError}
        </div>
      )}

      {/* Preview table */}
      {contacts.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-main)]">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} found
          </p>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-[var(--text-muted)]">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {contacts.slice(0, 100).map((c, i) => (
                  <tr key={`${c.email}-${i}`}>
                    <td className="px-3 py-2 text-[var(--text-main)]">
                      {c.name}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {c.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length > 100 && (
              <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                ...and {contacts.length - 100} more
              </p>
            )}
          </div>
        </div>
      )}

      {importError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {importError}
        </div>
      )}

      <ModalFooter>
        <SecondaryButton onClick={handleClose} disabled={importing}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={handleImport}
          loading={importing}
          disabled={contacts.length === 0}
        >
          Import {contacts.length > 0 ? `${contacts.length} Contacts` : ""}
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  );
}

// =============================================
// Parsing Utilities
// =============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCsv(text: string): ParsedContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";

  const headers = firstLine.split(delimiter).map((h) =>
    h
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase(),
  );

  // Find column indices
  const emailIdx = headers.findIndex(
    (h) =>
      h === "email" ||
      h === "e-mail" ||
      h === "email address" ||
      h === "emailaddress",
  );
  const nameIdx = headers.findIndex(
    (h) => h === "name" || h === "full name" || h === "fullname",
  );
  const firstNameIdx = headers.findIndex(
    (h) =>
      h === "first name" ||
      h === "firstname" ||
      h === "first" ||
      h === "given name" ||
      h === "givenname",
  );
  const lastNameIdx = headers.findIndex(
    (h) =>
      h === "last name" ||
      h === "lastname" ||
      h === "last" ||
      h === "surname" ||
      h === "family name" ||
      h === "familyname",
  );

  if (emailIdx === -1) return [];

  const contacts: ParsedContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const email = cols[emailIdx]?.trim().replace(/^["']|["']$/g, "");
    if (!email || !EMAIL_REGEX.test(email)) continue;

    let name = "";
    if (nameIdx !== -1) {
      name = cols[nameIdx]?.trim().replace(/^["']|["']$/g, "") || "";
    }
    if (!name && (firstNameIdx !== -1 || lastNameIdx !== -1)) {
      const first =
        firstNameIdx !== -1
          ? cols[firstNameIdx]?.trim().replace(/^["']|["']$/g, "") || ""
          : "";
      const last =
        lastNameIdx !== -1
          ? cols[lastNameIdx]?.trim().replace(/^["']|["']$/g, "") || ""
          : "";
      name = [first, last].filter(Boolean).join(" ");
    }
    if (!name) {
      name = email.split("@")[0];
    }

    contacts.push({ name, email: email.toLowerCase() });
  }

  return contacts;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const blocks = text.split(/BEGIN:VCARD/i).slice(1);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    let name = "";
    let email = "";

    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.startsWith("FN:") || upper.startsWith("FN;")) {
        name = line.substring(line.indexOf(":") + 1).trim();
      } else if (upper.startsWith("EMAIL:") || upper.startsWith("EMAIL;")) {
        email = line
          .substring(line.indexOf(":") + 1)
          .trim()
          .toLowerCase();
      }
    }

    if (email && EMAIL_REGEX.test(email)) {
      if (!name) name = email.split("@")[0];
      contacts.push({ name, email });
    }
  }

  return contacts;
}
