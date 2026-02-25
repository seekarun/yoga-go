"use client";

import CopyText from "@/components/CopyText";
import type { TenantDnsRecord } from "@/types";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
  priority?: number;
}

interface DnsInstructionsProps {
  records: (DnsRecord | TenantDnsRecord)[];
  title?: string;
  description?: string;
}

export default function DnsInstructions({
  records,
  title = "DNS Records to Add",
  description = "Add the following DNS records at your domain registrar:",
}: DnsInstructionsProps) {
  if (records.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">{title}</h4>
      <p className="text-sm text-blue-800 mb-3">{description}</p>
      <div className="space-y-3">
        {records.map((record, index) => (
          <div
            key={index}
            className="bg-white border border-blue-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-blue-100 text-blue-800 rounded">
                {record.type}
              </span>
              <span className="text-xs text-blue-700">{record.purpose}</span>
            </div>
            <div className="space-y-1.5">
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">Name</span>
                <CopyText text={record.name} />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">
                  Value
                </span>
                <CopyText text={record.value} />
              </div>
              {record.priority !== undefined && (
                <div>
                  <span className="text-xs text-gray-500 block mb-0.5">
                    Priority
                  </span>
                  <span className="text-sm font-mono text-gray-900">
                    {record.priority}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-blue-700 mt-3">
        DNS changes can take up to 48 hours to propagate. You can check
        verification status at any time.
      </p>
    </div>
  );
}
