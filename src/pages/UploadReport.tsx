import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { FileUp, CheckCircle, Lock } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const UploadReport = () => {
  const { user } = useAuth();
  const [myTests, setMyTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && ['TESTER'].includes(user.role)) {
      fetchMyTasks();
    }
  }, [user]);

  const fetchMyTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient.tests.listMyTasks(user.id);
      // Show APPROVED tests (need upload) and COMPLETE/DISPOSED tests (history)
      setMyTests(data.filter((t: any) => ['APPROVED', 'COMPLETED', 'DISPOSED'].includes(t.status)));
    } catch (err) {
      console.error('업무 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
       alert('PDF 파일만 업로드 가능합니다.');
       return;
    }

    try {
      // 1. Get temporary upload link from backend
      const linkRes = await fetch('/api/dropbox-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          type: 'REPORT',
          extension: 'pdf'
        })
      });
      
      if (!linkRes.ok) {
        const errData = await linkRes.json().catch(() => ({}));
        const detail = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
        throw new Error(`${errData.message || '세션 생성 실패'}${detail ? ` (${detail})` : ''}`);
      }
      
      const { link, path } = await linkRes.json();

      // 2. Upload directly from Browser to Dropbox via Temporary Link
      const uploadRes = await fetch(link, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: file // Sending actual File binary directly
      });

      if (!uploadRes.ok) {
        throw new Error(`Dropbox 파일 직접 전송 실패 (${uploadRes.status})`);
      }

      // 3. Inform backend to create a shared link and map it to DB
      const finalizeRes = await fetch('/api/dropbox-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, path })
      });

      if (!finalizeRes.ok) {
        throw new Error('Dropbox 링크 활성화 실패');
      }

      alert('성적서가 Dropbox 클라우드에 성공적으로 업로드 및 연동되었습니다. 완료 버튼을 눌러 확정해주세요.');
      fetchMyTasks();
    } catch (err: any) {
      alert(`Dropbox 연동 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  const handleCompleteTest = async (id: string, barcode: string) => {
    if (!window.confirm(`[${barcode}] 건의 시험을 최종 완료(제출) 처리하시겠습니까?\n완료 후에는 내용을 더 이상 수정할 수 없습니다.`)) return;
    try {
      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'COMPLETED' })
      });
      alert('최종 제출이 완료되어 수정이 잠금 처리되었습니다.');
      fetchMyTasks();
    } catch (err) {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (!user || (!['TESTER'].includes(user.role))) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>접근 권한이 없습니다 (시험원 전용).</div>;
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>데이터 로딩중...</div>;

  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileUp size={24} color="var(--kaic-blue)" /> 최종 성적서 업로드
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>관리자 승인이 완료된 정식 성적서(PDF)를 이곳에 업로드하여 시험 업무를 최종 마감합니다.</p>

        {myTests.length > 0 ? (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>접수번호 (성적서번호)</th>
                <th>의뢰 기관</th>
                <th>진행 상태</th>
                <th>결재/입금 내역 (천원별)</th>
                <th>성적서 PDF 파일</th>
                <th>업무 마감</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 800, color: 'var(--kaic-blue)' }}>
                    <div>{t.barcode}</div>
                    {t.formalBarcode && <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>{t.formalBarcode}</div>}
                  </td>
                  <td style={{ fontWeight: 700 }}>{t.clientName || t.client}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    {(() => {
                      const est = (t.estFees || 0) / 1000;
                      const paid = ((t.advPaidAmt || 0) + (t.interimPaidAmt || 0) + (t.finalPaidAmt || 0)) / 1000;
                      return (
                        <div style={{ textAlign: 'left', fontSize: '0.85rem' }}>
                          <div>견적: <b style={{ color: '#1e293b' }}>{est.toLocaleString()}</b></div>
                          <div>입금: <b style={{ color: t.isDepositCompleted ? '#10b981' : '#ef4444' }}>{paid.toLocaleString()}</b></div>
                          {t.isDepositCompleted && <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.75rem', marginTop: '4px' }}>입금완료</div>}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      {t.reportPdfUrl ? (
                         <a href={t.reportPdfUrl} target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}><CheckCircle size={16}/> 등록완료 (조회)</a>
                      ) : (
                         <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>미등록</span>
                      )}
                      {t.status === 'APPROVED' && (
                        <div>
                          <input type="file" id={`pdf-upload-${t.id}`} accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, t.id)} />
                          <label htmlFor={`pdf-upload-${t.id}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '30px', margin: 0, cursor: 'pointer', display: 'inline-block' }}>파일 선택</label>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                     {t.status === 'COMPLETED' ? (
                       <div style={{ color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><Lock size={16}/> 마감됨</div>
                     ) : (
                       <button 
                         className="btn btn-primary" 
                         style={{ minHeight: '30px', padding: '4px 12px', margin: 0, borderRadius: '6px', opacity: (!t.reportPdfUrl || !t.isDepositCompleted) ? 0.5 : 1 }} 
                         disabled={!t.reportPdfUrl || !t.isDepositCompleted} 
                         title={!t.isDepositCompleted ? "재무관리자의 입금완료 승인이 필요합니다." : ""}
                         onClick={() => handleCompleteTest(t.id, t.barcode)}>
                           시험 완료(제출)
                       </button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>승인 완료되어 업로드가 필요한 항목이 없습니다.</div>
        )}
      </section>
    </main>
  );
};
