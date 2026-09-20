import React, { useState, useRef, useEffect } from 'react';
import { QualityLevel } from '../../../types/mediaPlayer';
import { Settings, Check } from 'lucide-react';

interface QualitySelectorProps {
  qualities: QualityLevel[];
  currentQuality: number;
  onSelectQuality: (qualityId: number) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  currentQuality,
  onSelectQuality
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!qualities || qualities.length <= 1) {
    return null;
  }

  const activeQualityLabel =
    qualities.find(q => q.id === currentQuality)?.label || 'Auto';

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '8px',
          color: '#FFFFFF',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(8px)'
        }}
        title="Streaming Quality"
        aria-label="Quality settings"
      >
        <Settings size={15} color="var(--brand-gold, #F5C518)" />
        <span>{activeQualityLabel}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: 0,
            minWidth: '150px',
            backgroundColor: 'rgba(18, 20, 29, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary, #9CA3AF)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '4px'
            }}
          >
            Stream Quality
          </div>

          {qualities.map((item) => {
            const isSelected = item.id === currentQuality;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectQuality(item.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{item.label}</span>
                {isSelected && <Check size={14} color="var(--brand-gold, #F5C518)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
