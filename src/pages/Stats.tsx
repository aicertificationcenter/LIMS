import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { BarChart3, Users, ClipboardCheck, Timer, ArrowUpRight, ArrowDownRight, CheckCircle } from 'lucide-react';

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
      <header className="card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, var(--kaic-navy) 0%, #1e293b 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>안녕하세요, {user?.name}님! 👋</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '1.1rem' }}>{targetMonthNum}월 시험 현황을 실시간으로 확인하세요.</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>조회 월 선택</span>
          <input 
            type="month" 
            className="input-field" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ fontWeight: 600, padding: '0.5rem 1rem', width: '180px', background: 'white', color: 'black' }}
          />
        </div>
      </header>

      {/* KPI Cards */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>총 접수 건수</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--kaic-navy)' }}>{total}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(0, 102, 179, 0.1)', borderRadius: '12px', color: 'var(--kaic-blue)' }}>
            <ClipboardCheck size={24} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>시험 진행 중</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0', color: '#f59e0b' }}>{inProgress}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b' }}>
            <Timer size={24} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>발행 완료</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0', color: '#10b981' }}>{completed}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      {/* Process Distribution */}
      <section className="card" style={{ gridColumn: 'span 2' }}>
        <h2 className="card-title">시험 프로세스 분포</h2>
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#e2e8f0" strokeWidth="3.8"></circle>
              {total > 0 && (
                <>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#10b981" strokeWidth="3.8" strokeDasharray={`${(completed/total)*100} 100`} strokeDashoffset="0"></circle>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f59e0b" strokeWidth="3.8" strokeDasharray={`${(inProgress/total)*100} 100`} strokeDashoffset={`-${(completed/total)*100}`}></circle>
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#3b82f6" strokeWidth="3.8" strokeDasharray={`${(receivedCount/total)*100} 100`} strokeDashoffset={`-${((completed+inProgress)/total)*100}`}></circle>
                </>
              )}
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{total}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#475569', minWidth: '80px' }}>접수 대기</span>
              <span style={{ fontWeight: 700 }}>{receivedCount}건</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#475569', minWidth: '80px' }}>진행 중</span>
              <span style={{ fontWeight: 700 }}>{inProgress}건</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#475569', minWidth: '80px' }}>발행 완료</span>
              <span style={{ fontWeight: 700 }}>{completed}건</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent List */}
      <section className="card" style={{ gridColumn: 'span 3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none' }}>{targetMonthNum}월 상세 목록</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'progress', 'completed'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid #cbd5e1',
                  background: activeTab === tab ? 'var(--kaic-navy)' : 'white',
                  color: activeTab === tab ? 'white' : 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >
                {tab === 'all' ? '전체' : tab === 'progress' ? '진행/대기' : '완료'}
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>의뢰 기관</th>
              <th>의뢰자</th>
              <th>상태</th>
              <th>접수 일시</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {displayTests.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{r.barcode}</td>
                <td style={{ fontWeight: 600 }}>{r.clientId}</td>
                <td>{r.clientName}</td>
                <td><StatusBadge status={r.status} label={getStatusLabel(r.status)} /></td>
                <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(r.receivedAt).toLocaleString()}</td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', minHeight: 'auto', fontSize: '0.8rem', marginBottom: 0 }} onClick={() => setViewingTest(r)}>조회</button>
                </td>
              </tr>
            ))}
            {displayTests.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
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
