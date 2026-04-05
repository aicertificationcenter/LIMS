import { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Search, Filter, ClipboardCheck, AlertCircle } from 'lucide-react';
import { InvoiceViewModal } from '../components/InvoiceViewModal';

export const Reception = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTesterId, setFilterTesterId] = useState('');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchData();
    // Check for search query param
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, []);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceptions = useMemo(() => {
    return receptions.filter(r => {
      const companyMatch = r.clientId?.toLowerCase().includes(searchQuery.toLowerCase());
      const personMatch = r.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const testerIdMatch = !filterTesterId || r.tests?.[0]?.testerId === filterTesterId;
      return (companyMatch || personMatch) && testerIdMatch;
    });
  }, [receptions, searchQuery, filterTesterId]);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/stats" replace />;
  }

  // Form states
  const [client, setClient] = useState('');
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState('');
  const [extra, setExtra] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newRec = await apiClient.receptions.create({ 
        client, clientName, email, bizNo, phone, target, extra 
      });
      alert(`신규 시험 접수가 완료되었습니다.\n접수번호: ${newRec.barcode}`);
      fetchData(); // Refresh list
      
      // Clear forms
      setClient(''); setClientName(''); setEmail(''); setBizNo(''); setPhone(''); setTarget(''); setExtra('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTester = async (recId: string, testerId: string) => {
    if (testerId) {
      try {
        await apiClient.receptions.assign(recId, testerId);
        fetchData();
        alert(`시험원에게 성공적으로 배정되었습니다.`);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>데이터를 불러오는 중...</div>;
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      
      {/* 1. 신규 접수 폼 */}
      <section className="card" style={{ gridColumn: 'span 4', padding: '2rem' }}>
        <h2 className="card-title" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>신규 시험 접수하기</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>의뢰처 (회사기관)</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' }} value={client} onChange={e=>setClient(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>의뢰인 (담당자명)</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' }} value={clientName} onChange={e=>setClientName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>이메일</label>
            <input className="input-field" type="email" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' }} value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>사업자등록번호</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' }} value={bizNo} onChange={e=>setBizNo(e.target.value)} placeholder="000-00-00000" />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="form-label" style={{ width: '130px', marginBottom: 0, fontWeight: 700, color: '#475569' }}>연락처 (전화)</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' }} value={phone} onChange={e=>setPhone(e.target.value)} required />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <label className="form-label" style={{ width: '130px', marginTop: '0.75rem', marginBottom: 0, fontWeight: 700, color: '#475569' }}>시험대상</label>
            <textarea className="input-field" maxLength={2000} rows={4} value={target} onChange={e=>setTarget(e.target.value)} required style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a', resize: 'vertical' }}></textarea>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <label className="form-label" style={{ width: '130px', marginTop: '0.75rem', marginBottom: 0, fontWeight: 700, color: '#475569' }}>기타</label>
            <textarea className="input-field" maxLength={2000} rows={4} value={extra} onChange={e=>setExtra(e.target.value)} style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#0f172a', resize: 'vertical' }}></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px' }} disabled={isSubmitting}>
             접수 서류 시스템 등록 (이후 수정 불가) 
          </button>
        </form>
      </section>

      {/* 2. 기등록된 접수 현황 */}
      <section className="card" style={{ gridColumn: 'span 8', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none' }}>최근 등록된 접수 목록 (통합 조회)</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="기업명 혹은 담당자 검색" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '4px 10px 4px 35px', margin: 0, minHeight: '36px', fontSize: '0.85rem', width: '200px' }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <select 
                className="input-field" 
                value={filterTesterId}
                onChange={e => setFilterTesterId(e.target.value)}
                style={{ padding: '4px 10px 4px 35px', margin: 0, minHeight: '36px', fontSize: '0.85rem', width: '180px' }}
              >
                <option value="">모든 시험원 (전체)</option>
                {users.map(u => (
                   <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredReceptions.map(r => (
            <div key={r.id} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, color: 'var(--kaic-navy)', fontSize: '1.4rem', fontWeight: 900 }}>
                        {r.clientId} 
                      </h3>
                      <span className={`badge badge-${r.status.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>{r.status}</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#64748b' }}>
                      <span style={{ fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: 'var(--kaic-blue)' }}>{r.barcode}</span>
                      <span style={{ opacity: 0.6 }}>|</span>
                      <span style={{ fontWeight: 600 }}>담당: {r.clientName}</span>
                   </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                   <div style={{ 
                     background: 'rgba(56, 189, 248, 0.1)', 
                     color: '#0369a1', 
                     padding: '8px 16px', 
                     borderRadius: '12px', 
                     fontWeight: 800, 
                     fontSize: '0.95rem',
                     border: '1px solid rgba(56, 189, 248, 0.2)'
                   }}>
                      🕒 {new Date(r.receivedAt).toLocaleString('ko-KR', { 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                   </div>
                   <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                      전산 자동 접수 완료
                   </div>
                </div>
              </div>

              {/* Assignment bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>현장 시험원 배정:</span>
                    {user?.role === 'ADMIN' && r.status === 'RECEIVED' ? (
                      <select 
                        className="input-field"
                        style={{ minHeight: '36px', padding: '0 10px', fontSize: '0.85rem', marginBottom: 0, width: '200px', background: '#fff' }}
                        onChange={(e) => handleAssignTester(r.id, e.target.value)}
                        value={r.tests?.[0]?.testerId || ''}
                      >
                        <option value="" disabled>시험원 선택</option>
                        {users.filter(u => u.role !== 'ADMIN').map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
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

              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#ef4444' }}>
                ※ 등록이 완료된 서류입니다. (수정 불가 모드 - Read Only)
              </div>

              {/* Invoice Status Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                {r.invoice ? (
                  <button 
                    className="btn" 
                    onClick={() => { setSelectedInvoice(r.invoice); setShowInvoiceModal(true); }}
                    style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}
                  >
                     <ClipboardCheck size={18} /> 발행견적 확인하기
                  </button>
                ) : (
                  <button 
                    className="btn" 
                    onClick={() => navigate(`/invoices?id=${r.id}`)}
                    style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#fff7ed', color: '#9a3412', border: '1px solid #ffedd5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, cursor: 'pointer' }}
                  >
                     <AlertCircle size={18} /> 견적발행 필요
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredReceptions.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: '4rem' }}>검색 결과가 없습니다.</p>}
        </div>
      </section>

      {showInvoiceModal && selectedInvoice && (
        <InvoiceViewModal 
          invoice={selectedInvoice} 
          onClose={() => { setShowInvoiceModal(false); setSelectedInvoice(null); }} 
        />
      )}
    </main>
  );
};
