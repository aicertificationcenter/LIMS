import { useState, useMemo } from 'react';
import { MockAPI } from '../mocks';
import { useAuth } from '../AuthContext';

// --- Shared Components --- //

const StatusBadge = ({ status, label }: { status: 'received' | 'testing' | 'progress' | 'completed', label: string }) => {
  return <span className={`badge badge-${status}`}>{label}</span>;
};

export const Stats = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'progress' | 'completed'>('all');
  const [viewingTest, setViewingTest] = useState<any>(null);
  
  // Set current month as default (e.g. "2024-11")
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const allReceptions = MockAPI.getReceptions();

  const targetYear = selectedMonth.split('-')[0];
  const targetMonthNum = parseInt(selectedMonth.split('-')[1], 10);

  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return allReceptions; // 전체 보기
    
    return allReceptions.filter(r => {
      let year, month;
      if (r.date.includes('-')) {
        const parts = r.date.split(' ')[0].split('-');
        year = parts[0]; month = parseInt(parts[1], 10);
      } else if (r.date.includes('.')) {
        const parts = r.date.split('.');
        year = parts[0].trim(); month = parseInt(parts[1].trim(), 10);
      } else {
        return false; // 알 수 없는 날짜 포맷
      }
      return year === targetYear && month === targetMonthNum;
    });
  }, [allReceptions, selectedMonth, targetYear, targetMonthNum]);

  // Global KPIs (Updated logic)
  const newReceptions = filteredByMonth.filter(r => !r.testId).length;
  const consultationCount = filteredByMonth.filter(r => r.testId && r.status !== 'PROGRESS' && r.status !== 'COMPLETED').length;
  const testingCount = filteredByMonth.filter(r => r.status === 'PROGRESS').length;
  const completedCount = filteredByMonth.filter(r => r.status === 'COMPLETED').length;

  // My KPIs
  const myReceptions = filteredByMonth.filter(r => r.assignedTesterId === user?.id);
  const myTotalAssigned = myReceptions.length;
  const myInProgressCount = myReceptions.filter(r => r.status === 'TESTING' || r.status === 'PROGRESS').length;
  const myCompletedCount = myReceptions.filter(r => r.status === 'COMPLETED').length;

  const getStatusInfo = (status: string, hasTestId: boolean) => {
    if (!hasTestId) return { role: 'received', label: '신규 접수' };
    switch(status) {
      case 'RECEIVED': 
      case 'TESTING': return { role: 'testing', label: '시험 상담' };
      case 'PROGRESS': return { role: 'progress', label: '시험중' };
      case 'COMPLETED': return { role: 'completed', label: '발행 완료' };
      default: return { role: 'received', label: status };
    }
  };

  const displayTests = filteredByMonth.filter(test => {
    // 시험원(TESTER)인 경우 자신에게 배정된 건만 표시
    if (user?.role === 'TESTER' && test.assignedTesterId !== user?.id) {
      return false;
    }

    if (activeTab === 'all') return true;
    if (activeTab === 'progress') return test.status === 'TESTING' || test.status === 'PROGRESS' || test.status === 'RECEIVED';
    return test.status === 'COMPLETED';
  });

  return (
    <main className="dashboard-grid animate-fade-in">
        {/* Top KPI Widgets */}
        <section className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>월별 대시보드</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>지정한 기준 월의 시험 현황을 조회합니다.</p>
          </div>
          <div>
            <input 
              type="month" 
              className="input-field" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ fontWeight: 600, padding: '0.5rem 1rem', width: '200px' }}
            />
          </div>
        </section>

        {/* Integrated KPI Dashboard */}
        <section className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--kaic-navy)', margin: 0 }}>
              {targetMonthNum}월 통합 업무 현황
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'TESTER' ? '1fr 1fr' : '1fr', background: 'white' }}>
            {/* Global KPI Column */}
            <div style={{ padding: '2rem', borderRight: user?.role === 'TESTER' ? '1px solid #e2e8f0' : 'none' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></span>
                전체 부서 현황 (Global)
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>신규 접수</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>{newReceptions}</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>시험 상담</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{consultationCount}</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>시험중</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>{testingCount}</div>
                </div>
                <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>성적서 발행</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#047857' }}>{completedCount}</div>
                </div>
              </div>
            </div>

            {/* My KPI Column (Only for Testes) */}
            {user?.role === 'TESTER' && (
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#8b5cf6', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span>
                  나의 배정 내역 (Personal)
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>배정된 담당 건수</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{myTotalAssigned}</div>
                  </div>
                  <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>현재 나의 시험중</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>{myInProgressCount}</div>
                  </div>
                  <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>직접 완료 처리</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#047857' }}>{myCompletedCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Status List with Tagging */}
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--neutral-100)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 className="card-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
              {targetMonthNum}월 시험 접수 목록
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid #cbd5e1',
                  background: activeTab === 'all' ? 'var(--kaic-navy)' : 'white',
                  color: activeTab === 'all' ? 'white' : 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >전체 보기</button>
              <button 
                onClick={() => setActiveTab('progress')}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid #cbd5e1',
                  background: activeTab === 'progress' ? 'var(--kaic-navy)' : 'white',
                  color: activeTab === 'progress' ? 'white' : 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >진행/대기 내역</button>
               <button 
                onClick={() => setActiveTab('completed')}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid #cbd5e1',
                  background: activeTab === 'completed' ? 'var(--kaic-navy)' : 'white',
                  color: activeTab === 'completed' ? 'white' : 'var(--neutral-800)',
                  cursor: 'pointer'
                }}
              >완료 내역</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>접수 번호</th>
                  <th>의뢰 기관</th>
                  <th>시험 의뢰 내용</th>
                  <th>담당 평가원</th>
                  <th style={{ textAlign: 'center' }}>진행 상태</th>
                  <th>날짜</th>
                </tr>
              </thead>
              <tbody>
                {displayTests.map((test) => {
                  const info = getStatusInfo(test.status, !!test.testId);
                  return (
                    <tr key={test.id}>
                      <td 
                        style={{ fontWeight: 700, color: 'var(--kaic-navy)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setViewingTest(test)}
                        title="클릭하여 상세 내역을 조회합니다."
                      >
                        {test.id}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>{test.client}</td>
                      <td>{test.content.length > 20 ? test.content.substring(0, 20) + '...' : test.content}</td>
                      <td>{test.assignedTesterId || '미배정'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={info.role as 'received' | 'testing' | 'progress' | 'completed'} label={info.label} />
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{test.date}</td>
                    </tr>
                  )
                })}
                {displayTests.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>해당 조건에 맞는 데이터가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {viewingTest && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
              <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>접수 상세 내역 (조회 전용)</h2>
                <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }} onClick={() => setViewingTest(null)}>&times;</button>
              </div>
              <div style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>기본 정보</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <div><strong style={{ color: '#475569' }}>원 접수번호:</strong> {viewingTest.id}</div>
                  <div><strong style={{ color: '#475569' }}>시험접수번호(채번):</strong> {viewingTest.testId || <span style={{ color: '#ef4444' }}>미발급</span>}</div>
                  <div><strong style={{ color: '#475569' }}>의뢰처:</strong> {viewingTest.client} ({viewingTest.clientName})</div>
                  <div><strong style={{ color: '#475569' }}>담당 시험원:</strong> {viewingTest.assignedTesterId || '미배정'}</div>
                </div>

                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>사전 의뢰 내역 (고객)</h3>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: '#334155' }}>{viewingTest.content}</div>

                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>시험 협의 이력 (시험원 작성)</h3>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
                  {viewingTest.consultations?.map((c: any) => (
                    <div key={c.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>작성자: {c.authorId} | 일시: {c.date}</div>
                      <div style={{ whiteSpace: 'pre-wrap', color: '#0f172a', lineHeight: 1.5 }}>{c.text}</div>
                      {c.history?.length > 0 && (
                        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f1f5f9', fontSize: '0.85rem', color: '#64748b', borderRadius: '4px' }}>
                          * 이 내역은 총 {c.history.length}번 수정된 이력이 있습니다. (상세 수정 내역은 시험원 메뉴에서 열람 가능)
                        </div>
                      )}
                    </div>
                  ))}
                  {(!viewingTest.consultations || viewingTest.consultations.length === 0) && (
                    <div style={{ color: '#94a3b8', textAlign: 'center' }}>시험원이 등록한 상담 내역이 없습니다.</div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>시험 시행 일정</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
                  <div><strong style={{ color: '#475569', display: 'block', marginBottom: '0.25rem' }}>시험 날짜:</strong> <div style={{ color: '#0f172a' }}>{viewingTest.schedule?.startDate ? `${viewingTest.schedule.startDate} ~ ${viewingTest.schedule.endDate}` : '미정'}</div></div>
                  <div><strong style={{ color: '#475569', display: 'block', marginBottom: '0.25rem' }}>시험 시간:</strong> <div style={{ color: '#0f172a' }}>{viewingTest.schedule?.startTime ? `${viewingTest.schedule.startTime} ~ ${viewingTest.schedule.endTime}` : '미정'}</div></div>
                  <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                    <strong style={{ color: '#475569', display: 'block', marginBottom: '0.25rem' }}>장소:</strong> 
                    <div style={{ color: '#0f172a' }}>
                      {viewingTest.schedule?.locationType === 'FIXED_LAB' ? '고정 시험실' : viewingTest.schedule?.locationType === 'ON_SITE' ? `현장 시험 (상세주소: ${viewingTest.schedule.locationDetail})` : '미정'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
  );
};
