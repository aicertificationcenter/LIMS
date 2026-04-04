
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Download, FileText, Archive, CheckCircle, PackageCheck, Trash2 } from 'lucide-react';

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
  
  // Schedule states (kept as local since we can update Sample status)
  const [schedStartDate, setSchedStartDate] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedLocationType, setSchedLocationType] = useState('');
  const [schedLocationDetail, setSchedLocationDetail] = useState('');
  const [schedTestType, setSchedTestType] = useState<'GENERAL' | 'KOLAS' | ''>('');

  const handleOpenDetail = (id: string) => {
    setSelectedId(id);
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

  const handleAddEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !user) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        await apiClient.evidences.create({
          sampleId: selectedId,
          uploaderId: user.id,
          fileName: file.name,
          fileType: file.type,
          dataUrl
        });
        alert(`${file.name} 증적이 업로드되었습니다.`);
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadEvidence = (ev: any) => {
    if (!ev.dataUrl) {
      alert('다운로드할 수 있는 데이터가 없습니다.');
      return;
    }
    const link = document.createElement('a');
    link.href = ev.dataUrl;
    link.download = ev.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveEvidence = async (evidenceId: string) => {
    if (confirm('정말로 이 증적 자료를 삭제하시겠습니까?')) {
      try {
        await apiClient.evidences.delete(evidenceId);
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleStartTest = async () => {
    if (!selectedId) return;
    try {
      await apiClient.receptions.assign(selectedId, user!.id); // This will update status to IN_PROGRESS
      alert('시험이 시작되었습니다. 상태가 [진행중(IN_PROGRESS)]으로 변경되었습니다.');
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteTest = async () => {
    if (!selectedId) return;
    if (confirm('시험을 완료하시겠습니까? 완료 후에는 더 이상 수정할 수 없습니다.')) {
      try {
        // We can update status to COMPLETED via the assign endpoint (reused as a general patch)
        // Wait, my assign endpoint defaults to IN_PROGRESS. Let's make sure it handles status.
        // Actually, for simplicity now, I'll just reuse PATCH /receptions
        const res = await fetch('/api/receptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedId, status: 'COMPLETED' })
        });
        if (res.ok) {
           alert('시험이 완료되었습니다.');
           fetchMyTasks();
        } else {
           const err = await res.json();
           alert('상세 처리 중 오류: ' + err.message);
        }
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중...</div>;
  }

  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--kaic-navy)', padding: '1.5rem', color: 'white' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              시험접수 상세 정보
              <span style={{ fontSize: '0.85rem', background: selectedTest.status === 'COMPLETED' ? '#10b981' : '#3b82f6', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {selectedTest.status === 'COMPLETED' ? <CheckCircle size={14}/> : null}
                번호: {selectedTest.testId}
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
                <div key={c.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <span>작성자: {c.authorId} | 일시: {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>{c.message}</div>
                </div>
              ))}
              {(!selectedTest.consultations || selectedTest.consultations.length === 0) && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>등록된 협의 내역이 없습니다.</div>
              )}
              
              {selectedTest.status !== 'COMPLETED' && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea className="input-field" value={newConsultText} onChange={e=>setNewConsultText(e.target.value)} placeholder="새로운 상담 내역을 입력하세요..." rows={3} style={{ flex: 1, backgroundColor: 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1' }} />
                  <button className="btn btn-primary" onClick={handleAddConsult} style={{ height: 'auto', alignSelf: 'stretch', width: '100px' }}>기록</button>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2.5rem' }}>증적 모음 (Evidence Collection)</h3>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {selectedTest.evidences?.map((ev: any) => (
                  <div key={ev.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(ev.createdAt).toLocaleDateString()}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDownloadEvidence(ev)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="다운로드">
                           <Download size={16} />
                        </button>
                        {selectedTest.status !== 'COMPLETED' && (
                          <button onClick={() => handleRemoveEvidence(ev.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="삭제">
                             <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ height: '100px', background: '#f8fafc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {ev.fileType.startsWith('image/') ? (
                        <img src={ev.dataUrl} alt={ev.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                      ) : ev.fileType.includes('zip') || ev.fileType.includes('rar') || ev.fileType.includes('7z') ? (
                        <Archive size={40} color="#94a3b8" />
                      ) : (
                        <FileText size={40} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ fontWeight: 600, color: '#1e293b', wordBreak: 'break-all', fontSize: '0.9rem', marginTop: '0.5rem' }}>{ev.fileName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>업로더: {ev.uploaderId}</div>
                  </div>
                ))}
                {(!selectedTest.evidences || selectedTest.evidences.length === 0) && (
                  <div style={{ gridColumn: '1 / -1', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>등록된 증적 자료가 없습니다.</div>
                )}
              </div>
              
              {selectedTest.status !== 'COMPLETED' && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input type="file" style={{ display: 'none' }} onChange={handleAddEvidence} />
                    <span>📁 증적 업로드 (사진, 문서 등)</span>
                  </label>
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem', padding: '0 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedId(null)} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '30px', fontWeight: 600, margin: 0 }}>
                  ← 목록으로 돌아가기
                </button>
                
                {selectedTest.status === 'RECEIVED' ? (
                  <button className="btn btn-primary" onClick={handleStartTest} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}>
                    🚀 시험 시작 (Start Test)
                  </button>
                ) : selectedTest.status === 'IN_PROGRESS' ? (
                  <button className="btn btn-primary" onClick={handleCompleteTest} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}>
                    📂 시험 완료 (Complete Test)
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
      <section className="card">
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
                    {t.status === 'RECEIVED' ? (
                      <button className="btn btn-primary" onClick={() => handleOpenDetail(t.id)} style={{ width: 'auto', minHeight: '36px', padding: '0 15px', marginBottom: 0 }}>
                        시험접수
                      </button>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => handleOpenDetail(t.id)} style={{ width: 'auto', minHeight: '36px', padding: '0 15px', marginBottom: 0 }}>
                        상세 보기
                      </button>
                    )}
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
