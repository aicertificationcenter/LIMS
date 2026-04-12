/**
 * @file Invoices.tsx
 * @description 관리자가 시험 접수 건에 대해 견적서(Invoice)를 작성, 관리 및 발송하는 페이지입니다.
 * 품목 편집, 자동 금액 계산, PDF 생성 및 이메일 발송 기능을 포함합니다.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Trash2, Send, Download, Search, Plus, Printer, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ReceptionDetailModal } from '../components/ReceptionDetailModal';
import { Pagination } from '../components/Pagination';

export const Invoices = () => {
  // 인증 및 라우팅 상태
  const { user } = useAuth();
  
  // 데이터 상태 관리
  const [receptions, setReceptions] = useState<any[]>([]); // 견적 대상 접수 목록
  const [selectedSample, setSelectedSample] = useState<any>(null); // 현재 선택된 접수 건
  const [searchTerm, setSearchTerm] = useState(''); // 사이드바 검색어
  
  // 견적서(인보이스) 세부 상태
  const [items, setItems] = useState<any[]>([{ title: '', unitCost: 0, qty: 1, price: 0 }]); // 품목 리스트
  const [discountRate, setDiscountRate] = useState(0);   // 할인율 (%)
  const [discountAmount, setDiscountAmount] = useState(0); // 할인액 (₩)
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT'); // 할인 방식
  
  // 페이지네이션 상태 (사이드바 목록용)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // UI 상태 및 Ref
  const [isSending, setIsSending] = useState(false); // 메일 발송 중 플래그
  const [showDetailModal, setShowDetailModal] = useState(false); // 접수 상세 모달 표시 여부
  const invoiceRef = useRef<HTMLDivElement>(null); // PDF 출력을 위한 DOM 참조

  /** 초기 데이터 로드 */
  useEffect(() => {
    fetchData();
  }, []);

  /** URL 파라미터를 통한 접수 건 자동 선택 처리 */
  useEffect(() => {
    if (receptions.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      if (targetId) {
        const found = receptions.find(r => r.id === targetId);
        if (found) setSelectedSample(found);
      }
    }
  }, [receptions]);

  /** 선택된 접수 건에 따라 기존 인보이스 데이터를 양식에 매핑 */
  useEffect(() => {
    if (selectedSample) {
      if (selectedSample.invoice?.items?.length > 0) {
        setItems(selectedSample.invoice.items.map((it: any) => ({
          title: it.title,
          unitCost: it.unitCost,
          qty: it.qty,
          price: it.price
        })));
        setDiscountRate(selectedSample.invoice.discountRate || 0);
        setDiscountAmount(selectedSample.invoice.discountAmt || 0);
        setDiscountType(selectedSample.invoice.discountType || 'PERCENT');
      } else {
        // 기존 인보이스가 없는 경우 초기화
        setItems([{ title: '', unitCost: 0, qty: 1, price: 0 }]);
        setDiscountRate(0);
        setDiscountAmount(0);
        setDiscountType('PERCENT');
      }
    }
  }, [selectedSample]);

  /** 전체 접수 내역 조회 */
  const fetchData = async () => {
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('데이터 조회 실패:', err);
    }
  };

  /** 필터링된 접수 목록 (이미 견적 발행된 상건 제외) */
  const filteredReceptions = useMemo(() => {
    return receptions.filter(r => {
      const matchSearch = r.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && !r.invoice;
    });
  }, [receptions, searchTerm]);

  /** 페이지네이션 처리된 목록 추출 */
  const paginatedReceptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReceptions.slice(start, start + itemsPerPage);
  }, [filteredReceptions, currentPage, itemsPerPage]);

  /** 견적 항목 추가 */
  const handleAddItem = () => {
    setItems([...items, { title: '', unitCost: 0, qty: 1, price: 0 }]);
  };

  /** 
   * 견적 항목의 필드 업데이트 (금액 자동 계산 포함)
   * @param index 항목 인덱스
   * @param field 변경할 필드명
   * @param value 새로운 값
   */
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'unitCost' || field === 'qty') {
        newItems[index].price = (newItems[index].unitCost || 0) * (newItems[index].qty || 0);
    }
    setItems(newItems);
  };

  /** 견적 항목 삭제 */
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  /** 모든 항목의 공급가액 합계 (소계) */
  const subtotal = useMemo(() => items.reduce((acc, current) => acc + (current.price || 0), 0), [items]);
  
  /** 할인 금액 계산 (정률/정액 대응) */
  const discountAmt = useMemo(() => {
    if (discountType === 'PERCENT') {
        return Math.floor(subtotal * (discountRate / 100));
    } else {
        return discountAmount;
    }
  }, [subtotal, discountRate, discountAmount, discountType]);

  // 최종 합계 및 세액 계산
  const summary = subtotal - discountAmt;
  const vat = Math.floor(summary * 0.1);
  const total = summary + vat;

  /** HTML 요소를 PDF 블롭으로 변환 */
  const generatePDFBlob = async () => {
    if (!invoiceRef.current) return null;
    const canvas = await html2canvas(invoiceRef.current, { scale: 1.5, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');
  };

  /** 
   * 견적서를 서버에 저장하고 고객에게 이메일로 발송합니다.
   * 저장 시 현재 입력된 모든 항목과 계산된 금액들이 포함됩니다.
   */
  const handleMailInvoice = async () => {
    if (!selectedSample?.email) {
        alert('송신할 의뢰처의 이메일 주소가 없습니다.');
        return;
    }
    setIsSending(true);
    try {
      // 1. 견적서 데이터를 서버에 저장
      const savedInvoice = await apiClient.invoices.create({
        sampleId: selectedSample.id,
        invoiceNo: selectedSample.barcode, 
        items: items.map(it => ({ title: it.title, unitCost: it.unitCost, qty: it.qty, price: it.price })),
        subtotal,
        discountRate: discountType === 'PERCENT' ? discountRate : 0,
        discountAmt: discountAmt,
        discountType: discountType,
        vat,
        total
      });

      // UI 상태 즉시 반영 (낙관적 업데이트)
      setSelectedSample({ ...selectedSample, invoice: savedInvoice, status: 'QUOTED' });
      await new Promise(resolve => setTimeout(resolve, 300));

      // 2. PDF 생성 및 메일 발송
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
            content: `안녕하세요, ${selectedSample.clientName} 담당자님.\n요청하신 시험에 대한 견적서(${savedInvoice.invoiceNo})를 첨부하여 보내드립니다.\n확인 부탁드립니다.\n\n감사합니다.\n한국인공지능검증원 드림.`,
            recipients: [selectedSample.email],
            attachments: [{ filename: `견적서_${savedInvoice.invoiceNo}.pdf`, content: base64data }]
          })
        });
        if (res.ok) {
           alert('✅ 견적서 저장 및 메일 발송이 모두 완료되었습니다.');
           fetchData(); 
        } else {
           alert(`❌ 견적서는 저장되었으나 메일 발송에 실패했습니다.`);
        }
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
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ marginBottom: '1rem' }}
        />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paginatedReceptions.map(r => (
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
          {paginatedReceptions.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>대상이 없습니다.</p>}
        </div>

        <Pagination 
          totalItems={filteredReceptions.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </aside>

      {/* Main Content: Vertical Editor & Preview */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Selected Reception Header */}
        {selectedSample && (
          <div className="card" style={{ background: 'var(--kaic-navy)', color: 'white', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <FileText size={20} style={{ flexShrink: 0 }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}>시험 대상 정보:</span>
                  <span 
                    style={{ 
                      color: '#fbbf24', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      fontWeight: 800
                    }} 
                    title={selectedSample.target || '정보 없음'}
                  >
                    {selectedSample.target || '정보 없음'}
                  </span>
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', opacity: 0.85, alignItems: 'center' }}>
                   <span><strong>의뢰처:</strong> {selectedSample.clientId}</span>
                   <span><strong>담당자:</strong> {selectedSample.clientName}</span>
                   <span><strong>연락처:</strong> {selectedSample.phone || '-'}</span>
                   <span><strong>접수일:</strong> {new Date(selectedSample.receivedAt).toLocaleDateString()}</span>
                   {selectedSample.invoice && (
                     <span style={{ 
                       background: '#10b981', 
                       color: 'white', 
                       padding: '2px 8px', 
                       borderRadius: '4px', 
                       fontSize: '0.75rem', 
                       fontWeight: 800,
                       marginLeft: '10px'
                     }}>
                       ✅ 서버 저장 완료
                     </span>
                   )}
                </div>
              </div>
              
              <button 
                onClick={() => setShowDetailModal(true)}
                style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                접수 상세 내역 보기 <Search size={14} />
              </button>
            </div>
          </div>
        )}

        {showDetailModal && selectedSample && (
          <ReceptionDetailModal 
            reception={selectedSample} 
            onClose={() => setShowDetailModal(false)} 
          />
        )}

        {/* Invoice Item Editor */}
        <div className="card">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 className="card-title" style={{ margin: 0, border: 'none' }}>견적 세부 항목 편집</h2>
              {selectedSample && (
                <button className="btn btn-primary" onClick={handleAddItem} style={{ margin: 0, padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={18} /> 항목 추가
                </button>
              )}
           </div>
           
           {selectedSample ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 150px 40px', gap: '12px', padding: '0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>
                      <div>품목 또는 시험명</div>
                      <div>단가 (₩)</div>
                      <div style={{ textAlign: 'center' }}>수량</div>
                      <div style={{ textAlign: 'right' }}>금액</div>
                      <div></div>
                   </div>
                   {items.map((item, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 150px 40px', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                        <input 
                          className="input-field" 
                          placeholder="시험 내용 입력" 
                          value={item.title} 
                          onChange={e => handleUpdateItem(idx, 'title', e.target.value)} 
                          style={{ margin: 0 }} 
                        />
                        <input 
                          className="input-field" 
                          type="number" 
                          placeholder="0" 
                          value={item.unitCost} 
                          onChange={e => handleUpdateItem(idx, 'unitCost', parseInt(e.target.value)||0)} 
                          style={{ margin: 0, textAlign: 'right' }} 
                        />
                        <input 
                          className="input-field" 
                          type="number" 
                          placeholder="1" 
                          value={item.qty} 
                          onChange={e => handleUpdateItem(idx, 'qty', parseInt(e.target.value)||1)} 
                          style={{ margin: 0, textAlign: 'center' }} 
                        />
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, textAlign: 'right', color: 'var(--kaic-navy)' }}>{(item.price || 0).toLocaleString()}₩</div>
                        <button onClick={() => handleRemoveItem(idx)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}><Trash2 size={20} /></button>
                     </div>
                   ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: '#f1f5f9', padding: '1.5rem', borderRadius: '12px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '8px', color: '#475569' }}>할인 설정</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select 
                          className="input-field" 
                          value={discountType} 
                          onChange={(e) => setDiscountType(e.target.value as any)}
                          style={{ width: '80px', margin: 0 }}
                        >
                          <option value="PERCENT">%</option>
                          <option value="AMOUNT">₩</option>
                        </select>
                        <input 
                          className="input-field" 
                          type="number" 
                          value={discountType === 'PERCENT' ? discountRate : discountAmount} 
                          onChange={e => {
                            const val = parseInt(e.target.value)||0;
                            if (discountType === 'PERCENT') setDiscountRate(val);
                            else setDiscountAmount(val);
                          }} 
                          style={{ width: '120px', margin: 0 }} 
                        />
                     </div>
                   </div>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     <button className="btn btn-primary" style={{ margin: 0, minHeight: '52px', padding: '0 2rem', fontSize: '1.1rem', background: 'var(--kaic-navy)' }} onClick={handleMailInvoice} disabled={isSending}>
                        <Send size={20} style={{ marginRight: '8px' }} /> {isSending ? '발송 중...' : '견적서 메일 발송'}
                     </button>
                     <button className="btn btn-secondary" style={{ margin: 0, minHeight: '52px', padding: '0 2rem', fontSize: '1.1rem' }} onClick={async () => { const blob = await generatePDFBlob(); if(blob) { const url = URL.createObjectURL(blob); window.open(url); } }}>
                        <Download size={20} style={{ marginRight: '8px' }} /> PDF 다운로드
                     </button>
                   </div>
                </div>
             </div>
           ) : (
             <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8', fontSize: '1.1rem' }}>왼쪽 목록에서 견적을 발행할 대상을 선택해 주세요.</div>
           )}
        </div>

        {/* Live Preview (100% Scale) */}
        {selectedSample && (
          <div className="card" style={{ background: '#334155', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Printer size={20} /> 실시간 견적서 미리보기 (100% 실사 크기)
            </h3>
            
            {/* The A4 Wrapper */}
            <div style={{ 
                width: '210mm',
                height: 'auto',
                overflow: 'visible',
                borderRadius: '4px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                background: 'white'
            }}>
              <div 
                ref={invoiceRef}
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm', 
                  background: 'white', 
                  padding: '20mm 15mm', 
                  boxSizing: 'border-box',
                  fontFamily: '"Malgun Gothic", sans-serif',
                  color: '#333',
                  position: 'relative',
                  transformOrigin: 'top left',
                }}
              >
                {/* Invoice Header */}
                <img 
                  src="/KOLAS.jpg" 
                  alt="Background Watermark" 
                  style={{ 
                    position: 'absolute', 
                    top: '55%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    width: '160mm', 
                    opacity: 0.06, 
                    zIndex: 0, 
                    pointerEvents: 'none' 
                  }} 
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '46px', fontWeight: 900, letterSpacing: '8px', whiteSpace: 'nowrap' }}>견 적 서</h1>
                    <img src="/KOLAS.jpg" alt="KOLAS/ILAC Logo" style={{ height: '75px', objectFit: 'contain' }} />
                  </div>
                  
                  <div style={{ background: '#1e3a8a', padding: '10px 15px', color: 'white', fontSize: '10px', fontWeight: 600, textAlign: 'center', borderRadius: '4px', lineHeight: 1.5 }}>
                    KOLAS/ILAC 국제공인시험기관 한국인공지능검증원 (KT1177) / KOREA Artificial Intrlligence Certification(EU NB ISO 17025 Accredited)<br/>
                    KS X ISO/IEC 25023:2016 / KS X ISO/IEC 25051:2014 / 과학기술정보통신부 고시 제 2024-41호
                  </div>
                </div>

                {/* Left intentionally blank or add margin down since original subheader is removed */}
                <div style={{ marginBottom: '20px' }}></div>

                {/* Client Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px', marginBottom: '10px' }}>
                  <div style={{ border: '2px solid #e2e8f0', padding: '15px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', marginBottom: '8px' }}>Client</div>
                      <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{selectedSample?.clientId || '의뢰처명'}</div>
                      <div style={{ fontSize: '13px' }}>({selectedSample?.bizNo || '사업자번호'})</div>
                      <div style={{ marginTop: '10px', fontWeight: 700 }}>의뢰자: {selectedSample?.clientName || '성함'} 귀하</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', fontSize: '13px', alignItems: 'center' }}>
                      <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 700 }}>접수번호</div>
                      <div style={{ borderBottom: '1px solid #e2e8f0', padding: '6px' }}>{selectedSample?.barcode || '-'}</div>
                      <div style={{ background: '#f1f5f9', padding: '6px 12px', fontWeight: 700 }}>견적번호</div>
                      <div style={{ borderBottom: '1px solid #e2e8f0', padding: '6px', fontWeight: 800, color: 'var(--kaic-navy)' }}>
                        {selectedSample?.invoice?.invoiceNo || '발행 예정'}
                        {selectedSample?.invoice?.previousNos && (
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                            (이전: {selectedSample.invoice.previousNos})
                          </div>
                        )}
                      </div>
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
                      <span style={{ color: '#64748b' }}>
                        Discount {discountType === 'PERCENT' ? `(${discountRate}%)` : `(₩)`}
                      </span>
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
                </div>

                <div style={{ position: 'absolute', bottom: '22mm', left: '0', right: '0', textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div style={{ fontSize: '26px', fontWeight: 900, position: 'relative', zIndex: 1, letterSpacing: '4px' }}>한국인공지능검증원장</div>
                    <img 
                      src="/stamp.png" 
                      alt="Company Stamp" 
                      style={{ 
                        position: 'absolute',
                        right: '-16mm',
                        top: '-12mm',
                        height: '76px', 
                        opacity: 0.85,
                        zIndex: 2,
                        pointerEvents: 'none'
                      }} 
                    />
                  </div>
                </div>
                
                <div style={{ position: 'absolute', bottom: '10mm', left: '15mm', right: '15mm', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
                  서울시 성동구 왕십리로 58, 416호(서울숲 FORHU) | Tel: 02-123-4567 | www.aicerti.com
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
