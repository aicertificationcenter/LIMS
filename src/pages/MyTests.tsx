// Build Timestamp: 2026-04-08 21:30
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { 
  CheckCircle, 
  PackageCheck, 
  MessageSquare, 
  ClipboardList, 
  Save, 
  Package, 
  Target, 
  FileText, 
  Calendar 
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const MyTests = () => {
  const { user } = useAuth();
  const [myTests, setMyTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchMyTasks();
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const data = await apiClient.users.list();
      setUsers(data);
    } catch (err) {
      console.error('Fetch users failed:', err);
    }
  };

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
  const [testAddress, setTestAddress] = useState('');
  const [testProduct, setTestProduct] = useState('');
  const [testPurpose, setTestPurpose] = useState('');
  const [testMethod, setTestMethod] = useState('');

  // Sync state with selected test data when it changes
  useEffect(() => {
    if (selectedTest) {
      setTestStartDate(selectedTest.testStartDate || '');
      setTestEndDate(selectedTest.testEndDate || '');
      setTestLocation(selectedTest.testLocation || '');
      setTestType(selectedTest.testType || '');
      setTestAddress(selectedTest.testAddress || '');
      setTestProduct(selectedTest.testProduct || '');
      setTestPurpose(selectedTest.testPurpose || '');
      setTestMethod(selectedTest.testMethod || '');
    }
  }, [selectedTest?.id, selectedTest?.testStartDate, selectedTest?.testEndDate, selectedTest?.testLocation, selectedTest?.testType, selectedTest?.testAddress, selectedTest?.testProduct, selectedTest?.testPurpose, selectedTest?.testMethod]);

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
      alert('시험 시작 전 필수 시험 정보를 입력해주세요.');
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
          testType,
          testAddress,
          testProduct,
          testPurpose,
          testMethod
        })
      });
      alert(selectedTest.status === 'RECEIVED' ? '시험이 시작되었습니다.' : '시험 정보가 업데이트되었습니다.');
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
              <div><strong style={{ color: '#475569' }}>접수번호:</strong> <span style={{ color: 'var(--kaic-blue)', fontWeight: 800 }}>{selectedTest.barcode}</span></div>
              <div><strong style={{ color: '#475569' }}>연락처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.phone}</span></div>
              <div><strong style={{ color: '#475569' }}>의뢰처:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.client} ({selectedTest.clientName})</span></div>
              <div><strong style={{ color: '#475569' }}>이메일:</strong> <span style={{ color: '#0f172a' }}>{selectedTest.email}</span></div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClipboardList size={16} /> 의뢰 내용:
                </strong> 
                <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: 'white', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                  {selectedTest.target || selectedTest.content || '의뢰내용이 없습니다.'}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong style={{ color: 'var(--kaic-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> 관리자 상담 내용:
                </strong> 
                <div style={{ color: '#0f172a', whiteSpace: 'pre-wrap', marginTop: '0.5rem', background: '#f0f9ff', padding: '1rem', border: '1px solid #bae6fd', borderRadius: '12px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                  {selectedTest.consultation || '등록된 상담내용이 없습니다.'}
                </div>
              </div>
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
                    style={{ flex: 1 }} 
                  />
                  <button className="btn btn-primary" onClick={handleAddConsult} style={{ height: 'auto', alignSelf: 'stretch', width: '100px', margin: 0 }}>기록</button>
                </div>
              )}
            </div>
            
            {/* New Workflow Fields: only show if not completed */}
            {selectedTest.status !== 'COMPLETED' && (
              <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '16px', marginBottom: '3rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.3rem', color: 'var(--kaic-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800 }}>
                    <div style={{ backgroundColor: 'var(--kaic-navy)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>1</div>
                    시험 일정 및 장소 정보 수정
                  </h3>
                </div>
                
                {/* 1. Technical Info Section (Full Width Textareas) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', marginBottom: '2.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.7rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} color="#64748b" /> 2. 시험대상 품목
                    </label>
                    <textarea 
                      className="input-field" 
                      rows={2} 
                      placeholder="예: CT기반 복막유착 위험 예측 솔루션(v0.9) 중 복막 분할 및 유착 중등도 분류 모델" 
                      value={testProduct} 
                      onChange={e => setTestProduct(e.target.value)} 
                      style={{ minHeight: '90px', resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.7rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={16} color="#64748b" /> 4. 시험 목적
                    </label>
                    <textarea 
                      className="input-field" 
                      rows={2} 
                      placeholder="예: 『 창업성장기술개발_TIPS 』 결과 제출용" 
                      value={testPurpose} 
                      onChange={e => setTestPurpose(e.target.value)} 
                      style={{ minHeight: '70px', resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.7rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#64748b" /> 5. 시험 방법
                    </label>
                    <textarea 
                      className="input-field" 
                      rows={4} 
                      placeholder="예: [AI모델] 복막 분할 모델의 DSC 목표 달성. 유착 중등도 분류 모델의 Accuracy, Sensitivity, Specificify 목표 달성" 
                      value={testMethod} 
                      onChange={e => setTestMethod(e.target.value)} 
                      style={{ minHeight: '120px', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* 2. Schedule & Type Section (Grid) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #eef2f6' }}>
                  <div className="form-group">
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>📅 시험 시작 일자</label>
                    <input type="date" className="input-field" value={testStartDate} onChange={e => setTestStartDate(e.target.value)} style={{ width: '100%', height: '48px' }} />
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏁 시험 종료 일자</label>
                    <input type="date" className="input-field" value={testEndDate} onChange={e => setTestEndDate(e.target.value)} style={{ width: '100%', height: '48px' }} />
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏢 시험 예정 장소</label>
                    <select className="input-field" value={testLocation} onChange={e => setTestLocation(e.target.value)} style={{ width: '100%', height: '48px' }}>
                      <option value="">장소 선택</option>
                      <option value="고정시험실">고정시험실</option>
                      <option value="현장시험">현장시험</option>
                      <option value="고정+현장시험">고정+현장시험</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🧪 시험 구분</label>
                    <select className="input-field" value={testType} onChange={e => setTestType(e.target.value)} style={{ height: '48px' }}>
                      <option value="">구분 선택</option>
                      <option value="일반시험">일반시험</option>
                      <option value="KOLAS 시험">KOLAS 시험</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="label" style={{ color: '#334155', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>📍 현장 시험 장소 (상세 주소)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="현장 시험이 진행될 상세 주소를 입력하세요" 
                        style={{ height: '48px', flex: 1 }}
                        value={testAddress} 
                        onChange={e => setTestAddress(e.target.value)} 
                      />
                      <button 
                        className="btn" 
                        onClick={handleStartTest}
                        style={{ 
                          background: 'linear-gradient(135deg, var(--kaic-navy) 0%, #2e3b8e 100%)', 
                          color: 'white', 
                          padding: '0 24px', 
                          borderRadius: '8px', 
                          fontWeight: 600, 
                          boxShadow: '0 4px 6px rgba(29, 42, 120, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap',
                          height: '48px',
                          margin: 0
                        }}
                      >
                        <Save size={18} /> 정보 업데이트
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem', background: '#f1f5f9', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', color: '#64748b', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> 현재 등록된 시험 정보
                </h4>
              </div>
              <div style={{ background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: '3px solid var(--kaic-navy)' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>시작일</span> 
                <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{selectedTest.testStartDate || '-'}</strong>
              </div>
              <div style={{ background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: '3px solid var(--kaic-navy)' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>종료일</span> 
                <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{selectedTest.testEndDate || '-'}</strong>
              </div>
              <div style={{ background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: '3px solid var(--kaic-blue)' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>장소</span> 
                <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{selectedTest.testLocation || '-'}</strong>
              </div>
              <div style={{ background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderBottom: '3px solid var(--kaic-blue)' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>구분</span> 
                <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{selectedTest.testType || '-'}</strong>
              </div>
              {selectedTest.testAddress && (
                <div style={{ gridColumn: '1 / -1', background: 'white', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid var(--kaic-blue)' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 600 }}>현장 시험장 상세 주소</span> 
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{selectedTest.testAddress}</strong>
                </div>
              )}
            </div>


            {/* Cover Page Preview Section */}
            {(selectedTest.testStartDate && selectedTest.testType) && (
              <div style={{ marginTop: '3rem', borderTop: '2px solid #e2e8f0', paddingTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: 0 }}>시험성적서 (갑)지 실시간 미리보기 (Ver 2.1)</h3>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      const printContent = document.getElementById('cover-page-content');
                      const windowUrl = 'about:blank';
                      const uniqueName = new Date().getTime();
                      const windowName = 'Print' + uniqueName;
                      const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
                      
                      if (printWindow && printContent) {
                        printWindow.document.write(`
                          <html>
                            <head>
                                <title>\${issueNo}</title>
                                <style>
                                  @page { size: A4; margin: 0; }
                                  body { margin: 0; padding: 0; font-family: "Malgun Gothic", dotum, sans-serif; -webkit-print-color-adjust: exact; }
                                  .document { 
                                    width: 210mm; 
                                    height: 297mm; 
                                    padding: 20mm 15mm; 
                                    box-sizing: border-box; 
                                    position: relative; 
                                    background: white;
                                    overflow: hidden;
                                  }
                                  .watermark {
                                    position: absolute;
                                    top: 55%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    width: 130mm;
                                    opacity: 0.08;
                                    z-index: 0;
                                    pointer-events: none;
                                  }
                                  .content-wrapper {
                                    position: relative;
                                    z-index: 1;
                                  }
                                  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                                  .logo { width: 120px; }
                                  .title { text-align: center; font-size: 2.2rem; font-weight: 900; margin: 30px 0; letter-spacing: 12px; }
                                  .section { margin-bottom: 25px; }
                                  .section-title { font-weight: bold; margin-bottom: 8px; font-size: 1.1rem; }
                                  .table { width: 80%; border-collapse: collapse; margin: 10px auto; }
                                  .table th, .table td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 0.9rem; }
                                </style>
                            </head>
                            <body>
                              ${printContent.innerHTML}
                              <script>
                                setTimeout(() => {
                                  window.print();
                                  window.close();
                                }, 500);
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    style={{ background: 'var(--kaic-navy)', color: 'white', border: 'none', padding: '8px 20px' }}
                  >
                    📥 갑지 다운받기 (Print PDF)
                  </button>
                </div>

                <div id="cover-page-content" style={{ background: 'white', padding: '35px 45px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '4px', color: '#1e293b', fontStyle: 'normal', lineHeight: 1.4 }}>
                  {(() => {
                    try {
                      const startDateStr = testStartDate ? String(testStartDate) : '';
                      const year = startDateStr ? startDateStr.substring(0, 4) : new Date().getFullYear().toString();
                      const yy = year.substring(2);
                      const typeChar = testType === '일반시험' ? 'T' : 'K';
                      const seq = (selectedTest.testerBarcode || '').split('_').pop() || '000';
                      const issueNo = `KAIC-${year}-${typeChar}${seq}-0`;
                      const productId = `${yy}-${typeChar}-${seq}-S1`;
                      const techMgr = users.find(u => u.role === 'TECH_MGR');
                      
                      return (
                        <div className="document">
                          <img src="/Back.png" className="watermark" alt="" />
                          <div className="content-wrapper">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                               <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                   <img src="/kaic-logo.png" alt="KAIC" style={{ height: '35px', width: 'auto', alignSelf: 'flex-start' }} />
                                   <div style={{ fontSize: '0.65rem', color: '#64748b', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                                     서울특별시 성동구 왕십리로 58, 416 (성수동, 서울숲포휴)<br/>
                                     Tel : 02-2135-4264 / Fax : 02-6280-3134
                                   </div>
                                 </div>
                               </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>성적서 번호</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{issueNo}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>[ 1 / 1 ]</div>
                              </div>
                            </div>

                            <h1 style={{ textAlign: 'center', fontSize: '2.4rem', fontWeight: 900, margin: '20px 0', letterSpacing: '12px' }}>
                              시 험 성 적 서
                            </h1>

                            <div style={{ marginBottom: '8px' }}>
                              <h4 style={{ margin: '0 0 4px 0' }}>1. 의뢰인</h4>
                              <div style={{ marginLeft: '20px', fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '3px' }}>○ 기 관 명 : {selectedTest.clientName || selectedTest.client || '-'}</div>
                                <div>○ 주 소 : {(() => {
                                  try {
                                    if (!selectedTest.extra) return '-';
                                    const parsed = JSON.parse(selectedTest.extra);
                                    return parsed.clientAddress || '-';
                                  } catch (e) {
                                    return '-';
                                  }
                                })()}</div>
                              </div>
                            </div>

                            <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>2. 시험대상품목 : </h4>
                              <span style={{ fontWeight: 600, lineHeight: 1.4, fontSize: '0.95rem', wordBreak: 'break-all' }}>{testProduct || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <table style={{ width: '80%', borderCollapse: 'collapse', marginTop: '5px' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ border: '1px solid #333', padding: '6px', background: '#f8fafc', width: '30%', textAlign: 'center', fontSize: '0.85rem' }}>시험대상품목번호</td>
                                    <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center', fontSize: '0.85rem' }}>{productId}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ border: '1px solid #333', padding: '6px', background: '#f8fafc', textAlign: 'center', fontSize: '0.85rem' }}>접수번호</td>
                                    <td style={{ border: '1px solid #333', padding: '6px', textAlign: 'center', fontSize: '0.85rem' }}>{selectedTest.barcode || '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                              <h4 style={{ margin: '0 0 5px 0' }}>3. 시험기간 : <span style={{ fontWeight: 400 }}>{testStartDate || '-'} ~ {testEndDate || '-'}</span></h4>
                            </div>

                            <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                              <h4 style={{ margin: 0, whiteSpace: 'nowrap' }}>4. 시험목적 : </h4>
                              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{testPurpose || '-'}</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                              <h4 style={{ margin: '0 0 4px 0' }}>5. 시험방법 : </h4>
                              <div style={{ marginLeft: '20px', fontSize: '0.95rem', fontWeight: 400, whiteSpace: 'pre-wrap', lineHeight: 1.4, wordBreak: 'break-all' }}>
                                {testMethod || '-'}
                              </div>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                              <h4 style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                                6. 시험결과 : (KAIC-F-7.8-03(을)) “시험결과요약”, “시험방법” 및 “시험결과” 첨부 참조<br/>
                                <span style={{ fontWeight: 400, marginLeft: '25px', fontSize: '0.85rem' }}>
                                   시험항목, 한계, 시험결과, 단위 등은 의뢰인과의 협의 시 의뢰인 요구에 의해 선택사항입니다.
                                </span><br/>
                                <span style={{ fontWeight: 400, marginLeft: '25px', fontSize: '0.85rem' }}>
                                  이 시험결과는 의뢰인이 제시한 시험대상품목 및 시험대상품목에 한정되며,  * 표시된 시험결과는 시험기관의 인정 범위 밖의 것임을 밝힙니다.
                                </span>
                              </h4>
                              <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                              <table style={{ borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td rowSpan={2} style={{ border: '1px solid #333', padding: '6px 12px', fontSize: '0.8rem', width: '50px', textAlign: 'center', background: '#f8fafc' }}>확 인</td>
                                    <td style={{ border: '1px solid #333', padding: '6px 15px', fontSize: '0.85rem', minWidth: '200px', textAlign: 'left' }}>
                                      작성자 : <span style={{ fontWeight: 700, marginLeft: '10px' }}>{user?.name || '-'}</span>
                                    </td>
                                    <td style={{ border: '1px solid #333', padding: '6px 15px', fontSize: '0.85rem', minWidth: '200px', textAlign: 'left' }}>
                                      기술책임자 : <span style={{ fontWeight: 700, marginLeft: '10px' }}>{techMgr?.name || '-'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ border: '1px solid #333', padding: '4px 15px', fontSize: '0.8rem', textAlign: 'center' }}>(인/서명)</td>
                                    <td style={{ border: '1px solid #333', padding: '4px 15px', fontSize: '0.8rem', textAlign: 'center' }}>(인/서명)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                              <h4 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center' }}>○ 시험장소 : 
                                <span style={{ fontWeight: 400, display: 'inline-flex', gap: '8px', marginLeft: '10px', fontSize: '0.8rem' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>{testLocation?.includes('고정') ? '☑' : '☐'} 고정시험실</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>☐ 외부시험실(위탁)</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>☐ 외부시험실(일반)</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>{testLocation?.includes('현장') ? '☑' : '☐'} 기타( </span>
                                  <span style={{ wordBreak: 'break-all', maxWidth: '300px' }}>{testAddress || '-'}</span>
                                  <span> )</span>
                                </span>
                              </h4>
                              <div style={{ fontSize: '0.8rem', marginLeft: '20px', color: '#475569' }}>
                                <div>* 고정시험실 주소 : {testLocation?.includes('고정') ? '서울특별시 성동구 왕십리로 58. 서울숲포휴 416호' : '-'}</div>
                                <div>* 외부검증 진행지 : {testLocation?.includes('현장') ? (testAddress || '-') : '-'}</div>
                              </div>
                            </div>

                             <div style={{ textAlign: 'center', marginTop: '15px' }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{new Date().getFullYear()}. {new Date().getMonth() + 1}. {new Date().getDate()}.</div>
                              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '8px' }}>한국인공지능검증원장 <span style={{ marginLeft: '15px', fontSize: '1.1rem', border: '1px solid #333', borderRadius: '50%', padding: '6px' }}>(印)</span></div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ textAlign: 'left', lineHeight: 1.4, maxWidth: '80%' }}>* 이 시험성적서는 시험목적에 의한 시험대상품목의 시험결과 확인 이외의 용도로 사용될 수 없습니다.</div>
                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>(KAIC-F-7.8-03(갑))</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } catch (err) {
                      console.error('Cover Page Render Error:', err);
                      return <div style={{ padding: '20px', color: 'red' }}>성적서 미리보기를 불러오는 중 오류가 발생했습니다.</div>;
                    }
                  })()}
                </div>
              </div>
            )}

            <div style={{ marginTop: '3rem', padding: '0 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedId(null)} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', borderRadius: '30px', fontWeight: 600, margin: 0 }}>
                  ← 목록으로 돌아가기
                </button>
                
                {selectedTest.status !== 'COMPLETED' ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleStartTest} 
                    disabled={!testStartDate || !testEndDate || !testLocation || !testType}
                    style={{ padding: '0.8rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '30px', background: (!testStartDate || !testEndDate || !testLocation || !testType) ? '#94a3b8' : (selectedTest.status === 'RECEIVED' ? '#10b981' : '#3b82f6'), display: 'inline-flex', alignItems: 'center', gap: '10px', margin: 0, border: 'none' }}
                  >
                    {selectedTest.status === 'RECEIVED' ? '🚀 시험 시작 (Start Test)' : '💾 정보 업데이트 (Update)'}
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
                <th>접수번호</th>
                <th>의뢰 기관</th>
                <th>상태</th>
                <th>할당 일시</th>
                <th>작업 링크</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 800, color: 'var(--kaic-blue)' }}>{t.barcode}</td>
                  <td style={{ fontWeight: 700 }}>{t.client}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    {t.assignedAt ? new Date(t.assignedAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td>
                    <button className="btn btn-primary" onClick={() => handleOpenDetail(t.id)} style={{ width: 'auto', minHeight: '36px', padding: '0 20px', marginBottom: 0, borderRadius: '8px', fontWeight: 700 }}>
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
