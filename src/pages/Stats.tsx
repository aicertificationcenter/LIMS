import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { BarChart3, ClipboardCheck, Timer } from 'lucide-react';

const StatusBadge = ({ status, label }: { status: string, label: string }) => {
  const roleMap: Record<string, string> = {
    'RECEIVED': 'received',
    'IN_PROGRESS': 'progress',
    'COMPLETED': 'completed',
  };
  return <span className={`badge badge-${roleMap[status] || 'received'}`}>{label}</span>;
};

export const Stats = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'progress' | 'completed'>('all');
  const [viewingTest, setViewingTest] = useState<any>(null);
  
  // Set current month as default (e.g. "2024-11")
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

  const displayTests = useMemo(() => {
    return filteredByMonth.filter(test => {
      if (activeTab === 'all') return true;
      if (activeTab === 'progress') return test.status === 'IN_PROGRESS' || test.status === 'RECEIVED';
      return test.status === 'COMPLETED';
    });
  }, [filteredByMonth, activeTab]);

  const total = filteredByMonth.length;
  const inProgress = filteredByMonth.filter(r => r.status === 'IN_PROGRESS').length;
  const completed = filteredByMonth.filter(r => r.status === 'COMPLETED').length;
  const receivedCount = filteredByMonth.filter(r => r.status === 'RECEIVED').length;

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'RECEIVED': return '접수 대기';
      case 'IN_PROGRESS': return '시험 중';
      case 'COMPLETED': return '발행 완료';
      default: return status;
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>통계 데이터를 실시간 분석 중...</div>;
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      {/* Welcome & Month Filter */}
      <header className="card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, var(--kaic-navy) 0%, #2563eb 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', border: 'none' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>안녕하세요, {user?.id}님! 👋</h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '1rem' }}>{targetYear}년 {targetMonthNum}월 ({user?.id}) 시험현황</p>
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

      {/* KPI Cards */}
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
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>+12%</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>전월 대비 포인트</span>
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
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700 }}>{((inProgress/total)*100 || 0).toFixed(0)}%</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>전체 대비 점유율</span>
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
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>{completed} 건</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>리포트 생성 완료</span>
        </div>
      </div>

      {/* Process Distribution */}
      <section className="card" style={{ gridColumn: 'span 4' }}>
        <h2 className="card-title" style={{ fontSize: '1rem' }}>프로세스 분포</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', width: '140px', height: '140px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
              {total > 0 && (
                <>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1d4ed8" strokeWidth="4" strokeDasharray={`${(completed/total)*100} 100`} strokeDashoffset="0"></circle>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray={`${(inProgress/total)*100} 100`} strokeDashoffset={`-${(completed/total)*100}`}></circle>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#93c5fd" strokeWidth="4" strokeDasharray={`${(receivedCount/total)*100} 100`} strokeDashoffset={`-${((completed+inProgress)/total)*100}`}></circle>
                </>
              )}
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{total}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#93c5fd' }}></div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>접수 대기</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{receivedCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>진행 중</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{inProgress}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1d4ed8' }}></div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>발행 완료</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{completed}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent List */}
      <section className="card" style={{ gridColumn: 'span 8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none', fontSize: '1.2rem' }}>실시간 시험 목록</h2>
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
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {displayTests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{r.barcode}</td>
                  <td style={{ fontWeight: 600 }}>{r.clientId}</td>
                  <td><StatusBadge status={r.status} label={getStatusLabel(r.status)} /></td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', minHeight: '32px', fontSize: '0.75rem', borderRadius: '6px' }} onClick={() => setViewingTest(r)}>조회</button>
                  </td>
                </tr>
              ))}
              {displayTests.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal */}
      {viewingTest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>상세 내역</h2>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }} onClick={() => setViewingTest(null)}>&times;</button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div><strong style={{ color: '#64748b' }}>번호:</strong> {viewingTest.barcode}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰기관:</strong> {viewingTest.clientId}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰자:</strong> {viewingTest.clientName}</div>
                <div><strong style={{ color: '#64748b' }}>상태:</strong> {viewingTest.status}</div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>의뢰 내용</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>{viewingTest.content}</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>상담 내역</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{viewingTest.consultation}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
