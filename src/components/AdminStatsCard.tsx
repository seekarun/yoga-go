interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function AdminStatsCard({
  title,
  value,
  icon,
  description,
  trend,
}: AdminStatsCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <div>
          <div
            style={{ fontSize: '14px', color: '#718096', marginBottom: '4px', fontWeight: '500' }}
          >
            {title}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2d3748' }}>{value}</div>
        </div>
        <div
          style={{
            fontSize: '32px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f7fafc',
            borderRadius: '12px',
          }}
        >
          {icon}
        </div>
      </div>
      {description && (
        <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>{description}</div>
      )}
      {trend && (
        <div
          style={{
            fontSize: '14px',
            color: trend.isPositive ? '#48bb78' : '#f56565',
            fontWeight: '500',
          }}
        >
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
}
