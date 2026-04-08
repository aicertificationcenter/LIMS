/**
 * @file Reports.tsx
 * @description 시험원이 담당한 시험 건의 증적 자료를 관리하고 최종 성적서(PDF)를 업로드하여 시험을 완료하는 페이지입니다.
 * 증적 파일 업로드/삭제, 성적서 등록 및 최종 제출(상태 변경) 기능을 담당합니다.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Download, FileText, Trash2, UploadCloud, FileType } from 'lucide-react';

export const Reports = () => {
  // 인증 정보
  const { user } = useAuth();
  
  // 데이터 상태 관리
  const [myTests, setMyTests] = useState<any[]>([]); // 내가 담당한 시험 목록
  const [loading, setLoading] = useState(true);     // 데이터 로딩 플래그
  const [selectedId, setSelectedId] = useState<string | null>(null); // 현재 성적서 작업 중인 시험 ID

  // 사용자 정보 로드 시 시험 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  /** 본인에게 배정된 시험 업무 목록을 조회합니다. */
  const fetchMyTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient.tests.listMyTasks(user.id);
      // 이미 시작된 시험(IN_PROGRESS)이나 완료된 시험(COMPLETED)만 표시
      setMyTests(data.filter((t: any) => t.status !== 'RECEIVED'));
    } catch (err) {
      console.error('업무 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  /** 현재 선택된 시험 객체 */
  const selectedTest = myTests.find((t: any) => t.id === selectedId);

  /** 
   * 단일 파일을 증적 자료로 업로드합니다.
   * 이미지를 포함한 모든 파일 형식을 지원하며, uploaderId가 포함됩니다.
   */
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

  /** 증적 자료를 로컬로 다운로드합니다. */
  const handleDownloadEvidence = (ev: any) => {
    if (!ev.dataUrl) return;
    const link = document.createElement('a');
    link.href = ev.dataUrl;
    link.download = ev.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** 업로드된 증적 자료를 삭제합니다. (컴플릿 상태 전까지만 가능) */
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

  /** 최종 성적서(PDF) 파일을 업로드합니다. */
  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    
    if (file.type !== 'application/pdf') {
      alert('성적서는 PDF 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        await fetch('/api/receptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedId, reportPdfUrl: dataUrl })
        });
        alert('성적서가 업로드되었습니다.');
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  /** 시험을 최종 완료 상태로 변경합니다. (성적서가 등록되어야 가능) */
  const handleCompleteTest = async () => {
    if (!selectedId) return;
    if (confirm('시험을 최종 완료하시겠습니까? 완료 후에는 수정이 제한될 수 있습니다.')) {
      try {
        await fetch('/api/receptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedId, status: 'COMPLETED' })
        });
        alert('시험이 최종 완료되었습니다.');
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중...</div>;
  }

  // 성적서 편집 상세 모드
  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <header className="card" style={{ gridColumn: '1 / -1', background: 'var(--kaic-navy)', color: 'white', padding: '1.5rem 2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ margin: 0 }}>성적서 발행 및 증적 관리</h2>
             <button 
               className="btn" 
               onClick={() => setSelectedId(null)} 
               style={{ 
                 background: 'rgba(255, 255, 255, 0.15)', 
                 border: '1px solid rgba(255, 255, 255, 0.4)', 
                 color: 'white',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '6px',
                 padding: '8px 16px',
                 fontSize: '0.9rem',
                 fontWeight: 600,
                 borderRadius: '8px',
                 transition: 'all 0.2s'
               }}
               onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
               onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
             >
               ← 목록으로 이동
             </button>
           </div>
           <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>시험번호: {selectedTest.testerBarcode || selectedTest.barcode}</p>
        </header>

        {/* 1. 증적 자료 관리 섹션 */}
        <section className="card" style={{ gridColumn: 'span 8' }}>
          <h3 className="card-title">증적 자료 관리</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {selectedTest.evidences?.map((ev: any) => (
              <div key={ev.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  {ev.fileType.startsWith('image/') ? (
                    <img src={ev.dataUrl} alt={ev.fileName} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '4px' }} />
                  ) : (
                    <FileText size={32} color="#94a3b8" />
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--kaic-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.fileName}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <button onClick={() => handleDownloadEvidence(ev)} className="btn btn-secondary" style={{ flex: 1, minHeight: '28px', padding: 0 }} title="다운로드"><Download size={14} /></button>
                  {selectedTest.status !== 'COMPLETED' && (
                    <button onClick={() => handleRemoveEvidence(ev.id)} className="btn btn-secondary" style={{ flex: 1, minHeight: '28px', padding: 0, color: '#ef4444' }} title="삭제"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedTest.status !== 'COMPLETED' && (
            <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="file" style={{ display: 'none' }} onChange={handleAddEvidence} />
              <UploadCloud size={18} /> 증적 추가 업로드
            </label>
          )}
        </section>

        {/* 2. 최종 성적서 업로드 및 시험 완료 섹션 */}
        <section className="card" style={{ gridColumn: 'span 4' }}>
          <h3 className="card-title">최종 성적서 업로드</h3>
          <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#f1f5f9' }}>
            {selectedTest.reportPdfUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <FileType size={48} color="#ef4444" />
                <div style={{ fontWeight: 700 }}>성적서 PDF 등록 완료</div>
                <button 
                  onClick={() => { const win = window.open(); win?.document.write(`<iframe src="${selectedTest.reportPdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`); }} 
                  className="btn btn-secondary" style={{ width: '100%' }}
                >
                  파일 확인하기
                </button>
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>등록된 성적서가 없습니다.</p>
              </div>
            )}
            
            {selectedTest.status !== 'COMPLETED' && (
              <label className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleReportUpload} />
                {selectedTest.reportPdfUrl ? '성적서 교체' : 'PDF 성적서 업로드'}
              </label>
            )}
          </div>

          <div style={{ marginTop: '2rem' }}>
             <button 
               className="btn btn-primary" 
               onClick={handleCompleteTest} 
               disabled={selectedTest.status === 'COMPLETED' || !selectedTest.reportPdfUrl}
               style={{ width: '100%', background: selectedTest.status === 'COMPLETED' ? '#10b981' : '#f59e0b', fontSize: '1.1rem', padding: '1rem' }}
             >
               {selectedTest.status === 'COMPLETED' ? '✓ 시험 완료됨' : '📂 시험완료 (최종 제출)'}
             </button>
             {selectedTest.status !== 'COMPLETED' && !selectedTest.reportPdfUrl && (
               <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem', textAlign: 'center' }}>* 성적서 PDF를 먼저 업로드해 주세요.</p>
             )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title">성적서 발행 및 시험 완료</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>현재 진행 중이거나 완료된 시험 목록입니다. 증적을 관리하고 최종 성적서를 업로드하세요.</p>
        
        {myTests.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>시험번호</th>
                <th>의뢰기관</th>
                <th>구분</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--kaic-navy)' }}>{t.testerBarcode || t.barcode}</td>
                  <td>{t.client}</td>
                  <td><span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{t.testType || '-'}</span></td>
                  <td>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status === 'COMPLETED' ? '완료' : '시험 중'}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setSelectedId(t.id)} style={{ padding: '4px 12px', minHeight: '32px', fontSize: '0.85rem' }}>성적서 작성</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>진행 중인 시험 업무가 없습니다.</div>
        )}
      </section>
    </main>
  );
};
