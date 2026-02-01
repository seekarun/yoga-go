'use client';

import type { ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  sectionId: string;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  hasSelection: boolean; // Whether any section is currently selected
  onClick: () => void;
}

export default function SectionWrapper({
  children,
  label,
  isSelected,
  isDisabled,
  hasSelection,
  onClick,
}: SectionWrapperProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  // Determine opacity:
  // - Disabled sections: 0.4
  // - When a section is selected: selected = 1, others = 0.3 (70% transparent)
  // - When no selection: all = 1
  const getOpacity = () => {
    if (isDisabled) return 0.4;
    if (hasSelection && !isSelected) return 0.3;
    return 1;
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        opacity: getOpacity(),
        transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isSelected ? '0 8px 30px rgba(0, 0, 0, 0.3)' : 'none',
      }}
    >
      {/* Section Label Badge */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          zIndex: 20,
          padding: '4px 12px',
          background: isSelected ? '#3b82f6' : 'rgba(0, 0, 0, 0.6)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: '500',
          borderRadius: '4px',
          pointerEvents: 'none',
          opacity: isSelected ? 1 : 0,
          transform: isSelected ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'all 0.2s ease',
        }}
        className="section-label"
      >
        {label}
      </div>

      {/* Content */}
      <div style={{ pointerEvents: 'none' }}>{children}</div>

      {/* Hover/Selected Styles */}
      <style jsx>{`
        div:hover .section-label {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
