
import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const map: Record<string, { bg: string, label: string }> = {
    'RECEIVED': { bg: '#3b82f6', label: '시험의뢰' },
    'QUOTED': { bg: '#6366f1', label: '견적발송' },
    'ASSIGNED': { bg: '#8b5cf6', label: '시험원배정' },
    'IN_PROGRESS': { bg: '#f59e0b', label: '시험진행' },
    'COMPLETED': { bg: '#10b981', label: '발행 완료' },
    'DISPOSED': { bg: '#ef4444', label: '폐기 완료' }
  };

  const info = map[status] || { bg: '#64748b', label: status };

  return (
    <span 
      style={{ 
        background: info.bg, 
        color: 'white', 
        padding: '3px 10px', 
        borderRadius: '20px', 
        fontSize: '0.75rem', 
        fontWeight: 700, 
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}
    >
      {label || info.label}
    </span>
  );
};
