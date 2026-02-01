'use client';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface AdminTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function AdminTabs({ tabs, activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div
      style={{
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', gap: '32px' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '16px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: isActive ? 'var(--color-primary)' : '#718096',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    background: isActive ? 'var(--color-primary)' : '#e2e8f0',
                    color: isActive ? '#fff' : '#718096',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
