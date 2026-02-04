"use client";

import type { TenantDnsRecord } from "@/types";
import DomainStatusBadge from "./DomainStatusBadge";

interface DnsRecordStatusProps {
  records: TenantDnsRecord[];
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
}

export default function DnsRecordStatus({
  records,
  mxVerified,
  spfVerified,
  dkimVerified,
}: DnsRecordStatusProps) {
  const getRecordVerification = (record: TenantDnsRecord): boolean => {
    if (record.type === "MX") return mxVerified;
    if (record.type === "TXT" && record.value.includes("spf"))
      return spfVerified;
    if (record.type === "CNAME" && record.name.includes("._domainkey"))
      return dkimVerified;
    return false;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">
        DNS Records Status
      </h4>
      <div className="space-y-2">
        {records.map((record, index) => (
          <div
            key={index}
            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-200 text-gray-700 rounded">
                    {record.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {record.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">{record.value}</p>
                <p className="text-xs text-gray-500 mt-1">{record.purpose}</p>
              </div>
              <DomainStatusBadge
                verified={getRecordVerification(record)}
                pending={!getRecordVerification(record)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
