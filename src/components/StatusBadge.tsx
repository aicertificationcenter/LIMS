/**
 * @file StatusBadge.tsx
 * @description 시험 의뢰의 진행 상태(RECEIVED, IN_PROGRESS 등)를 시각적으로 표시하는 공통 배지 컴포넌트입니다.
 * 상태 코드에 따라 정의된 배경색과 한글 라벨을 출력합니다.
 */

import React from 'react';

interface StatusBadgeProps {
  /** 시험 상태 코드 (예: 'RECEIVED', 'COMPLETED') */
  status: string;
  /** 명시적인 라벨이 있는 경우 우선적으로 표시 */
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  // 상태별 스타일 및 한글 라벨 매핑
  const map: Record<string, { bg: string, label: string }> = {
    'RECEIVED': { bg: '#3b82f6', label: '접수' },
    'QUOTED': { bg: '#6366f1', label: '견적발송' },
    'ASSIGNED': { bg: '#8b5cf6', label: '시험배정' },
    'IN_PROGRESS': { bg: '#f59e0b', label: '시험진행' },
    'APPROVAL_REQUESTED': { bg: '#ec4899', label: '결재중' },
    'REVISING': { bg: '#ef4444', label: '반려' },
    'APPROVED': { bg: '#14b8a6', label: '결재완료' },
    'COMPLETED': { bg: '#10b981', label: '완료' },
    'DISPOSED': { bg: '#94a3b8', label: '폐기 완료' }
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
