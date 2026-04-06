
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.25rem 0 0.5rem 0',
      borderTop: '1px solid #f1f5f9',
      marginTop: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>표시 행 수:</span>
        <select 
          className="input-field" 
          value={itemsPerPage} 
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1); // Reset to page 1 on limit change
          }}
          style={{ width: '80px', margin: 0, padding: '4px 8px', minHeight: '34px', fontSize: '0.85rem', fontWeight: 700, background: '#fff' }}
        >
          {[10, 30, 50, 100].map(val => (
            <option key={val} value={val}>{val}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          총 {totalItems}건 중 {startIdx}-{endIdx} 표시
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button 
          type="button"
          className="btn btn-secondary" 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(1)}
          style={{ padding: '6px', minWidth: '36px', minHeight: '36px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.4 : 1 }}
        >
          <ChevronsLeft size={18} />
        </button>
        <button 
          type="button"
          className="btn btn-secondary" 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: '6px', minWidth: '36px', minHeight: '36px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={18} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>
          {currentPage} / {totalPages}
        </div>

        <button 
          type="button"
          className="btn btn-secondary" 
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: '6px', minWidth: '36px', minHeight: '36px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.4 : 1 }}
        >
          <ChevronRight size={18} />
        </button>
        <button 
          type="button"
          className="btn btn-secondary" 
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(totalPages)}
          style={{ padding: '6px', minWidth: '36px', minHeight: '36px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.4 : 1 }}
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
};
