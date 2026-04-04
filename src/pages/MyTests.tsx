
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { MockAPI } from '../mocks';
import { Download, FileText, Archive, CheckCircle, PackageCheck, Trash2 } from 'lucide-react';

export const MyTests = () => {
  const { user } = useAuth();
  const refresh = () => setStamp(s => s + 1);
  const [, setStamp] = useState(0); 

  const allTests = MockAPI.getReceptions();
  const myTests = allTests.filter((t: any) => t.assignedTesterId === user?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Specific states for the detail view
  const [newConsultText, setNewConsultText] = useState('');
  const [editingConsultId, setEditingConsultId] = useState<string|null>(null);
  const [editedConsultText, setEditedConsultText] = useState('');
  
  // Schedule states
  const [schedStartDate, setSchedStartDate] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedLocationType, setSchedLocationType] = useState('');
  const [schedLocationDetail, setSchedLocationDetail] = useState('');
  const [schedTestType, setSchedTestType] = useState<'GENERAL' | 'KOLAS' | ''>('');

  const selectedTest = myTests.find((t: any) => t.id === selectedId);

  const handleOpenDetail = (id: string, currentTestId?: string) => {
    let finalTestId = currentTestId;
    if (!finalTestId) {
      finalTestId = MockAPI.createTestId(id);
    }
    const test = MockAPI.getReceptions().find((t: any) => t.id === id);
    if (test) {
      setSchedStartDate(test.schedule?.startDate || '');
      setSchedEndDate(test.schedule?.endDate || '');
      setSchedStartTime(test.schedule?.startTime || '');
      setSchedEndTime(test.schedule?.endTime || '');
      setSchedLocationType(test.schedule?.locationType || '');
      setSchedLocationDetail(test.schedule?.locationDetail || '');
      setSchedTestType(test.schedule?.testType || '');
    }
    setSelectedId(id);
    refresh();
  };

  const handleAddConsult = () => {
    if (!newConsultText.trim() || !selectedId || !user) return;
    MockAPI.addConsultation(selectedId, newConsultText, user.id);
    setNewConsultText('');
    refresh();
  };

  const handleEditConsultSave = (consultId: string) => {
    if (!editedConsultText.trim() || !selectedId || !user) return;
    MockAPI.updateConsultation(selectedId, consultId, editedConsultText, user.id);
    setEditingConsultId(null);
    setEditedConsultText('');
    refresh();
  };

  const handleSaveSchedule = () => {
    if (!selectedId) return;
    MockAPI.updateTestSchedule(selectedId, { 
      startDate: schedStartDate, endDate: schedEndDate, 
      startTime: schedStartTime, endTime: schedEndTime,
      locationType: schedLocationType as any, locationDetail: schedLocationDetail,
      testType: schedTestType
    });
    alert('시험 일정이 저장되었습니다.');
    refresh();
  };

  const handleAddEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !user) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      MockAPI.addEvidence(selectedId, file.name, file.type, user.id, dataUrl);
      alert(`${file.name} 증적이 업로드되었습니다.`);
      refresh();
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
    link.download = ev.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveEvidence = (evidenceId: string) => {
    if (!selectedId) return;
    if (confirm('정말로 이 증적 자료를 삭제하시겠습니까?')) {
      MockAPI.removeEvidence(selectedId, evidenceId);
      refresh();
    }
  };

  const handleStartTest = () => {
    if (!selectedId) return;
    MockAPI.updateTestSchedule(selectedId, { 
      startDate: schedStartDate, endDate: schedEndDate, 
      startTime: schedStartTime, endTime: schedEndTime,
      locationType: schedLocationType as any, locationDetail: schedLocationDetail,
      testType: schedTestType
    });
    
    MockAPI.updateReceptionStatus(selectedId, 'PROGRESS');
    alert('시험이 시작되었습니다. 상태가 [진행중(PROGRESS)]으로 변경됩니다.');
    refresh();
  };

  const handleCompleteTest = () => {
    if (!selectedId) return;
    if (confirm('시험을 완료하시겠습니까? 완료 후에는 더 이상 수정할 수 없습니다.')) {
      MockAPI.updateReceptionStatus(selectedId, 'COMPLETED');
      alert('시험이 완료되었습니다.');
      refresh();
    }
  };

  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--kaic-navy)', padding: '1.5rem', color: 'white' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              시험접수 상세 정보
              <span style={{ fontSize: '0.85rem', background: selectedTest.status === 'COMPLETED' ? '#10b981' : '#3b82f6', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {selectedTest.status === 'COMPLETED' ? <CheckCircle size={14}/> : null}
                채번: {selectedTest.testId}
              </span>
            </h2>
          </div>

          <div style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>원본 접수 정보 (Read-Only)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
              <div><strong style={{ color: '#475569' }}>원 접수번호:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.id}</span></div>
              <div><strong style={{ color: '#475569' }}>연락처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.phone}</span></div>
              <div><strong style={{ color: '#475569' }}>의뢰처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.client} ({selectedTest.clientName})</span></div>
              <div><strong style={{ color: '#475569' }}>이메일:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.email}</span></div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#475569' }}>사전 의뢰 내용:</strong> <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>{selectedTest.content}</div></div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#475569' }}>사전 상담 내역 (관리자):</strong> <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>{selectedTest.consultation}</div></div>
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>시험 협의 (상담 이력)</h3>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {selectedTest.consultations?.map((c: any) => (
                <div key={c.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <span>작성자: {c.authorId} | 작성일: {c.date}</span>
                    {editingConsultId === c.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditConsultSave(c.id)} style={{ color: '#047857', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>저장</button>
                        <button onClick={() => setEditingConsultId(null)} style={{ color: '#64748b', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>취소</button>
                      </div>
                    ) : selectedTest.status !== 'COMPLETED' && (
                      <button onClick={() => { setEditingConsultId(c.id); setEditedConsultText(c.text); }} style={{ color: '#3b82f6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>수정</button>
                    )}
                  </div>

                  {editingConsultId === c.id ? (
                     <textarea className="input-field" value={editedConsultText} onChange={e=>setEditedConsultText(e.target.value)} rows={3} style={{ width: '100%', backgroundColor: 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1' }} />
                  ) : (
                     <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>{c.text}</div>
                  )}

                  {c.history?.length > 0 && (
                    <div style={{ marginTop: '1rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>수정 이력 (Audit Trail):</div>
                      {c.history.map((h: any, i: any) => (
                        <div key={i} style={{ borderLeft: '2px solid #cbd5e1', paddingLeft: '0.5rem', marginBottom: '0.5rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 600 }}>[{h.date}]</span> {h.modifierId} 님이 편집함. <br/>
                          <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>이전 내용: {h.oldText}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!selectedTest.consultations || selectedTest.consultations.length === 0) && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>등록된 시험 협의 상담 내역이 없습니다.</div>
              )}
              
              {selectedTest.status !== 'COMPLETED' && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <textarea className="input-field" value={newConsultText} onChange={e=>setNewConsultText(e.target.value)} placeholder="새로운 상담 내역을 입력하세요..." rows={3} style={{ flex: 1, backgroundColor: 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1' }} />
                  <button className="btn btn-primary" onClick={handleAddConsult} style={{ height: 'auto', alignSelf: 'stretch', width: '100px' }}>등록</button>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2.5rem' }}>시험 일정 등록</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>예정 날짜 (시작 ~ 종료)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="date" className="input-field" disabled={selectedTest.status === 'COMPLETED'} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ backgroundColor: selectedTest.status === 'COMPLETED' ? '#f1f5f9' : 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1', flex: 1, cursor: 'pointer' }} value={schedStartDate} onChange={e=>setSchedStartDate(e.target.value)} />
                    <span style={{ color: '#64748b' }}>~</span>
                    <input type="date" className="input-field" disabled={selectedTest.status === 'COMPLETED'} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ backgroundColor: selectedTest.status === 'COMPLETED' ? '#f1f5f9' : 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1', flex: 1, cursor: 'pointer' }} value={schedEndDate} onChange={e=>setSchedEndDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>예정 시간 (시작 ~ 종료)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="time" className="input-field" disabled={selectedTest.status === 'COMPLETED'} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ backgroundColor: selectedTest.status === 'COMPLETED' ? '#f1f5f9' : 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1', flex: 1, cursor: 'pointer' }} value={schedStartTime} onChange={e=>setSchedStartTime(e.target.value)} />
                    <span style={{ color: '#64748b' }}>~</span>
                    <input type="time" className="input-field" disabled={selectedTest.status === 'COMPLETED'} onClick={(e: any) => e.target.showPicker && e.target.showPicker()} style={{ backgroundColor: selectedTest.status === 'COMPLETED' ? '#f1f5f9' : 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1', flex: 1, cursor: 'pointer' }} value={schedEndTime} onChange={e=>setSchedEndTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>시험 예정 장소</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: schedLocationType === 'FIXED_LAB' ? 'black' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {schedLocationType === 'FIXED_LAB' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>}
                    </div>
                    <input type="radio" disabled={selectedTest.status === 'COMPLETED'} name="locationType" value="FIXED_LAB" checked={schedLocationType === 'FIXED_LAB'} onChange={() => setSchedLocationType('FIXED_LAB')} style={{ display: 'none' }} />
                    고정 시험실
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: schedLocationType === 'ON_SITE' ? 'black' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {schedLocationType === 'ON_SITE' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>}
                    </div>
                    <input type="radio" disabled={selectedTest.status === 'COMPLETED'} name="locationType" value="ON_SITE" checked={schedLocationType === 'ON_SITE'} onChange={() => setSchedLocationType('ON_SITE')} style={{ display: 'none' }} />
                    현장 시험 (고객사 등)
                  </label>
                </div>
                {schedLocationType === 'ON_SITE' && (
                  <input type="text" className="input-field" disabled={selectedTest.status === 'COMPLETED'} style={{ backgroundColor: selectedTest.status === 'COMPLETED' ? '#f1f5f9' : 'white', color: 'black', fontSize: '1.05rem', border: '1px solid #cbd5e1', width: '100%', marginTop: '0.5rem' }} value={schedLocationDetail} onChange={e=>setSchedLocationDetail(e.target.value)} placeholder="현장 시험의 상세 주소를 입력해 주세요." />
                )}
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>시험 예정 구분</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: schedTestType === 'GENERAL' ? '#0066B3' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {schedTestType === 'GENERAL' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>}
                    </div>
                    <input type="radio" disabled={selectedTest.status === 'COMPLETED'} name="testType" value="GENERAL" checked={schedTestType === 'GENERAL'} onChange={() => setSchedTestType('GENERAL')} style={{ display: 'none' }} />
                    일반시험
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: schedTestType === 'KOLAS' ? '#0066B3' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {schedTestType === 'KOLAS' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>}
                    </div>
                    <input type="radio" disabled={selectedTest.status === 'COMPLETED'} name="testType" value="KOLAS" checked={schedTestType === 'KOLAS'} onChange={() => setSchedTestType('KOLAS')} style={{ display: 'none' }} />
                    KOLAS시험
                  </label>
                </div>
              </div>

              {selectedTest.status !== 'COMPLETED' && (
                <div style={{ textAlign: 'right', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn btn-secondary" onClick={handleSaveSchedule} style={{ height: '42px', padding: '0 2rem', marginBottom: 0 }}>임시 저장</button>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2.5rem' }}>증적 모음 (Evidence Collection)</h3>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {selectedTest.evidences?.map((ev: any) => (
                  <div key={ev.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{ev.date}</div>
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
                        <img src={ev.dataUrl} alt={ev.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                      ) : ev.fileType.includes('zip') || ev.fileType.includes('rar') || ev.fileType.includes('7z') ? (
                        <Archive size={40} color="#94a3b8" />
                      ) : (
                        <FileText size={40} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ fontWeight: 600, color: '#1e293b', wordBreak: 'break-all', fontSize: '0.9rem', marginTop: '0.5rem' }}>{ev.filename}</div>
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
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>* 시험과 관련된 기술문서, 현장사진 등의 증적을 등록하십시오.</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem', padding: '0 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedId(null)} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '30px', fontWeight: 600, margin: 0 }}>
                  ← 목록으로 돌아가기
                </button>
                
                {selectedTest.status === 'RECEIVED' || selectedTest.status === 'TESTING' ? (
                  <button className="btn btn-primary" onClick={handleStartTest} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}>
                    🚀 시험 시작 (Start Test)
                  </button>
                ) : selectedTest.status === 'PROGRESS' ? (
                  <button className="btn btn-primary" onClick={handleCompleteTest} style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}>
                    📂 시험 완료 (Complete Test)
                  </button>
                ) : (
                  <div style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: '#e2e8f0', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <PackageCheck size={20} /> 완료되었습니다
                  </div>
                )}
              </div>
              {selectedTest.status !== 'COMPLETED' && (
                <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b', textAlign: 'center' }}>
                  {selectedTest.status === 'PROGRESS' ? '모든 증적 업로드가 완료되면 [시험 완료]를 눌러 최종 보고 절차로 진입하십시오.' : '시험을 시작하면 상태가 [진행중(PROGRESS)]으로 변경되며 이전 단계로 돌아갈 수 없습니다.'}
                </p>
              )}
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
                <th>접수 번호 (ID)</th>
                <th>의뢰 기관</th>
                <th>상태</th>
                <th>채번(시험접수번호)</th>
                <th>작업 링크</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--kaic-navy)' }}>{t.id}</td>
                  <td>{t.client}</td>
                  <td>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: t.testId ? '#0f172a' : '#94a3b8' }}>
                    {t.testId ? t.testId : '미발급'}
                  </td>
                  <td>
                    {t.status === 'TESTING' || t.status === 'RECEIVED' ? (
                      <button className="btn btn-primary" onClick={() => handleOpenDetail(t.id, t.testId)} style={{ width: 'auto', minHeight: '36px', padding: '0 15px', marginBottom: 0 }}>
                        시험접수
                      </button>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => handleOpenDetail(t.id, t.testId)} style={{ width: 'auto', minHeight: '36px', padding: '0 15px', marginBottom: 0 }}>
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
              현재 {user?.id} 님에게 새롭게 배정된 업무가 없습니다. <br/><br/>접수처의 관리자 배정을 기다려주세요.
           </div>
        )}
      </section>
    </main>
  );
};
