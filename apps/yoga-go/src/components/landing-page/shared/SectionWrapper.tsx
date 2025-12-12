'use client';

import type { ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  sectionId: string;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export default function SectionWrapper({
  children,
  label,
  isSelected,
  isDisabled,
  onClick,
}: SectionWrapperProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        transition: 'all 0.2s ease',
        outline: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
        outlineOffset: '-3px',
      }}
      onMouseEnter={e => {
        if (!isSelected && !isDisabled) {
          e.currentTarget.style.outline = '3px solid #93c5fd';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.outline = '3px solid transparent';
        }
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
          opacity: 0,
          transform: 'translateY(-4px)',
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
