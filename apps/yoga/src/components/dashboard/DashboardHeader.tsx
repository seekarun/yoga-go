interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // For action buttons, etc.
}

export default function DashboardHeader({ title, subtitle, children }: DashboardHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
