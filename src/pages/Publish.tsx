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

  // 누락된 신규 State 추가
  const [envDiagramUrl, setEnvDiagramUrl] = useState<string | null>(null);
  const [pcSpec, setPcSpec] = useState('');
  const [envDescription, setEnvDescription] = useState('');
  const [venueImages, setVenueImages] = useState<any[]>([]);
  const [venueImageCount, setVenueImageCount] = useState(1);
  const [venueDescription, setVenueDescription] = useState('');

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

        setEnvDiagramUrl(extraData.envDiagramUrl || null);
        setPcSpec(extraData.pcSpec || '');
        setEnvDescription(extraData.envDescription || '');

        if (extraData.venueImages && Array.isArray(extraData.venueImages)) {
          setVenueImages(extraData.venueImages);
          setVenueImageCount(extraData.venueImageCount || 1);
        } else if (extraData.envImages && Array.isArray(extraData.envImages)) {
          setVenueImages(extraData.envImages);
          setVenueImageCount(extraData.envImageCount || 1);
        } else {
          setVenueImages([]);
          setVenueImageCount(1);
        }
        setVenueDescription(extraData.venueDescription || '');

      } catch (e) {
        setTcResults([]); setTcMethods([]); setTcDetails([]); setTcOutputs([]);
        setEnvDiagramUrl(null); setPcSpec(''); setEnvDescription(''); setVenueImages([]); setVenueDescription('');
      }
    } else {
      setTcResults([]); setTcMethods([]); setTcDetails([]); setTcOutputs([]);
      setEnvDiagramUrl(null); setPcSpec(''); setEnvDescription(''); setVenueImages([]); setVenueDescription('');
    }
  }, [selectedTest?.id, selectedId]);

  const handlePrint = (isPreview: boolean = false) => {
    const printContent = document.getElementById('report-pdf-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업 차단을 해제해주세요.');
      return;
    }

    const draftHtml = isPreview ? '<div class="draft-badge">DRAFT</div>' : '';
    const docTitle = selectedTest?.barcode || '시험성적서';

    printWindow.document.write(`
      <html>
        <head>
            <title>${docTitle}</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; font-family: "Malgun Gothic", dotum, sans-serif; -webkit-print-color-adjust: exact; color: black; background: white; }
              .document-frame {
                position: relative;
                width: 210mm;
                height: 297mm;
                box-sizing: border-box;
                background: white;
                page-break-after: always;
                page-break-inside: avoid;
                overflow: hidden;
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
                padding: 15mm 20mm;  /* 상하 간격을 약간 타이트하게 조절하여 공간 확보 */
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
              .draft-badge {
                position: fixed;
                top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 150pt; color: rgba(255, 0, 0, 0.15); font-weight: 900; z-index: 1000; pointer-events: none;
              }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 0.5pt solid black; padding: 6px; text-align: center; font-size: 9pt; color: black; }
              .header-table th, .header-table td { font-size: 8pt; padding: 4px; }
            </style>
        </head>
        <body>
          ${draftHtml}
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
  };

  const handleApprovalRequest = async () => {
    if (!selectedId) return;
    try {
      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, status: 'APPROVAL_REQUESTED' })
      });
      alert('결재요청이 완료되었습니다.');
      fetchMyTasks();
      setSelectedId(null);
    } catch (err: any) {
      alert('결재요청 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>데이터 로딩중...</div>;

  // --- 페이지 네이션 엔진 ---
  const methodPages: any[] = [];
  let currentMethodChunk: any[] = [];
  let currentMethodWeight = 0;

  const pushMethodBlock = (block: any) => {
    if (currentMethodWeight + block.weight > 92 && currentMethodChunk.length > 0) {
      methodPages.push(currentMethodChunk);
      currentMethodChunk = [];
      currentMethodWeight = 0;
    }
    currentMethodChunk.push(block);
    currentMethodWeight += block.weight;
  };


    // [블록 A: 시험 세부항목 및 방법 테이블 (기본 개요 대체)]
  if (tcMethods && tcMethods.length > 0) {
    pushMethodBlock({ type: 'tcMethodsTable', weight: Math.min(25 + tcMethods.length * 8, 80), data: { methods: tcMethods, product: selectedTest?.testProduct || '(나의시험에서 입력한 품목명이 자동 연동됩니다)' } });
  }

  // [블록 B: 시험환경]
  if (envDiagramUrl || pcSpec || envDescription) {
    pushMethodBlock({ type: 'envDiagram', weight: envDiagramUrl ? 40 : 25, data: { envDiagramUrl, pcSpec, envDescription } });
  }

  // [블록 B2: 시험 세부항목 및 방법 (테이블2)]
  if (tcDetails && tcDetails.length > 0) {
    pushMethodBlock({ type: 'tcDetailsTable', weight: Math.min(25 + tcDetails.length * 8, 80), data: { details: tcDetails, methods: tcMethods, product: selectedTest?.testProduct || '(나의시험에서 입력한 품목명이 자동 연동됩니다)' } });
  }


  // [블록 D: 시험장 환경 상세 (다중사진과 설명)]
  if (venueImages.slice(0, venueImageCount).some((v:any) => v.url)) {
    pushMethodBlock({ type: 'venueEnv', weight: 35, data: { venueImages: venueImages.slice(0, venueImageCount), venueDescription } });
  }

  // [블록 E: 기존 항목별 시험방법]
  if (tcDetails && tcDetails.length > 0) {
    pushMethodBlock({ type: 'tcDetailHeader', weight: 10, data: null });
    tcDetails.forEach((td, i) => {
      const textLen = (td.method || '').length + (td.procedure || '').length + (td.note || '').length;
      let weight = 15 + Math.ceil(textLen / 50); 
      if (weight > 80) weight = 80;
      pushMethodBlock({ type: 'tcDetailItem', weight, data: { td, original: tcMethods[i], index: i } });
    });
  }

  if (currentMethodChunk.length > 0) {
    methodPages.push(currentMethodChunk);
  }

  // 2. TC 증적결과(Outputs) 쪼개기
  const tcPages: any[] = [];
  tcOutputs.forEach((tc, idx) => {
    const blocks: any[] = [];
    blocks.push({ type: 'tc_objective', weight: 15, data: { purpose: tcDetails[idx]?.method, standard: tcMethods[idx]?.standard } });
    blocks.push({ type: 'metric', weight: tc.metricFormulaImg ? 20 : 12, data: tc });
    blocks.push({ type: 'summary', weight: 12, data: tc });

    tc.evidences?.slice(0, tc.evidenceCount).forEach((ev: any, evIdx: number) => {
      const allImages = ev.images || [];
      
      if (allImages.length === 0) {
        blocks.push({ type: 'evidence_group', weight: 45, data: { ev, evIdx, images: [] } });
        return;
      }

      // Chunk images into sets of 4 max per box
      const imageChunks = [];
      for (let i = 0; i < allImages.length; i += 4) {
        imageChunks.push(allImages.slice(i, i + 4));
      }

      imageChunks.forEach((imgChunk, chunkIdx) => {
        blocks.push({ 
          type: 'evidence_group', 
          weight: 45, 
          data: { 
            ev, 
            evIdx, 
            images: imgChunk,
            isContinued: chunkIdx > 0
          } 
        });
      });
    });
    blocks.push({ type: 'evaluation', weight: 20, data: tc });

    let currentTcChunk: any[] = [];
    let currentTcWeight = 0;

    blocks.forEach(block => {
      if (currentTcWeight + block.weight > 92 && currentTcChunk.length > 0) {
        tcPages.push({ tcIndex: idx, blocks: currentTcChunk });
        currentTcChunk = [];
        currentTcWeight = 0;
      }
      currentTcChunk.push(block);
      currentTcWeight += block.weight;
    });
    if (currentTcChunk.length > 0) {
      tcPages.push({ tcIndex: idx, blocks: currentTcChunk });
    }
  });

  const totalPages = 1 + 1 + methodPages.length + tcPages.length;

  const EuljiPageWrapper = ({ pageNum, sectionMainTitle, subTitle, children, isLastPage }: any) => {
    return (
      <div className="document-frame" style={{ width: '210mm', height: '297mm', position: 'relative', background: 'white', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', margin: '0 auto 2rem auto', overflow: 'hidden', pageBreakAfter: 'always', pageBreakInside: 'avoid' }}>
        <div className="outer-border" style={{ position: 'absolute', top: '10mm', left: '10mm', right: '10mm', bottom: '10mm', border: '0.3pt solid #000', pointerEvents: 'none' }}></div>
        <img src="/Back.png" className="watermark" alt="" style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', width: '120mm', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />

        <div className="document-content" style={{ padding: '12mm 15mm', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5pt solid black', paddingBottom: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img src="/kaic-logo.png" alt="KAIC" style={{ height: '30px' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '9pt', fontWeight: 600 }}>
              <div>성적서 번호 : {selectedTest?.formalBarcode || `KAIC-${new Date().getFullYear()}-${selectedTest?.testType === '일반시험' ? 'T' : 'K'}${(selectedTest?.testerBarcode || '').split('_').pop() || '000'}-X`}</div>
              <div style={{ color: '#475569', marginTop: '4px', fontSize: '8pt' }}>페이지: {pageNum} / {totalPages}</div>
            </div>
          </div>

          {sectionMainTitle && (
            <div style={{ textAlign: 'center', fontSize: '20pt', fontWeight: 900, margin: '5px 0 25px 0', letterSpacing: '4px' }}>
              {sectionMainTitle}
            </div>
          )}

          {subTitle && (
            <div style={{ marginBottom: '15px', color: '#1e293b' }}>
               <span style={{ fontSize: '11pt', fontWeight: 800, padding: '4px 10px', background: '#f1f5f9', borderRadius: '4px' }}>{subTitle}</span>
            </div>
          )}

          <div style={{ flex: 1, fontSize: '8.5pt', color: 'black', position: 'relative', overflow: 'hidden' }}>
            {children}
            {isLastPage && (
              <div style={{ position: 'absolute', bottom: '0px', right: '0px', fontWeight: 800, fontSize: '10pt', paddingRight: '10px' }}>
                - 끝 -
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', fontSize: '8pt', fontWeight: 700, marginTop: '10px', borderTop: '0.5pt solid #cbd5e1', paddingTop: '10px' }}>
            (KAIC-F-7.8-01(을))
          </div>
        </div>
      </div>
    );
  };

  if (selectedTest) {
    let currentPageCount = 1;

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

        {selectedTest.gapjiRejection && (
          <div style={{ gridColumn: '1 / -1', padding: '0.85rem 1.25rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', marginTop: '-1rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
            🚨 [갑지 반려사항] {selectedTest.gapjiRejection}
          </div>
        )}
        {selectedTest.euljiRejection && (
          <div style={{ gridColumn: '1 / -1', padding: '0.85rem 1.25rem', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', marginTop: selectedTest.gapjiRejection ? '0' : '-1rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
            🚨 [을지 반려사항] {selectedTest.euljiRejection}
          </div>
        )}

        <section style={{ gridColumn: '1 / -1', background: '#94a3b8', padding: '3rem 1rem', borderRadius: '12px', position: 'relative' }}>
          {selectedTest.status !== 'APPROVED' && selectedTest.status !== 'COMPLETED' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '150pt', color: 'rgba(255,0,0,0.2)', fontWeight: 900, pointerEvents: 'none', zIndex: 100 }}>
              DRAFT
            </div>
          )}
          <div id="report-pdf-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Page 2: 시험결과 요약 */}
            <EuljiPageWrapper pageNum={++currentPageCount} sectionMainTitle="시험결과 요약" isLastPage={false}>

              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5pt solid black', marginBottom: '25px', fontSize: '9pt', textAlign: 'center' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '20%', border: '1px solid black', fontWeight: 800, background: '#f8fafc', padding: '10px' }}>접수번호</td>
                    <td style={{ width: '30%', border: '1px solid black', padding: '10px', textAlign: 'left', color: '#1e293b', fontWeight: 600 }}>{selectedTest?.barcode}</td>
                    <td style={{ width: '20%', border: '1px solid black', fontWeight: 800, background: '#f8fafc', padding: '10px' }}>시험 담당자</td>
                    <td style={{ width: '30%', border: '1px solid black', padding: '10px', textAlign: 'left', color: '#1e293b', fontWeight: 600 }}>{user?.name || '-'}</td>
                  </tr>
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black' }}>
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '8px' }}>TC 번호</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>시험목표</th>
                    <th style={{ border: '1px solid black', padding: '8px' }}>결과 (달성여부)</th>
                  </tr>
                </thead>
                <tbody>
                  {tcResults.map((r, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid black', padding: '8px', fontWeight: 600 }}>TC {i+1}</td>
                      <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{r.goal || '-'}</td>
                      <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{r.result || '-'}</td>
                    </tr>
                  ))}
                  {tcResults.length === 0 && (
                    <tr><td colSpan={3} style={{ border: '1px solid black', padding: '20px' }}>데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </EuljiPageWrapper>

            {/* Methods Pages */}
            {methodPages.map((chunk, cIdx) => (
              <EuljiPageWrapper key={`method-${cIdx}`} pageNum={++currentPageCount} sectionMainTitle={cIdx === 0 ? "시험방법" : null} subTitle={cIdx === 0 ? null : "시험방법 (계속)"} isLastPage={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {chunk.map((block: any, bIdx: number) => {
                    if (block.type === 'envDiagram') {
                       return (
                        <div key={bIdx} style={{ border: '1px solid black', padding: '8px' }}>
                          <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '9.5pt' }}>▶ 시험환경</div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '8px', textAlign: 'center', background: '#f8fafc' }}>
                              <div style={{ fontWeight: 700, marginBottom: '6px' }}>[시험환경 구성도]</div>
                              {block.data.envDiagramUrl ? <img src={block.data.envDiagramUrl} alt="구성도" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }} /> : <div>-</div>}
                            </div>
                            <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '8px', background: '#f8fafc' }}>
                              <div style={{ fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>[시험용 PC 규격]</div>
                              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{block.data.pcSpec || '-'}</div>
                            </div>
                          </div>
                          {block.data.envDescription && (
                            <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', whiteSpace: 'pre-wrap' }}>
                              {block.data.envDescription}
                            </div>
                          )}
                        </div>
                       );
                    }
                    if (block.type === 'tcMethodsTable') {
                      return (
                        <div key={bIdx}>
                          <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '9.5pt' }}>▶ 시험방법</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black', fontSize: '8.5pt' }}>
                            <thead style={{ background: '#f1f5f9' }}>
                              <tr>
                                <th style={{ border: '1px solid black', padding: '6px', width: '25%' }}>시험대상품목의 명칭</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '35%' }}>시험대상 항목</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>시험대상 품목의 형태</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>시험규격</th>
                              </tr>
                            </thead>
                            <tbody>
                              {block.data.methods.map((tm: any, tIdx: number) => (
                                <tr key={tIdx}>
                                  {tIdx === 0 && (
                                    <td rowSpan={block.data.methods.length} style={{ border: '1px solid black', padding: '6px', fontWeight: 600, color: 'var(--kaic-blue)', wordBreak: 'break-all' }}>
                                      {block.data.product}
                                    </td>
                                  )}
                                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>
                                    <span style={{ fontWeight: 800 }}>[TC{tIdx+1}]</span> {tm.category || '-'}
                                  </td>
                                  <td style={{ border: '1px solid black', padding: '6px' }}>{tm.type || '-'}</td>
                                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>{tm.standard || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ marginTop: '6px', fontSize: '8pt', color: '#475569', lineHeight: 1.4 }}>
                            ○ 위 각 시험항목의 대상이 되는 시험대상 목적물(소프트웨어 모델 및 데이터셋)은 ISO/IEC 17025 및 측정불확도 추정 요건과 무관하게 시험 의뢰기관에 의해 제공되었으며, 본 시험기관은 제공된 데이터셋과 모델을 사용하여 성능 평가를 수행함.
                          </div>
                        </div>
                      );
                    }
                    if (block.type === 'tcDetailsTable') {
                      return (
                        <div key={bIdx}>
                          <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '9.5pt', color: '#1e293b' }}>▶ 시험 세부항목 및 방법</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black', fontSize: '8.5pt' }}>
                            <thead style={{ background: '#f1f5f9' }}>
                              <tr>
                                <th style={{ border: '1px solid black', padding: '6px', width: '15%' }}>시험항목</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '45%' }}>시험 세부항목/기준</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '40%' }}>시험 방법</th>
                              </tr>
                            </thead>
                            <tbody>
                              {block.data.details.map((tc: any, tIdx: number) => (
                                <tr key={tIdx}>
                                  <td style={{ border: '1px solid black', padding: '6px', fontWeight: 800 }}>TC{tIdx+1}</td>
                                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#334155' }}>
                                    {block.data.methods[tIdx]?.standard || '-'}
                                  </td>
                                  <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left', whiteSpace: 'pre-wrap', color: '#334155' }}>
                                    {tc.method || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ marginTop: '6px', fontSize: '8pt', color: '#475569', lineHeight: 1.4 }}>
                            ○ 소프트웨어 성능시험 시험대상품목 "{block.data.product}"을(를) 대상으로 주어진 시험 방법에 따라 시험을 수행한다.
                          </div>
                        </div>
                      );
                    }
                    if (block.type === 'venueEnv') {
                      return (
                        <div key={bIdx} style={{ border: '1px solid black', padding: '8px' }}>
                          <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '9.5pt' }}>▶ 시험장 환경</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {block.data.venueImages.map((img: any, iIdx: number) => img.url ? (
                               <div key={iIdx} style={{ border: '1px solid #e2e8f0', padding: '4px', textAlign: 'center', background: '#f8fafc' }}>
                                 <img src={img.url} alt="시험장" style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain' }} />
                                 <div style={{ fontSize: '7.5pt', marginTop: '2px' }}>{img.caption}</div>
                               </div>
                            ) : null)}
                          </div>
                          {block.data.venueDescription && (
                            <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', whiteSpace: 'pre-wrap' }}>
                              {block.data.venueDescription}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (block.type === 'tcDetailHeader') {
                      return <div key={bIdx} style={{ fontWeight: 800, marginBottom: '-5px', fontSize: '9.5pt' }}>▶ 시험항목별 시험방법</div>;
                    }
                    if (block.type === 'tcDetailItem') {
                      return (
                        <div key={bIdx} style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', background: '#f8fafc' }}>
                          <div style={{ fontWeight: 800, marginBottom: '10px', fontSize: '10pt', color: 'var(--kaic-blue)' }}>[TC {block.data.index+1}] {block.data.original?.category || ''}</div>
                          <div style={{ display: 'flex', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 700, width: '70px' }}>목 적 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{block.data.td.method || '-'}</span>
                          </div>
                          <div style={{ display: 'flex', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 700, width: '70px' }}>규 격 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{block.data.original?.standard || '-'}</span>
                          </div>
                          <div style={{ display: 'flex', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 700, width: '70px' }}>방 법 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{block.data.td.procedure || '-'}</span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ fontWeight: 700, width: '70px' }}>특이사항 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{block.data.td.note || '-'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </EuljiPageWrapper>
            ))}

            {/* TC Result Pages */}
            {tcPages.map((pageChunk, pIdx) => {
              const isAbsoluteLast = (pIdx === tcPages.length - 1);
              return (
                <EuljiPageWrapper 
                  key={`tc-${pIdx}`} 
                  pageNum={++currentPageCount} 
                  sectionMainTitle={pIdx === 0 ? "시험결과" : null}
                  subTitle={pIdx === 0 ? null : `시험결과 (TC ${pageChunk.tcIndex + 1})`} 
                  isLastPage={isAbsoluteLast}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {pIdx === 0 && (
                      <div style={{ marginBottom: '5px', color: '#1e293b' }}>
                         <span style={{ fontSize: '11pt', fontWeight: 800, padding: '4px 10px', background: '#f1f5f9', borderRadius: '4px' }}>시험결과 (TC {pageChunk.tcIndex + 1} - {tcMethods[pageChunk.tcIndex]?.category || ''})</span>
                      </div>
                    )}

                    {pageChunk.blocks.map((block: any, bIdx: number) => {
                      if (block.type === 'tc_objective') {
                        return (
                          <div key={bIdx} style={{ background: '#f8fafc', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 800, width: '50px', color: '#334155', fontSize: '9pt' }}>1) 목적 :</span>
                              <span style={{ flex: 1, whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '9pt' }}>{block.data.purpose || '-'}</span>
                            </div>
                            <div style={{ display: 'flex' }}>
                              <span style={{ fontWeight: 800, width: '50px', color: '#334155', fontSize: '9pt' }}>2) 규격 :</span>
                              <span style={{ flex: 1, whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '9pt' }}>{block.data.standard || '-'}</span>
                            </div>
                          </div>
                        );
                      }
                      if (block.type === 'metric') {
                        return (
                          <div key={bIdx} style={{ border: '1px solid black', padding: '6px', background: '#fff' }}>
                            <div style={{ fontWeight: 800, marginBottom: '2px', fontSize: '9pt' }}>▶ 시험지표</div>
                            <div style={{ marginBottom: '2px' }}>1) 평가지표 : {block.data.metricName || '-'}</div>
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                              <span style={{ marginRight: '6px' }}>2) 평가산식 : </span>
                              {block.data.metricFormulaImg ? <img src={block.data.metricFormulaImg} alt="산식" style={{ maxHeight: '40px' }} /> : '-'}
                            </div>
                          </div>
                        );
                      }
                      if (block.type === 'summary') {
                        return (
                          <div key={bIdx} style={{ border: '1px solid black', padding: '6px', background: '#fff' }}>
                            <div style={{ fontWeight: 800, marginBottom: '4px', fontSize: '9pt' }}>▶ 시험결과 (요약)</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{block.data.resultSummary || '-'}</div>
                          </div>
                        );
                      }
                      if (block.type === 'evidence_group') {
                        const hasImages = block.data.images && block.data.images.length > 0;
                        const numImages = hasImages ? block.data.images.length : 0;
                        const gridCols = numImages > 1 ? '1fr 1fr' : '1fr';
                        const gridRows = numImages > 2 ? '1fr 1fr' : '1fr';

                        return (
                          <div key={bIdx} style={{ border: '1.5pt solid #475569', marginBottom: '8px', background: '#fff', boxSizing: 'border-box' }}>
                            <div style={{ fontWeight: 800, padding: '6px 10px', background: '#f1f5f9', borderBottom: '1.5pt solid #475569', display: 'flex', alignItems: 'center' }}>
                              <span style={{ color: 'var(--kaic-blue)', marginRight: '8px' }}>세부시험 {block.data.evIdx + 1}{block.data.isContinued ? ' (계속)' : ''}</span> : {block.data.ev.title || '-'}
                            </div>
                            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {block.data.ev.description && !block.data.isContinued && (
                                <div style={{ fontSize: '8.5pt', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {block.data.ev.description}
                                </div>
                              )}
                              
                              {hasImages && (
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: gridCols, 
                                  gridTemplateRows: gridRows,
                                  gap: '10px',
                                  height: '320px' // 고정 높이 지정 
                                }}>
                                  {block.data.images.map((img: any, iIdx: number) => (
                                    <div key={iIdx} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                      <div style={{ flex: 1, border: '1px solid #cbd5e1', backgroundColor: '#fdfdfd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        <img src={img.url} alt="증적" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                      </div>
                                      {img.caption && <div style={{ fontSize: '8pt', marginTop: '4px', color: '#334155', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.caption}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      if (block.type === 'evaluation') {
                        return (
                          <div key={bIdx} style={{ marginTop: '2px' }}>
                             <div style={{ fontWeight: 800, marginBottom: '4px', fontSize: '9pt' }}>▶ 성능 평가 결과</div>
                             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black' }}>
                                <thead style={{ background: '#f1f5f9' }}>
                                  <tr>
                                    <th style={{ border: '1px solid black', padding: '4px' }}>성능지표</th>
                                    <th style={{ border: '1px solid black', padding: '4px' }}>성능목표</th>
                                    <th style={{ border: '1px solid black', padding: '4px' }}>시험결과</th>
                                    <th style={{ border: '1px solid black', padding: '4px' }}>평가</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{block.data.metricName || '-'}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{block.data.metricTarget || '-'}</td>
                                    <td style={{ border: '1px solid black', padding: '4px' }}>{block.data.metricResult || '-'}</td>
                                    <td style={{ border: '1px solid black', padding: '4px', fontWeight: 800 }}>{block.data.metricEvaluation || '-'}</td>
                                  </tr>
                                </tbody>
                             </table>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </EuljiPageWrapper>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => handlePrint(true)}
              style={{ padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: '#e2e8f0', color: '#475569', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileText size={20} /> 미리보기 (Draft)
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleApprovalRequest}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            >
              <CheckCircle size={20} /> 결재요청 (Submit)
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handlePrint(false)}
              disabled={!['APPROVED', 'COMPLETED'].includes(selectedTest.status)}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: ['APPROVED', 'COMPLETED'].includes(selectedTest.status) ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: ['APPROVED', 'COMPLETED'].includes(selectedTest.status) ? 'pointer' : 'not-allowed' }}
              title={!['APPROVED', 'COMPLETED'].includes(selectedTest.status) ? '결재가 완료되어야 활성화됩니다.' : ''}
            >
              <Printer size={20} /> 출력하기 (Print Final)
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