
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { CheckCircle, PackageCheck } from 'lucide-react';

export const MyTests = () => {
  const { user } = useAuth();
  const [myTests, setMyTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  const fetchMyTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient.tests.listMyTasks(user.id);
      setMyTests(data);
    } catch (err) {
      console.error('Fetch tasks failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTest = myTests.find((t: any) => t.id === selectedId);

  // States for the detail view
  const [newConsultText, setNewConsultText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  
  // New workflow fields
  const [testStartDate, setTestStartDate] = useState('');
  const [testEndDate, setTestEndDate] = useState('');
  const [testLocation, setTestLocation] = useState('');
  const [testType, setTestType] = useState('');

  const handleOpenDetail = async (id: string) => {
    setSelectedId(id);
    const test = myTests.find((t: any) => t.id === id);
    // Trigger generation if tester is assigned but barcode is missing
    if (test && !test.testerBarcode && user) {
      try {
        await apiClient.receptions.assign(id, user.id);
        fetchMyTasks();
      } catch (err: any) {
        console.error('ID generation failed:', err);
        alert('시험번호 자동 생성에 실패했습니다. (서버 오류)');
      }
    }
  };

  const handleAddConsult = async () => {
    if (!newConsultText.trim() || !selectedId || !user) return;
    try {
      await apiClient.consultations.create({
        sampleId: selectedId,
        authorId: user.id,
        message: newConsultText
      });
      setNewConsultText('');
      fetchMyTasks(); // Refresh to show new consultation
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateConsult = async (id: string) => {
    if (!editText.trim() || !user) return;
    try {
      await apiClient.consultations.update(id, {
        message: editText,
        authorId: user.id
      });
      setEditingId(null);
      setEditText('');
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };


  const handleStartTest = async () => {
    if (!selectedId) return;
    if (!testStartDate || !testEndDate || !testLocation || !testType) {
      alert('시험 시작 전 모든 시험 정보를 입력해주세요.');
      return;
    }
    try {
      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedId, 
          testerId: user!.id,
          status: 'IN_PROGRESS',
          testStartDate,
          testEndDate,
          testLocation,
          testType
        })
      });
      alert('시험이 시작되었습니다. 상태가 [진행중(IN_PROGRESS)]으로 변경되었습니다.');
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };


  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중...</div>;
  }

  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <section className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--kaic-navy)', padding: '1.5rem', color: 'white' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              시험접수 상세 정보
              <span style={{ fontSize: '0.85rem', background: selectedTest.status === 'COMPLETED' ? '#10b981' : '#3b82f6', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {selectedTest.status === 'COMPLETED' ? <CheckCircle size={14}/> : null}
                번호: {selectedTest.barcode || selectedTest.testId}
              </span>
              <span style={{ marginLeft: '12px', fontSize: '0.85rem', background: '#ffffff33', padding: '4px 10px', borderRadius: '12px', opacity: 0.9 }}>
                시험번호: {selectedTest.testerBarcode || (
                  <button 
                    onClick={() => handleOpenDetail(selectedTest.id)} 
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    번호 생성하기
                  </button>
                )}
              </span>
            </h2>
          </div>

          <div style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>원본 접수 정보 (Live)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
              <div><strong style={{ color: '#475569' }}>원 접수아이디:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.id}</span></div>
              <div><strong style={{ color: '#475569' }}>연락처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.phone}</span></div>
              <div><strong style={{ color: '#475569' }}>의뢰처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.client} ({selectedTest.clientName})</span></div>
              <div><strong style={{ color: '#475569' }}>이메일:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.email}</span></div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#475569' }}>의뢰 내용:</strong> <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>{selectedTest.content}</div></div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#475569' }}>관리자 상담 내용:</strong> <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>{selectedTest.consultation}</div></div>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>시험원 상담/협의 기록</h3>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {selectedTest.consultations?.map((c: any) => (
                <div key={c.id} style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>작성자: {c.authorId} | 일시: {new Date(c.createdAt).toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {c.history && c.history.length > 0 && (
                        <button 
                          onClick={() => setShowHistoryId(showHistoryId === c.id ? null : c.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--kaic-blue)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          {showHistoryId === c.id ? '이력 닫기' : `이력보기 (${c.history.length})`}
                        </button>
                      )}
                      {selectedTest.status !== 'COMPLETED' && (c.authorId === user?.id || user?.role === 'ADMIN') && (
                        <button 
                          onClick={() => { setEditingId(c.id); setEditText(c.message); }}
                          style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </div>

                  {editingId === c.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <textarea 
                        className="input-field" 
                        value={editText} 
                        onChange={e => setEditText(e.target.value)} 
                        rows={3} 
                        style={{ background: '#fff', fontSize: '0.95rem', color: '#1e293b' }} 
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setEditingId(null)} style={{ minHeight: '32px', padding: '0 12px', fontSize: '0.8rem' }}>취소</button>
                        <button className="btn btn-primary" onClick={() => handleUpdateConsult(c.id)} style={{ minHeight: '32px', padding: '0 12px', fontSize: '0.8rem' }}>저장</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '1rem', lineHeight: 1.6 }}>{c.message}</div>
                  )}

                  {showHistoryId === c.id && c.history && (
                    <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f1f5f9', borderRadius: '6px', borderLeft: '4px solid #cbd5e1' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase' }}>수정 이력 (Timeline)</h4>
                      {c.history.map((h: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: idx === c.history.length -1 ? 0 : '12px', paddingBottom: idx === c.history.length -1 ? 0 : '12px', borderBottom: idx === c.history.length -1 ? 'none' : '1px dashed #cbd5e1' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                            {new Date(h.updatedAt).toLocaleString()} | 원본 메시지
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{h.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!selectedTest.consultations || selectedTest.consultations.length === 0) && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>등록된 협의 내역이 없습니다.</div>
              )}
              
              {selectedTest.status !== 'COMPLETED' && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <textarea 
                    className="input-field" 
                    value={newConsultText} 
                    onChange={e=>setNewConsultText(e.target.value)} 
                    placeholder="새로운 상담 내역을 입력하세요..." 
                    rows={3} 
                    style={{ flex: 1, backgroundColor: 'white', color: '#1e293b', fontSize: '1.05rem', border: '1px solid #cbd5e1' }} 
                  />
                  <button className="btn btn-primary" onClick={handleAddConsult} style={{ height: 'auto', alignSelf: 'stretch', width: '100px', margin: 0 }}>기록</button>
                </div>
              )}
            </div>
            
            {/* New Workflow Fields: only show if not completed and not already started (or allow update if in progress) */}
            {selectedTest.status === 'RECEIVED' && (
              <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2.5rem', border: '1px solid #bfdbfe' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1e40af', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🕒 시험 일정 및 구분 등록
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="label">시험 시작 일자</label>
                    <input type="date" className="input-field" value={testStartDate} onChange={e => setTestStartDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">시험 종료 일자</label>
                    <input type="date" className="input-field" value={testEndDate} onChange={e => setTestEndDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">시험 예정 장소</label>
                    <select className="input-field" value={testLocation} onChange={e => setTestLocation(e.target.value)}>
                      <option value="">장소 선택</option>
                      <option value="고정시험실">고정시험실</option>
                      <option value="현장시험">현장시험</option>
                      <option value="고정+현장시험">고정+현장시험</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">시험 구분</label>
                    <select className="input-field" value={testType} onChange={e => setTestType(e.target.value)}>
                      <option value="">구분 선택</option>
                      <option value="일반시험">일반시험</option>
                      <option value="KOLAS 시험">KOLAS 시험</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {selectedTest.status !== 'RECEIVED' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div><span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>시작일</span> <strong>{selectedTest.testStartDate || '-'}</strong></div>
                <div><span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>종료일</span> <strong>{selectedTest.testEndDate || '-'}</strong></div>
                <div><span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>장소</span> <strong>{selectedTest.testLocation || '-'}</strong></div>
                <div><span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>구분</span> <strong>{selectedTest.testType || '-'}</strong></div>
              </div>
            )}


            <div style={{ marginTop: '3rem', padding: '0 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedId(null)} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '30px', fontWeight: 600, margin: 0 }}>
                  ← 목록으로 돌아가기
                </button>
                
                {selectedTest.status === 'RECEIVED' ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleStartTest} 
                    disabled={!testStartDate || !testEndDate || !testLocation || !testType}
                    style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: (!testStartDate || !testEndDate || !testLocation || !testType) ? '#94a3b8' : '#10b981', display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}
                  >
                    🚀 시험 시작 (Start Test)
                  </button>
                ) : (
                  <div style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <PackageCheck size={20} /> 모든 절차 완료
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title">나의 할당 업무 (My Tasks)</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>관리자로부터 명시적으로 배정받은 시험 건들만 모아서 확인할 수 있습니다.</p>
        
        {myTests.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>바코드 (ID)</th>
                <th>의뢰 기관</th>
                <th>상태</th>
                <th>할당 일시</th>
                <th>작업 링크</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--kaic-navy)' }}>{t.testId}</td>
                  <td>{t.client}</td>
                  <td>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {new Date(t.id.substring(0, 8)).toLocaleDateString() || '연동중'}
                  </td>
                  <td>
                    <button className="btn btn-primary" onClick={() => handleOpenDetail(t.id)} style={{ width: 'auto', minHeight: '36px', padding: '0 15px', marginBottom: 0 }}>
                      접수하기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
           <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              현재 {user?.id} 님에게 배정된 업무가 없습니다. <br/><br/>관리자의 업무 배정을 기다려주세요.
           </div>
        )}
      </section>
    </main>
  );
};
