
import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Trash2, Send, Download, Search } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Invoices = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Invoice State
  const [items, setItems] = useState<any[]>([{ title: '', unitCost: 0, qty: 1, price: 0 }]);
  const [discountRate, setDiscountRate] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('Fetch data failed:', err);
    }
  };

  const filteredReceptions = useMemo(() => {
    return receptions.filter(r => 
      r.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receptions, searchTerm]);

  const handleAddItem = () => {
    setItems([...items, { title: '', unitCost: 0, qty: 1, price: 0 }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'unitCost' || field === 'qty') {
        newItems[index].price = newItems[index].unitCost * newItems[index].qty;
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => items.reduce((acc, current) => acc + (current.price || 0), 0), [items]);
  const discountAmt = Math.floor(subtotal * (discountRate / 100));
  const summary = subtotal - discountAmt;
  const vat = Math.floor(summary * 0.1);
  const total = summary + vat;

  const generatePDFBlob = async () => {
    if (!invoiceRef.current) return null;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');
  };

  const handleMailInvoice = async () => {
    if (!selectedSample?.email) {
        alert('송신할 의뢰처의 이메일 주소가 없습니다.');
        return;
    }
    setIsSending(true);
    try {
      const blob = await generatePDFBlob();
      if (!blob) throw new Error('PDF 생성 실패');
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `[견적서] ${selectedSample.clientId} 귀하 - 한국인공지능검증원`,
            content: `안녕하세요, ${selectedSample.clientName} 담당자님.\n요청하신 시험에 대한 견적서를 첨부하여 보내드립니다.\n확인 부탁드립니다.\n\n감사합니다.\n한국인공지능검증원 드림.`,
            recipients: [selectedSample.email],
            attachments: [{ filename: `견적서_${selectedSample.barcode}.pdf`, content: base64data }]
          })
        });
        if (res.ok) alert('견적서가 이메일로 성공적으로 발송되었습니다.');
        else alert('발송 실패');
      };
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (user?.role !== 'ADMIN') return <div style={{ padding: '4rem', textAlign: 'center' }}>접근 권한이 없습니다.</div>;

  return (
    <main className="dashboard-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: 'calc(100vh - 100px)' }}>
      
      {/* Sidebar: Receptions Selector */}
      <aside className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} /> 견적 대상 선택
        </h3>
        <input 
          className="input-field" 
          placeholder="기관명 또는 번호 검색" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredReceptions.map(r => (
            <div 
              key={r.id} 
              onClick={() => setSelectedSample(r)}
              style={{ padding: '12px', borderRadius: '8px', border: `2px solid ${selectedSample?.id === r.id ? 'var(--kaic-blue)' : '#f1f5f9'}`, background: selectedSample?.id === r.id ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{r.barcode}</div>
              <div style={{ fontWeight: 700 }}>{r.clientId}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(r.receivedAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content: Editor & Preview */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', overflowY: 'auto' }}>
        
        {/* Invoice Item Editor */}
        <div className="card">
           <h2 className="card-title">견적 세부 항목 편집</h2>
           {selectedSample ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontWeight: 800, color: 'var(--kaic-navy)' }}>{selectedSample.barcode} - 품목 추가</span>
                   <button className="btn btn-secondary" onClick={handleAddItem} style={{ margin: 0, padding: '4px 12px', fontSize: '0.8rem' }}>+ 항목 추가</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {items.map((item, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.5fr 0.8fr 36px', gap: '8px', alignItems: 'center' }}>
                        <input className="input-field" placeholder="품목 또는 시험명" value={item.title} onChange={e => handleUpdateItem(idx, 'title', e.target.value)} style={{ margin: 0, fontSize: '0.85rem' }} />
                        <input className="input-field" type="number" placeholder="단가" value={item.unitCost} onChange={e => handleUpdateItem(idx, 'unitCost', parseInt(e.target.value)||0)} style={{ margin: 0, fontSize: '0.85rem' }} />
                        <input className="input-field" type="number" placeholder="수량" value={item.qty} onChange={e => handleUpdateItem(idx, 'qty', parseInt(e.target.value)||1)} style={{ margin: 0, fontSize: '0.85rem' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>{(item.price || 0).toLocaleString()}₩</div>
                        <button onClick={() => handleRemoveItem(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                     </div>
                   ))}
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                   <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>할인율 (%)</label>
                   <input className="input-field" type="number" value={discountRate} onChange={e => setDiscountRate(parseInt(e.target.value)||0)} style={{ width: '100px' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                   <button className="btn btn-primary" style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleMailInvoice} disabled={isSending}>
                      <Send size={18} /> {isSending ? '발송 중...' : '견적서 메일 발송'}
                   </button>
                   <button className="btn btn-secondary" style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={async () => { const blob = await generatePDFBlob(); if(blob) { const url = URL.createObjectURL(blob); window.open(url); } }}>
                      <Download size={18} /> PDF 다운로드
                   </button>
                </div>
             </div>
           ) : (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>왼쪽 목록에서 대상을 선택하세요.</div>
           )}
        </div>

        {/* Live Preview (Real Invoice Style) */}
        <div style={{ overflow: 'auto', background: '#334155', padding: '2rem', borderRadius: '16px' }}>
          <div 
            ref={invoiceRef}
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              background: 'white', 
              margin: '0 auto', 
              padding: '20mm 15mm', 
              boxSizing: 'border-box',
              fontFamily: '"Malgun Gothic", sans-serif',
              color: '#333',
              position: 'relative'
            }}
          >
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #1e3a8a', paddingBottom: '15px', marginBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 900, letterSpacing: '4px' }}>견 적 서</h1>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '32px', color: '#64748b', fontWeight: 300 }}>Invoice</h2>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                KOLAS 공인시험기관 제 1177호 (ISO/IEC 25023, 25051)
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ fontWeight: 900, fontSize: '14px' }}>(주) 한국인공지능검증원</div>
                 <div style={{ fontSize: '11px' }}>AI Certification</div>
              </div>
            </div>

            {/* Client Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px', marginBottom: '40px' }}>
               <div style={{ border: '2px solid #e2e8f0', padding: '15px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginBottom: '8px' }}>Client</div>
                  <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{selectedSample?.clientId || '의뢰처명'}</div>
                  <div style={{ fontSize: '13px' }}>({selectedSample?.bizNo || '사업자번호'})</div>
                  <div style={{ marginTop: '10px', fontWeight: 700 }}>의뢰자: {selectedSample?.clientName || '성함'} 귀하</div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 700 }}>일련번호</div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', padding: '6px' }}>{selectedSample?.barcode || '-'}</div>
                  <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 700 }}>견적일자</div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', padding: '6px' }}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 700 }}>유효기한</div>
                  <div style={{ borderBottom: '1px solid #e2e8f0', padding: '6px' }}>견적일로부터 60일</div>
               </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>항목 (Title)</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>단가 (Unit Cost)</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>수량 (Qty)</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px' }}>공급가액 (Price)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700 }}>{item.title || '항목 내용을 입력하세요'}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>{(item.unitCost || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>{item.qty || 0}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700 }}>{(item.price || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary / Totals */}
            <div style={{ marginLeft: 'auto', width: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Sub Total (소계)</span>
                  <span style={{ fontWeight: 700 }}>{subtotal.toLocaleString()} ₩</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Discount ({discountRate}%)</span>
                  <span style={{ color: '#ef4444' }}>- {discountAmt.toLocaleString()} ₩</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700 }}>Summary (합계)</span>
                  <span style={{ fontWeight: 900 }}>{summary.toLocaleString()} ₩</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>VAT (Tax 10%)</span>
                  <span style={{ fontWeight: 700 }}>{vat.toLocaleString()} ₩</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', background: '#f8fafc', padding: '8px', marginTop: '10px', borderTop: '2px solid #1e3a8a' }}>
                  <span style={{ fontWeight: 900, color: '#1e3a8a' }}>Total (합계)</span>
                  <span style={{ fontWeight: 900, color: '#1e3a8a' }}>{total.toLocaleString()} ₩</span>
               </div>
            </div>

            <div style={{ marginTop: '60px', fontSize: '13px' }}>
              위와 같이 견적합니다.
              <div style={{ marginTop: '10px' }}>* 첨부: 시험신청서 1부</div>
            </div>

            <div style={{ position: 'absolute', bottom: '20mm', right: '15mm', textAlign: 'right' }}>
               <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '5px' }}>한국인공지능검증원장</div>
               <div style={{ position: 'relative', display: 'inline-block' }}>
                 <img src="/stamp.png" alt="Company Stamp" style={{ height: '60px', opacity: 0.8 }} />
               </div>
            </div>
            
            <div style={{ position: 'absolute', bottom: '10mm', left: '15mm', right: '15mm', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
               서울시 성동구 왕십리로 58, 416호(서울숲 FORHU) | Tel: 02-123-4567 | www.aicerti.com
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
