"use client";

interface AdMetricsCardProps {
  label: string;
  value: string;
  subValue?: string;
}

export default function AdMetricsCard({
  label,
  value,
  subValue,
}: AdMetricsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="text-2xl font-bold text-[var(--text-main)] mt-1">{value}</p>
      {subValue && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{subValue}</p>
      )}
    </div>
  );
}
