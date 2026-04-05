
import React from 'react';
import { FileText, X } from 'lucide-react';

interface ReceptionDetailModalProps {
  reception: any;
  onClose: () => void;
}

export const ReceptionDetailModal: React.FC<ReceptionDetailModalProps> = ({ reception, onClose }) => {
  if (!reception) return null;

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'RECEIVED': return '접수 대기';
      case 'IN_PROGRESS': return '시험 중';
      case 'COMPLETED': return '발행 완료';
      default: return status;
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: 0, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: 'none' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} /> 접수 상세 정보 (Reception Details)
          </h2>
          <button 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>접수번호</label><span style={{ fontWeight: 800, color: 'var(--kaic-navy)' }}>{reception.barcode}</span></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>진행상태</label><span className={`badge badge-${reception.status.toLowerCase()}`}>{getStatusLabel(reception.status)}</span></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>의뢰처 / 의뢰인</label><span style={{ fontWeight: 700 }}>{reception.clientId} / {reception.clientName} 담당</span></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>사업자번호 / 이메일</label><span style={{ fontWeight: 700 }}>{reception.bizNo || 'N/A'} / {reception.email || 'N/A'}</span></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>연락처</label><span style={{ fontWeight: 700 }}>{reception.phone || 'N/A'}</span></div>
            <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>총괄 담당자</label><span style={{ fontWeight: 700, color: '#047857' }}>{reception.tests?.[0]?.tester?.name || '미배정'}</span></div>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>시험 대상</h3>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {reception.target || reception.content || 'N/A'}
          </div>
          
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>기타 및 상담 사항</h3>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {reception.extra || reception.consultation || 'N/A'}
          </div>
          
          {reception.status === 'COMPLETED' && reception.reportPdfUrl && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fffa', borderRadius: '16px', border: '1px solid #c6f6d5', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#276749' }}>✅ 최종 시험 완료 리포트가 업로드되어 있습니다.</h4>
              <button 
                onClick={() => { const win = window.open(); win?.document.write(`<html><body style="margin:0"><iframe src="${reception.reportPdfUrl}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe></body></html>`); }} 
                className="btn btn-primary" 
                style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}
              >
                <FileText size={18} /> 발행 성적서 (PDF) PDF 열기
              </button>
            </div>
          )}
        </div>
        
        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-secondary" style={{ margin: 0, minHeight: '40px' }} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};
