/**
 * @file Reception.tsx
 * @description 관리자가 신규 시험 접수를 등록하고, 접수된 건들에 대해 시험원(Tester)을 배정하는 페이지입니다.
 * 접수 현황 조회, 필터링, 검색 및 인보이스(견격서) 상태 확인 기능을 포함합니다.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Search, Filter, ClipboardCheck, AlertCircle, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';
import { InvoiceViewModal } from '../components/InvoiceViewModal';
import { Pagination } from '../components/Pagination';

export const Reception = () => {
  // 인증 및 네비게이션
  const { user } = useAuth();
  const navigate = useNavigate();

  // 데이터 상태 관리
  const [receptions, setReceptions] = useState<any[]>([]); // 전체 접수 내역
  const [users, setUsers] = useState<any[]>([]);          // 시험원 배정을 위한 사용자 목록
  const [loading, setLoading] = useState(true);           // 데이터 로딩 상태
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState('');     // 의뢰처/인물 검색어
  const [filterTesterId, setFilterTesterId] = useState(''); // 특정 시험원별 필터링

  // 인보이스 모달 관련 상태
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalPosition, setModalPosition] = useState<{ x: number, y: number } | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 로컬 입력 상태 (목록 보정용)
  const [consultationDrafts, setConsultationDrafts] = useState<Record<string, string>>({});
  const [selectedTesters, setSelectedTesters] = useState<Record<string, string>>({});

  // 컴포넌트 마운트 시 초기 데이터 로드 및 URL 검색어 반영
  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, []);

  /** 서버로부터 접수 목록과 사용자 목록을 동시 로드 */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [recList, userList] = await Promise.all([
        apiClient.receptions.list(),
        apiClient.users.list()
      ]);
      setReceptions(recList);
      setUsers(userList);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  /** 검색어 및 시험원 필터에 따른 목록 필터링 (Memoization 적용) */
  const filteredReceptions = useMemo(() => {
    return receptions.filter(r => {
      const companyMatch = r.clientId?.toLowerCase().includes(searchQuery.toLowerCase());
      const personMatch = r.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const testerIdMatch = 
        filterTesterId === 'UNASSIGNED' 
          ? !r.tests?.length 
          : (!filterTesterId || r.tests?.[0]?.testerId === filterTesterId);
      return (companyMatch || personMatch) && testerIdMatch;
    });
  }, [receptions, searchQuery, filterTesterId]);

  /** 특정 접수 건의 상담 메모 업데이트 */
  const handleUpdateConsultation = async (id: string) => {
    const consultation = consultationDrafts[id];
    try {
      await apiClient.receptions.update({ id, consultation });
      alert('상담내용이 성공적으로 저장되었습니다.');
      // 변경 사항 반영을 위해 목록 다시 불러오기
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('상담내용 수정 실패:', err);
      alert('상담내용 저장에 실패했습니다.');
    }
  };

  /** 현재 페이지에 표시할 접수 데이터 추출 */
  const paginatedReceptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReceptions.slice(start, start + itemsPerPage);
  }, [filteredReceptions, currentPage, itemsPerPage]);

  // --- 신규 접수 입력 폼 상태 ---
  const [client, setClient] = useState('');           // 의뢰 기관
  const [clientName, setClientName] = useState('');   // 담당자명
  const [email, setEmail] = useState('');             // 이메일
  const [bizNo, setBizNo] = useState('');             // 사업자번호
  const [phone, setPhone] = useState('');             // 전화번호
  const [target, setTarget] = useState('');           // 시험 대상
  const [extra, setExtra] = useState('');             // 기타 참고사항
  const [clientAddress, setClientAddress] = useState(''); // 의뢰처 주소
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 상태

  /** 신규 시험 접수 제출 처리 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 주소와 기타 정보를 JSON 형태로 'extra' 필드에 통합 저장
      const extraData = JSON.stringify({ clientAddress, note: extra });
      const newRec = await apiClient.receptions.create({ 
        client, clientName, email, bizNo, phone, target, extra: extraData 
      });
      alert(`신규 시험 접수가 완료되었습니다.\n접수번호: ${newRec.barcode}`);
      
      // 입력 폼 초기화 및 목록 갱신
      fetchData();
      setClient(''); setClientName(''); setEmail(''); setBizNo(''); setPhone(''); setTarget(''); setExtra(''); setClientAddress('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 특정 접수 건에 시험원 배정 */
  const handleAssignTester = async (recId: string, testerId: string) => {
    if (testerId) {
      try {
        await apiClient.receptions.assign(recId, testerId);
        fetchData(); // 배정 후 상태 갱신
        alert(`시험원에게 성공적으로 배정되었습니다.`);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // 관리 권한 체크 (레이아웃 보호)
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/stats" replace />;
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>데이터를 불러오는 중...</div>;
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      {/* 1. 신규 접수 입력 섹션 */}
      <section className="card" style={{ gridColumn: 'span 4', padding: '2rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>신규 시험 접수하기</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>의뢰처 (회사기관)</label>
            <input className="input-field" style={{ flex: 1 }} value={client} onChange={e=>setClient(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>의뢰인 (담당자명)</label>
            <input className="input-field" style={{ flex: 1 }} value={clientName} onChange={e=>setClientName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>이메일</label>
            <input className="input-field" type="email" style={{ flex: 1 }} value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>의뢰처 주소</label>
            <input className="input-field" style={{ flex: 1 }} value={clientAddress} onChange={e=>setClientAddress(e.target.value)} placeholder="의뢰 기관의 상세 주소를 입력하세요" />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>사업자등록번호</label>
            <input className="input-field" style={{ flex: 1 }} value={bizNo} onChange={e=>setBizNo(e.target.value)} placeholder="000-00-00000" />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>연락처 (전화)</label>
            <input className="input-field" style={{ flex: 1 }} value={phone} onChange={e=>setPhone(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <label className="form-label" style={{ width: '130px', marginTop: '0.75rem', marginBottom: 0, fontWeight: 700, color: '#475569' }}>시험대상</label>
            <textarea className="input-field" maxLength={2000} rows={4} value={target} onChange={e=>setTarget(e.target.value)} required style={{ flex: 1, resize: 'vertical' }}></textarea>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <label className="form-label" style={{ width: '130px', marginTop: '0.75rem', marginBottom: 0, fontWeight: 700, color: '#475569' }}>기타</label>
            <textarea className="input-field" maxLength={2000} rows={4} value={extra} onChange={e=>setExtra(e.target.value)} style={{ flex: 1, resize: 'vertical' }}></textarea>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px' }} disabled={isSubmitting}>
             접수 서류 시스템 등록 (이후 수정 불가) 
          </button>
        </form>
      </section>

      {/* 2. 접수 현황 및 필터 섹션 */}
      <section className="card" style={{ gridColumn: 'span 8', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none' }}>최근 등록된 접수 목록 (통합 조회)</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" className="input-field" placeholder="기업명 혹은 담당자 검색" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} style={{ paddingLeft: '35px', margin: 0, minHeight: '36px', fontSize: '0.85rem', width: '200px' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <select className="input-field" value={filterTesterId} onChange={e => { setFilterTesterId(e.target.value); setCurrentPage(1); }} style={{ paddingLeft: '35px', margin: 0, minHeight: '36px', fontSize: '0.85rem', width: '180px' }}>
                <option value="">모든 시험원 (전체)</option>
                <option value="UNASSIGNED">미배정</option>
                {users.filter(u => u.role !== 'RESIGNED').map(u => (
                   <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. 접수 항목 카드 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {paginatedReceptions.map(r => (
            <div key={r.id} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, color: 'var(--kaic-navy)', fontSize: '1.4rem', fontWeight: 900 }}>{r.clientId}</h3>
                      <span style={{ background: '#047857', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                        담당: {r.tests?.[0]?.tester?.name || '미배정'}
                      </span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>접수:</span>
                        <span style={{ fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: 'var(--kaic-blue)' }}>{r.barcode}</span>
                      </div>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>견적:</span>
                        {r.invoice ? (
                          <span style={{ fontWeight: 800, background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', color: '#1e40af' }}>{r.invoice.invoiceNo}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>미발행</span>
                        )}
                      </div>
                   </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                   <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0369a1', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      🕒 {new Date(r.receivedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                   </div>
                </div>
              </div>

              {/* 워크플로우 진행 단계 표시 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                 {[
                   { id: 'RECEIVED', label: '접수', isDone: true },
                   { id: 'QUOTED', label: '견적발송', isDone: !!r.invoice },
                   { id: 'ASSIGNED', label: '시험배정', isDone: !!r.tests?.[0]?.testerId },
                   { id: 'IN_PROGRESS', label: '시험진행', isDone: !!(r.testStartDate && r.testLocation) },
                   { id: 'COMPLETED', label: '완료', isDone: r.status === 'COMPLETED' || !!r.reportPdfUrl }
                 ].map((step, idx, arr) => {
                   const isCompleted = step.isDone;
                   const isCurrent = r.status === step.id;
                   return (
                     <React.Fragment key={step.id}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1 }}>
                         <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isCompleted ? 'var(--kaic-blue)' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none', transition: 'all 0.3s' }}>
                           {isCompleted ? '✓' : idx + 1}
                         </div>
                         <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isCompleted ? 'var(--kaic-navy)' : '#94a3b8', whiteSpace: 'nowrap' }}>{step.label}</span>
                       </div>
                       {idx < arr.length - 1 && (
                         <div style={{ flex: 1, height: '2px', background: (arr[idx+1].isDone) ? 'var(--kaic-blue)' : '#e2e8f0', margin: '0 -10px 15px -10px', minWidth: '20px', transition: 'background 0.3s' }}></div>
                       )}
                     </React.Fragment>
                   );
                 })}
              </div>

              {/* 시험원 배정 인터페이스 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>현장 시험원 배정:</span>
                    {user?.role === 'ADMIN' && r.status !== 'COMPLETED' ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          className="input-field" 
                          style={{ minHeight: '36px', fontSize: '0.85rem', marginBottom: 0, width: '160px' }} 
                          onChange={(e) => setSelectedTesters(prev => ({ ...prev, [r.id]: e.target.value }))} 
                          value={selectedTesters[r.id] ?? r.tests?.[0]?.testerId ?? ''}
                        >
                          <option value="" disabled>시험원 선택</option>
                          {users.filter(u => u.role !== 'ADMIN' && u.role !== 'RESIGNED').map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                        <button 
                          className="btn btn-primary" 
                          style={{ margin: 0, padding: '4px 12px', fontSize: '0.8rem', minHeight: '36px', width: 'auto', background: 'var(--kaic-blue)', borderRadius: '6px' }}
                          onClick={() => handleAssignTester(r.id, selectedTesters[r.id] ?? r.tests?.[0]?.testerId)}
                          disabled={!(selectedTesters[r.id] ?? r.tests?.[0]?.testerId)}
                        >
                          배정하기
                        </button>
                        {r.tests?.[0]?.tester?.name && (
                          <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
                            (현 배정: {r.tests[0].tester.name})
                          </span>
                        )}
                      </div>
                    ) : r.tests?.[0]?.tester?.name ? (
                      <span style={{ fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                        {r.tests[0].tester.name} 시험원 담당
                      </span>
                    ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>미배정</span>}
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>의뢰 기관:</strong> {r.clientId} ({r.clientName} 담당) <br/>
                  <strong>연락처 정보:</strong> {r.phone || 'N/A'} | {r.email || 'N/A'} <br/>
                  <strong>사업자 번호:</strong> {r.bizNo || 'N/A'}
                </div>
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>시험 대상:</strong> <br/>
                  {r.target?.substring(0, 100) || r.content?.substring(0, 100) || 'N/A'}...
                </div>
              </div>

              {/* 관리자 메모/상담내역 */}
              <div style={{ marginTop: '1.25rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px dotted var(--kaic-blue)', position: 'relative' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--kaic-navy)', marginBottom: '10px' }}>
                  <MessageSquare size={16} color="var(--kaic-blue)" /> 관리자 상담내용 (시험원 전달용)
                </label>
                <textarea 
                  className="input-field"
                  placeholder="시험원에게 전달할 특이사항이나 상세 상담 내용을 입력하세요..."
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                  value={consultationDrafts[r.id] ?? r.consultation ?? ''}
                  onChange={(e) => setConsultationDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> 작성 후 반드시 [상담내용 저장] 버튼을 클릭하세요.
                  </div>
                  <button 
                    onClick={() => handleUpdateConsultation(r.id)}
                    className="btn btn-primary"
                    style={{ 
                      margin: 0, padding: '6px 16px', fontSize: '0.8rem', minHeight: '32px', width: 'auto',
                      background: (consultationDrafts[r.id] !== undefined && consultationDrafts[r.id] !== (r.consultation || '')) ? 'var(--kaic-blue)' : '#94a3b8'
                    }}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> 상담내용 저장
                  </button>
                </div>
              </div>

              {/* 페이지 이동 버튼 (견적/인보이스) */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                {!!r.invoice ? (
                  <>
                    <button className="btn" onClick={(e) => { setSelectedInvoice(r.invoice); setModalPosition({ x: e.clientX, y: e.clientY }); setShowInvoiceModal(true); }} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}>
                       <ClipboardCheck size={18} /> 발행견적 확인
                    </button>
                    <button className="btn" onClick={() => navigate(`/invoices?id=${r.id}`)} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}>
                       <FileText size={18} /> 수정발행
                    </button>
                  </>
                ) : (
                  <button className="btn" onClick={() => navigate(`/invoices?id=${r.id}`)} style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#fff7ed', color: '#9a3412', border: '1px solid #ffedd5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}>
                     <AlertCircle size={18} /> 견적발행 필요
                  </button>
                )}
              </div>
            </div>
          ))}
          {paginatedReceptions.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: '4rem' }}>검색 결과가 없습니다.</p>}
        </div>

        {/* 페이지네이션 */}
        <Pagination 
          totalItems={filteredReceptions.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </section>

      {/* 인보이스 상세 정보 팝업(모달) */}
      {showInvoiceModal && selectedInvoice && (
        <InvoiceViewModal 
          invoice={selectedInvoice} 
          position={modalPosition}
          onClose={() => { setShowInvoiceModal(false); setSelectedInvoice(null); setModalPosition(null); }} 
        />
      )}
    </main>
  );
};
