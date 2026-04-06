
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { BarChart3, ClipboardCheck, Timer, FileText, Users } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export const Stats = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'progress' | 'completed'>('all');
  const [viewingTest, setViewingTest] = useState<any>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('Fetch stats failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const targetYear = selectedMonth.split('-')[0];
  const targetMonthNum = parseInt(selectedMonth.split('-')[1], 10);

  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return receptions;
    return receptions.filter(r => {
      const date = new Date(r.receivedAt);
      return date.getFullYear().toString() === targetYear && (date.getMonth() + 1) === targetMonthNum;
    });
  }, [receptions, selectedMonth, targetYear, targetMonthNum]);

  const testerStats = useMemo(() => {
    const stats: Record<string, any> = {};
    filteredByMonth.forEach(r => {
      const tester = r.tests?.[0]?.tester;
      if (!tester) return;
      
      const name = tester.name || tester.id;
      if (!stats[name]) {
        stats[name] = { name, assigned: 0, received: 0, progress: 0, completed: 0 };
      }
      
      stats[name].assigned += 1;
      if (r.status === 'RECEIVED') stats[name].received += 1;
      if (['QUOTED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)) stats[name].progress += 1;
      if (r.status === 'COMPLETED') stats[name].completed += 1;
    });
    return Object.values(stats);
  }, [filteredByMonth]);

  const displayTests = useMemo(() => {
    return filteredByMonth.filter(test => {
      if (activeTab === 'all') return true;
      if (activeTab === 'progress') return !['COMPLETED', 'DISPOSED'].includes(test.status);
      return test.status === 'COMPLETED';
    });
  }, [filteredByMonth, activeTab]);

  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayTests.slice(start, start + itemsPerPage);
  }, [displayTests, currentPage, itemsPerPage]);

  const total = filteredByMonth.length;
  const inProgress = filteredByMonth.filter(r => !['COMPLETED', 'DISPOSED'].includes(r.status)).length;
  const completed = filteredByMonth.filter(r => r.status === 'COMPLETED').length;
  
  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>통계 데이터를 실시간 분석 중...</div>;
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      
      {/* 1. Welcome Message */}
      <header className="card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, var(--kaic-navy) 0%, #2563eb 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', border: 'none' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>안녕하세요 {user?.name || '관리자'}님! 👋</h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '1rem' }}>{targetYear}년 {targetMonthNum}월 실시간 시험 업무 현황입니다.</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>조회 월 선택</span>
          <input 
            type="month" 
            className="input-field" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ fontWeight: 700, padding: '0.4rem 0.8rem', width: '160px', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }}
          />
        </div>
      </header>

      {/* 2. KPI Cards */}
      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>총 접수 건수</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem' }}>{total}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--kaic-light-blue)', borderRadius: '16px', color: 'var(--kaic-blue)' }}>
            <ClipboardCheck size={28} />
          </div>
        </div>
      </div>

      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>시험 진행 중</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem', color: '#3b82f6' }}>{inProgress}</div>
          </div>
          <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '16px', color: '#3b82f6' }}>
            <Timer size={28} />
          </div>
        </div>
      </div>

      <div className="kpi-card" style={{ gridColumn: 'span 4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>발행 완료</span>
            <div className="kpi-value" style={{ marginTop: '0.5rem', color: '#1e40af' }}>{completed}</div>
          </div>
          <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '16px', color: '#1e40af' }}>
            <BarChart3 size={28} />
          </div>
        </div>
      </div>

      {/* 3. Tester Stats Table */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
          <Users size={20} /> 시험원별 수행 현황 (Tester Metrics)
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>시험원 이름</th>
                <th>총 배정</th>
                <th>접수 대기</th>
                <th>시험 중</th>
                <th>시험 완료</th>
                <th>완료율</th>
              </tr>
            </thead>
            <tbody>
              {testerStats.map((s: any) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.assigned} 건</td>
                  <td>{s.received} 건</td>
                  <td>{s.progress} 건</td>
                  <td style={{ color: 'var(--kaic-blue)', fontWeight: 700 }}>{s.completed} 건</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '150px' }}>
                      <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--kaic-blue)', width: `${(s.completed/s.assigned)*100}%` }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem', minWidth: '40px' }}>{((s.completed/s.assigned)*100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {testerStats.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Real-time Test Table */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none', fontSize: '1.2rem' }}>실시간 시험 목록 (통합 조회)</h2>
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            {(['all', 'progress', 'completed'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                  background: activeTab === tab ? 'white' : 'transparent',
                  color: activeTab === tab ? 'var(--kaic-navy)' : '#64748b',
                  boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {tab === 'all' ? '전체' : tab === 'progress' ? '진행' : '완료'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>번호</th>
                <th>의뢰 기관</th>
                <th>상태</th>
                <th>담당 시험원</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{r.barcode}</td>
                  <td style={{ fontWeight: 600 }}>{r.clientId}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ color: '#047857', fontWeight: 600 }}>{r.tests?.[0]?.tester?.name || '-'}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => setViewingTest(r)}>조회</button>
                  </td>
                </tr>
              ))}
              {paginatedTests.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          totalItems={displayTests.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </section>

      {/* Detail Modal */}
      {viewingTest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>접수 상세 내역</h2>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }} onClick={() => setViewingTest(null)}>&times;</button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div><strong style={{ color: '#64748b' }}>번호:</strong> {viewingTest.barcode}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰기관:</strong> {viewingTest.clientId}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰자:</strong> {viewingTest.clientName}</div>
                <div><strong style={{ color: '#64748b' }}>사업자번호:</strong> {viewingTest.bizNo || 'N/A'}</div>
                <div><strong style={{ color: '#64748b' }}>이메일:</strong> {viewingTest.email || 'N/A'}</div>
                <div><strong style={{ color: '#64748b' }}>연락처:</strong> {viewingTest.phone || 'N/A'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>진행상태:</strong> <StatusBadge status={viewingTest.status} /></div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>시험 대상</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', minHeight: '80px' }}>
                {viewingTest.target || viewingTest.content || 'N/A'}
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>기타 및 상담 사항</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', minHeight: '80px' }}>
                {viewingTest.extra || viewingTest.consultation || 'N/A'}
              </div>
              
              {viewingTest.status === 'COMPLETED' && viewingTest.reportPdfUrl && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1' }}>최종 결과 리포트</h4>
                  <button 
                    onClick={() => { const win = window.open(); win?.document.write(`<html><body style="margin:0"><iframe src="${viewingTest.reportPdfUrl}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe></body></html>`); }} 
                    className="btn btn-primary" 
                    style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileText size={18} /> 발행 성적서 (PDF) 확인하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
