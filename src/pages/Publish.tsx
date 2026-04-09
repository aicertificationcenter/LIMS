import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { CheckCircle, Printer, FileText } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const Publish = () => {
  const { user } = useAuth();

  const [myTests, setMyTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTest = myTests.find((t: any) => t.id === selectedId);

  // Parsed JSON Extra States
  const [tcResults, setTcResults] = useState<any[]>([]);
  const [tcMethods, setTcMethods] = useState<any[]>([]);
  const [tcDetails, setTcDetails] = useState<any[]>([]);
  const [tcOutputs, setTcOutputs] = useState<any[]>([]);

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
      setMyTests(data.filter((t: any) => t.status !== 'RECEIVED'));
    } catch (err) {
      console.error('업무 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTest?.extra) {
      try {
        const extraData = JSON.parse(selectedTest.extra);
        setTcResults(extraData.tcResults || []);
        setTcMethods(extraData.tcMethods || []);
        setTcDetails(extraData.tcDetails || []);
        setTcOutputs(extraData.tcOutputs || []);
      } catch (e) {
        setTcResults([]); setTcMethods([]); setTcDetails([]); setTcOutputs([]);
      }
    } else {
      setTcResults([]); setTcMethods([]); setTcDetails([]); setTcOutputs([]);
    }
  }, [selectedTest?.id, selectedId]);

  const handlePrint = () => {
    const printContent = document.getElementById('report-pdf-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업 차단을 해제해주세요.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
            <title>시험성적서 (을지) 인쇄</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; font-family: "Malgun Gothic", dotum, sans-serif; -webkit-print-color-adjust: exact; color: black; background: white; }
              .document-frame {
                position: relative;
                width: 210mm;
                /* height: 297mm; */
                min-height: 297mm;
                box-sizing: border-box;
                background: white;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .outer-border {
                position: absolute;
                top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
                border: 0.3pt solid #000;
                box-sizing: border-box;
                pointer-events: none;
                z-index: 10;
              }
              .document-content { 
                padding: 20mm; 
                height: 100%;
                box-sizing: border-box; 
                display: flex;
                flex-direction: column;
                position: relative;
                z-index: 1;
              }
              .watermark {
                position: fixed;
                top: 55%; left: 50%; transform: translate(-50%, -50%);
                width: 120mm; opacity: 0.08; z-index: 0; pointer-events: none;
              }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 0.5pt solid black; padding: 6px; text-align: center; font-size: 9pt; color: black; }
              .header-table th, .header-table td { font-size: 8pt; padding: 4px; }
            </style>
        </head>
        <body>
          \${printContent.innerHTML}
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
  };

  const handleApprovalRequest = async () => {
    if (!selectedId) return;
    try {
      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, status: 'COMPLETED' })
      });
      alert('결재요청이 완료되었습니다. (상태: COMPLETED)');
      fetchMyTasks();
      setSelectedId(null);
    } catch (err: any) {
      alert('결재요청 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>데이터 로딩중...</div>;

  const totalPages = 2 + (tcOutputs.length || 0);

  // 공통 A4 페이지 래퍼 컴포넌트
  const EuljiPageWrapper = ({ pageNum, title, children }: any) => {
    return (
      <div className="document-frame" style={{ width: '210mm', minHeight: '297mm', position: 'relative', background: 'white', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', margin: '0 auto 2rem auto' }}>
        <div className="outer-border" style={{ position: 'absolute', top: '10mm', left: '10mm', right: '10mm', bottom: '10mm', border: '0.3pt solid #000', pointerEvents: 'none' }}></div>
        <img src="/Back.png" className="watermark" alt="" style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', width: '120mm', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />

        <div className="document-content" style={{ padding: '20mm', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5pt solid black', paddingBottom: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src="/kaic-logo.png" alt="KAIC" style={{ height: '30px' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>
              <div>발급(접수)번호 : {selectedTest?.testerBarcode || selectedTest?.barcode}</div>
              <div style={{ color: '#475569', marginTop: '4px', fontSize: '8pt' }}>페이지: {pageNum} / {totalPages}</div>
            </div>
          </div>

          {/* Section Title */}
          <div style={{ marginBottom: '15px', color: '#1e293b' }}>
             <span style={{ fontSize: '13pt', fontWeight: 800, padding: '4px 10px', background: '#e2e8f0', borderRadius: '4px' }}>{title}</span>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, fontSize: '9pt', color: 'black' }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'right', fontSize: '8pt', fontWeight: 700, marginTop: '20px' }}>
            (KAIC-F-7.8-01(을))
          </div>
        </div>
      </div>
    );
  };

  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <header className="card" style={{ gridColumn: '1 / -1', background: 'var(--kaic-navy)', color: 'white', padding: '1.5rem 2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
               <FileText size={24} /> 성적서 (을지) 미리보기
             </h2>
             <button className="btn" onClick={() => setSelectedId(null)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px' }}>
               ← 목록 이동
             </button>
           </div>
        </header>

        <section style={{ gridColumn: '1 / -1', background: '#94a3b8', padding: '3rem 1rem', borderRadius: '12px' }}>

          <div id="report-pdf-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Page 1: 시험결과 요약 */}
            <EuljiPageWrapper pageNum={2} title="시험결과 요약">
              <div style={{ marginBottom: '15px', fontSize: '10pt' }}>
                <div style={{ marginBottom: '5px' }}><strong>• 담당자 :</strong> {user?.name || '-'}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '10px' }}>TC 번호</th>
                    <th style={{ border: '1px solid black', padding: '10px' }}>시험목표</th>
                    <th style={{ border: '1px solid black', padding: '10px' }}>결과 (달성여부)</th>
                  </tr>
                </thead>
                <tbody>
                  {tcResults.map((r, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid black', padding: '10px', fontWeight: 600 }}>TC {i+1}</td>
                      <td style={{ border: '1px solid black', padding: '10px' }}>{r.goal || '-'}</td>
                      <td style={{ border: '1px solid black', padding: '10px' }}>{r.result || '-'}</td>
                    </tr>
                  ))}
                  {tcResults.length === 0 && (
                    <tr><td colSpan={3} style={{ border: '1px solid black', padding: '20px' }}>데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </EuljiPageWrapper>

            {/* Page 2: 시험방법 */}
            <EuljiPageWrapper pageNum={3} title="시험방법 (시험항목별 세부방법)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {tcDetails.map((td, i) => (
                  <div key={i} style={{ border: '1px solid #cbd5e1', padding: '15px', borderRadius: '4px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, marginBottom: '10px', fontSize: '10pt', color: 'var(--kaic-blue)' }}>[TC {i+1}] {tcMethods[i]?.category || ''}</div>

                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, width: '70px' }}>목 적 :</span>
                      <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{td.method || '-'}</span>
                    </div>

                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, width: '70px' }}>규 격 :</span>
                      <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{tcMethods[i]?.standard || '-'}</span>
                    </div>

                    <div style={{ display: 'flex', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, width: '70px' }}>방 법 :</span>
                      <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{td.procedure || '-'}</span>
                    </div>

                    <div style={{ display: 'flex' }}>
                      <span style={{ fontWeight: 700, width: '70px' }}>특이사항 :</span>
                      <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{td.note || '-'}</span>
                    </div>
                  </div>
                ))}
                {tcDetails.length === 0 && <div>데이터가 없습니다.</div>}
              </div>
            </EuljiPageWrapper>

            {/* Page 3 ~ X : TC별 시험결과 */}
            {tcOutputs.map((out, idx) => (
              <EuljiPageWrapper key={idx} pageNum={idx + 4} title={`시험결과 (TC ${idx + 1} - ${tcMethods[idx]?.category || ''})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                  <div style={{ border: '1px solid black', padding: '12px', background: '#fff' }}>
                    <div style={{ fontWeight: 800, marginBottom: '8px', fontSize: '10pt' }}>▶ 시험지표</div>
                    <div style={{ marginBottom: '6px' }}>1) 평가지표 : {out.metricName || '-'}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '6px' }}>2) 평가산식 : </span>
                      {out.metricFormulaImg ? (
                        <img src={out.metricFormulaImg} alt="산식" style={{ maxHeight: '60px' }} />
                      ) : '-'}
                    </div>
                  </div>

                  <div style={{ border: '1px solid black', padding: '12px', background: '#fff' }}>
                    <div style={{ fontWeight: 800, marginBottom: '8px', fontSize: '10pt' }}>▶ 시험결과 (요약)</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{out.resultSummary || '-'}</div>
                  </div>

                  <div style={{ border: '1px solid black', padding: '12px', background: '#fff' }}>
                    <div style={{ fontWeight: 800, marginBottom: '12px', fontSize: '10pt' }}>▶ 증적 목록</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {out.evidences?.slice(0, out.evidenceCount).map((ev: any, evIdx: number) => (
                        <div key={evIdx} style={{ border: '1px dashed #cbd5e1', padding: '10px' }}>
                          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--kaic-blue)' }}>
                            세부시험 {evIdx + 1} : {ev.title || '-'}
                          </div>
                          <div style={{ fontSize: '8.5pt', marginBottom: '10px', whiteSpace: 'pre-wrap', color: '#334155' }}>
                            {ev.description}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
                            {ev.images?.map((img: any, iIdx: number) => (
                              <div key={iIdx} style={{ border: '1px solid #e2e8f0', padding: '10px', textAlign: 'center', width: '100%', background: '#f8fafc', borderRadius: '4px', pageBreakInside: 'avoid' }}>
                                <img src={img.url} alt="증적" style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', backgroundColor: 'white', border: '1px solid #cbd5e1' }} />
                                <div style={{ fontSize: '9pt', marginTop: '8px', color: '#334155', fontWeight: 600 }}>{img.caption}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '5px' }}>
                     <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '10pt' }}>▶ 성능 평가 결과</div>
                     <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1.5px solid black' }}>
                        <thead style={{ background: '#f1f5f9' }}>
                          <tr>
                            <th style={{ border: '1px solid black', padding: '8px' }}>성능지표</th>
                            <th style={{ border: '1px solid black', padding: '8px' }}>성능목표</th>
                            <th style={{ border: '1px solid black', padding: '8px' }}>시험결과</th>
                            <th style={{ border: '1px solid black', padding: '8px' }}>평가</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{out.metricName || '-'}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{out.metricTarget || '-'}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{out.metricResult || '-'}</td>
                            <td style={{ border: '1px solid black', padding: '8px', fontWeight: 800 }}>{out.metricEvaluation || '-'}</td>
                          </tr>
                        </tbody>
                     </table>
                  </div>

                </div>
              </EuljiPageWrapper>
            ))}

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handlePrint}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: '#334155', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Printer size={20} /> 출력하기 (Print PDF)
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleApprovalRequest}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            >
              <CheckCircle size={20} /> 결재요청 (Submit)
            </button>
          </div>

        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={24} color="var(--kaic-blue)" /> 발행 대상 목록 (Publish Tasks)
        </h2>

        {myTests.length > 0 ? (
          <table className="data-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>접수번호</th>
                <th>의뢰 기관</th>
                <th>진행 상태</th>
                <th>작업 링크</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map((t: any) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 800, color: 'var(--kaic-blue)' }}>{t.barcode}</td>
                  <td style={{ fontWeight: 700 }}>{t.client}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    <button className="btn btn-primary" onClick={() => setSelectedId(t.id)} style={{ width: 'auto', padding: '6px 20px', borderRadius: '6px', margin: 0 }}>
                      미리보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
           <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>발행 대상 파일이 없습니다.</div>
        )}
      </section>
    </main>
  );
};