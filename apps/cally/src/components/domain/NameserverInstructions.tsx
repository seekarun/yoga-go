"use client";

import CopyText from "@/components/CopyText";

interface NameserverInstructionsProps {
  nameservers: string[];
}

export default function NameserverInstructions({
  nameservers,
}: NameserverInstructionsProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">
        Configure Your Nameservers
      </h4>
      <p className="text-sm text-blue-800 mb-3">
        Log in to your domain registrar and update your nameservers to:
      </p>
      <div className="space-y-2">
        {nameservers.map((ns, index) => (
          <CopyText key={index} text={ns} />
        ))}
      </div>
      <p className="text-xs text-blue-700 mt-3">
        DNS changes can take up to 48 hours to propagate. You can check
        verification status at any time.
      </p>
    </div>
  );
}
