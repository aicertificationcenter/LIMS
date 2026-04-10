import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { CheckCircle, Clock, FileCheck, XCircle, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { GapjiPreview } from '../components/GapjiPreview';
import { EuljiPreview } from '../components/EuljiPreview';

export const Approvals = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [viewingGapji, setViewingGapji] = useState<any>(null);
  const [viewingEulji, setViewingEulji] = useState<any>(null);
  const [rejectMode, setRejectMode] = useState<'GAPJI' | 'EULJI' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filters
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    if (user && ['ADMIN', 'TECH_MGR', 'QUAL_MGR'].includes(user.role)) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
      const uData = await apiClient.users.list();
      setUsers(uData);
    } catch (err) {
      console.error('결재 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const targetYear = selectedMonth.split('-')[0];
  const targetMonthNum = parseInt(selectedMonth.split('-')[1], 10);

  const filteredData = useMemo(() => {
    return receptions.filter(r => {
      const date = new Date(r.receivedAt);
      if (date.getFullYear().toString() !== targetYear || (date.getMonth() + 1) !== targetMonthNum) return false;
      return ['APPROVAL_REQUESTED', 'REVISING', 'APPROVED', 'COMPLETED'].includes(r.status);
    });
  }, [receptions, selectedMonth, targetYear, targetMonthNum]);

  const stats = useMemo(() => {
    return {
      requested: filteredData.filter(r => r.status === 'APPROVAL_REQUESTED').length,
      revising: filteredData.filter(r => r.status === 'REVISING').length,
      approved: filteredData.filter(r => ['APPROVED', 'COMPLETED'].includes(r.status)).length,
    };
  }, [filteredData]);

  const handleAction = async (id: string, actionType: 'GAPJI' | 'EULJI', isApproved: boolean) => {
    if (!isApproved && !rejectionReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    try {
      await apiClient.approvals.process({ id, actionType, isApproved, rejectionReason: isApproved ? undefined : rejectionReason });
      alert(isApproved ? '승인되었습니다.' : '반려되었습니다.');
      setRejectMode(null);
      setRejectionReason('');
      setViewingGapji(null);
      setViewingEulji(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user || !['ADMIN', 'TECH_MGR', 'QUAL_MGR'].includes(user.role)) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>접근 권한이 없습니다.</div>;
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>결재 데이터를 불러오는 중...</div>;

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <header className="card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, var(--kaic-navy) 0%, #2563eb 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', border: 'none' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>관리자 결재함</h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '1rem' }}>시험원들이 제출한 성적서(갑지/을지)를 검토하고 승인합니다.</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>조회 월 선택</span>
          <input type="month" className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ fontWeight: 700, width: '160px' }} />
        </div>
      </header>

      {/* 대시보드 상태표시 */}
      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>결재 요청</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem', color: '#f59e0b' }}>{stats.requested}</div>
          </div>
          <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '16px', color: '#f59e0b' }}><Clock size={28} /></div>
        </div>
      </div>
      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>수정 중 (반려)</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem', color: '#ef4444' }}>{stats.revising}</div>
          </div>
          <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '16px', color: '#ef4444' }}><AlertCircle size={28} /></div>
        </div>
      </div>
      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>승인 완료</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem', color: '#10b981' }}>{stats.approved}</div>
          </div>
          <div style={{ padding: '1rem', background: '#d1fae5', borderRadius: '16px', color: '#10b981' }}><FileCheck size={28} /></div>
        </div>
      </div>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title">결재 대기 목록</h2>
        
        {filteredData.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>접수번호 (정식번호)</th>
                <th>의뢰 기관</th>
                <th>시험항목(품목)</th>
                <th>담당 시험원</th>
                <th>진행 상태</th>
                <th>갑지 검토</th>
                <th>을지 검토</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 800, color: 'var(--kaic-blue)' }}>
                    <div>{r.barcode}</div>
                    {r.formalBarcode && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>{r.formalBarcode}</div>}
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.client}</td>
                  <td style={{ fontSize: '0.85rem' }}>{r.testProduct || '-'}</td>
                  <td style={{ color: '#047857', fontWeight: 600 }}>{r.tests?.[0]?.tester?.name || '-'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.gapjiApproved ? (
                      <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><CheckCircle size={16}/> 승인됨</span>
                    ) : (
                      <button className="btn btn-primary" style={{ padding: '4px 12px', minHeight: '32px', margin: 0 }} onClick={() => setViewingGapji(r)}>갑지 확인</button>
                    )}
                  </td>
                  <td>
                    {r.euljiApproved ? (
                       <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><CheckCircle size={16}/> 승인됨</span>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '4px 12px', minHeight: '32px', margin: 0 }} onClick={() => setViewingEulji(r)}>을지 확인</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>결재요청 건이 없습니다.</div>
        )}
      </section>

      {/* 갑지 모달 */}
      {viewingGapji && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '1000px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
             <div style={{ padding: '1rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>성적서 (갑지) 결재</h2>
                <button onClick={() => { setViewingGapji(null); setRejectMode(null); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
             </div>
             <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
               <GapjiPreview test={viewingGapji} users={users} />
             </div>
             
             <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: 'white' }}>
               {rejectMode === 'GAPJI' ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <label style={{ fontWeight: 700, color: '#ef4444' }}>갑지 반려 사유 입력:</label>
                   <textarea className="input-field" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="시험원에게 전달될 반려 사유를 상세히 적어주세요." />
                   <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                     <button className="btn btn-secondary" onClick={() => setRejectMode(null)}>취소</button>
                     <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleAction(viewingGapji.id, 'GAPJI', false)}>반려 저장</button>
                   </div>
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                   {viewingGapji.gapjiRejection && (
                     <div style={{ background: '#fef2f2', border: '1px solid #ef4444', padding: '12px 20px', borderRadius: '8px', color: '#b91c1c', fontWeight: 700, width: '100%', maxWidth: '800px' }}>
                       🚨 [이전 반려 내용] {viewingGapji.gapjiRejection}
                     </div>
                   )}
                   <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                     <button className="btn" style={{ background: '#ef4444', color: 'white', padding: '12px 30px', fontWeight: 700 }} onClick={() => setRejectMode('GAPJI')}><XCircle size={18} style={{ marginRight: '6px' }}/> 반려</button>
                     <button className="btn btn-primary" style={{ padding: '12px 30px', fontWeight: 700, background: '#10b981' }} onClick={() => handleAction(viewingGapji.id, 'GAPJI', true)}><CheckCircle size={18} style={{ marginRight: '6px' }}/> 승인</button>
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* 을지 모달 */}
      {viewingEulji && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '1000px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
             <div style={{ padding: '1rem 2rem', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>성적서 (을지) 결재</h2>
                <button onClick={() => { setViewingEulji(null); setRejectMode(null); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
             </div>
             <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#f1f5f9' }}>
               <EuljiPreview test={viewingEulji} user={user} />
             </div>
             
             <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: 'white' }}>
               {rejectMode === 'EULJI' ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <label style={{ fontWeight: 700, color: '#ef4444' }}>을지 반려 사유 입력:</label>
                   <textarea className="input-field" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="시험원에게 전달될 반려 사유를 상세히 적어주세요." />
                   <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                     <button className="btn btn-secondary" onClick={() => setRejectMode(null)}>취소</button>
                     <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleAction(viewingEulji.id, 'EULJI', false)}>반려 저장</button>
                   </div>
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                   {viewingEulji.euljiRejection && (
                     <div style={{ background: '#fef2f2', border: '1px solid #ef4444', padding: '12px 20px', borderRadius: '8px', color: '#b91c1c', fontWeight: 700, width: '100%', maxWidth: '800px' }}>
                       🚨 [이전 반려 내용] {viewingEulji.euljiRejection}
                     </div>
                   )}
                   <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                     <button className="btn" style={{ background: '#ef4444', color: 'white', padding: '12px 30px', fontWeight: 700 }} onClick={() => setRejectMode('EULJI')}><XCircle size={18} style={{ marginRight: '6px' }}/> 반려</button>
                     <button className="btn btn-primary" style={{ padding: '12px 30px', fontWeight: 700, background: '#10b981' }} onClick={() => handleAction(viewingEulji.id, 'EULJI', true)}><CheckCircle size={18} style={{ marginRight: '6px' }}/> 승인</button>
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </main>
  );
};
