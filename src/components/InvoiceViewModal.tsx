
import React from 'react';
import { FileText, X, CheckCircle } from 'lucide-react';

interface InvoiceViewModalProps {
  invoice: any;
  onClose: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: 0, boxShadow: '0 25px 50px -12px rgba(0,0, 0, 0.25)', border: 'none' }}>
        <div style={{ padding: '1.5rem 2rem', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} /> 발행된 견적서 상세 내역
          </h2>
          <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>접수 번호</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{invoice.invoiceNo}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>발행 일시</div>
              <div style={{ fontWeight: 600 }}>{new Date(invoice.date).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '10px 0', fontSize: '0.85rem' }}>품목/시험명</th>
                  <th style={{ padding: '10px 0', fontSize: '0.85rem', textAlign: 'right' }}>단가</th>
                  <th style={{ padding: '10px 0', fontSize: '0.85rem', textAlign: 'center' }}>수량</th>
                  <th style={{ padding: '10px 0', fontSize: '0.85rem', textAlign: 'right' }}>금액</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 0', fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>₩{item.unitCost.toLocaleString()}</td>
                    <td style={{ padding: '12px 0', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>₩{item.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginLeft: 'auto', width: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
               <span style={{ color: '#64748b' }}>공급가액</span>
               <span style={{ fontWeight: 600 }}>₩{invoice.subtotal.toLocaleString()}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444' }}>
               <span>할인액 ({invoice.discountRate}%)</span>
               <span>-₩{invoice.discountAmt.toLocaleString()}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
               <span style={{ color: '#64748b' }}>부가세 (VAT)</span>
               <span style={{ fontWeight: 600 }}>₩{invoice.vat.toLocaleString()}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--kaic-navy)', borderTop: '2px solid #e2e8f0', paddingTop: '10px', marginTop: '5px' }}>
               <span>최종 합계</span>
               <span>₩{invoice.total.toLocaleString()}</span>
             </div>
          </div>

          <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #10b981' }}>
             <CheckCircle style={{ color: '#10b981' }} size={24} />
             <div style={{ fontSize: '0.9rem', color: '#065f46' }}>
                해당 견적서는 의뢰처 이메일로 정상 발송되었으며, 시스템에 보관된 사본입니다.
             </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};
