const EuljiPageWrapper = ({ pageNum, totalPages, barcode, testerBarcode, sectionMainTitle, subTitle, children, isLastPage }: any) => {
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
            <div>성적서 번호 : {testerBarcode || barcode}</div>
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

export const EuljiPreview = ({ test }: { test: any, user?: any }) => {
  if (!test) return null;

  // 파싱
  const extraData = test.extra ? JSON.parse(test.extra) : {};
  const tcResults = extraData.tcResults || [];
  const tcMethods = extraData.tcMethods || [];
  const tcDetails = extraData.tcDetails || [];
  const tcOutputs = extraData.tcOutputs || [];
  const envDiagramUrl = extraData.envDiagramUrl || null;
  const pcSpec = extraData.pcSpec || '';
  const envDescription = extraData.envDescription || '';
  const venueImageCount = extraData.venueImageCount || extraData.envImageCount || 1;
  const venueImages = extraData.venueImages && Array.isArray(extraData.venueImages) 
                      ? extraData.venueImages 
                      : (extraData.envImages && Array.isArray(extraData.envImages) ? extraData.envImages : []);
  const venueDescription = extraData.venueDescription || '';

  const calcTextWeight = (text: string) => {
    if (!text) return 0;
    const lineBreaks = (text.match(/\n/g) || []).length;
    return (lineBreaks + Math.ceil(text.length / 45)) * 1.5;
  };

  // 페이지네이션 엔진
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

  if (tcMethods.length > 0) {
    pushMethodBlock({ type: 'tcMethodsTable', weight: Math.min(25 + tcMethods.length * 8, 80), data: { methods: tcMethods, product: test.testProduct || '(내용없음)' } });
  }
  if (envDiagramUrl || pcSpec || envDescription) {
    pushMethodBlock({ type: 'envDiagram', weight: envDiagramUrl ? 40 : 25, data: { envDiagramUrl, pcSpec, envDescription } });
  }
  if (tcDetails.length > 0) {
    pushMethodBlock({ type: 'tcDetailsTable', weight: Math.min(25 + tcDetails.length * 8, 80), data: { details: tcDetails, methods: tcMethods, product: test.testProduct || '(내용없음)' } });
  }
  if (venueImages.slice(0, venueImageCount).some((v:any) => v.url)) {
    pushMethodBlock({ type: 'venueEnv', weight: 35, data: { venueImages: venueImages.slice(0, venueImageCount), venueDescription } });
  }
  if (tcDetails.length > 0) {
    pushMethodBlock({ type: 'tcDetailHeader', weight: 10, data: null });
    tcDetails.forEach((td: any, i: number) => {
      const combinedText = (td.method || '') + '\n' + (td.procedure || '') + '\n' + (td.note || '') + '\n' + (tcMethods[i]?.standard || '');
      let weight = 15 + calcTextWeight(combinedText); 
      if (weight > 92) weight = 92;
      pushMethodBlock({ type: 'tcDetailItem', weight, data: { td, original: tcMethods[i], index: i } });
    });
  }
  if (currentMethodChunk.length > 0) methodPages.push(currentMethodChunk);

  const tcPages: any[] = [];
  tcOutputs.forEach((tc: any, idx: number) => {
    const blocks: any[] = [];
    
    const objWeight = 12 + calcTextWeight(tcDetails[idx]?.method) + calcTextWeight(tcMethods[idx]?.standard);
    blocks.push({ type: 'tc_objective', weight: Math.min(objWeight, 60), data: { purpose: tcDetails[idx]?.method, standard: tcMethods[idx]?.standard } });
    
    blocks.push({ type: 'metric', weight: tc.metricFormulaImg ? 20 : 12 + calcTextWeight(tc.metricName), data: tc });
    
    const sumWeight = 12 + calcTextWeight(tc.resultSummary);
    blocks.push({ type: 'summary', weight: Math.min(sumWeight, 60), data: tc });

    tc.evidences?.slice(0, tc.evidenceCount).forEach((ev: any, evIdx: number) => {
      const allImages = ev.images || [];
      if (allImages.length === 0) {
        blocks.push({ type: 'evidence_group', weight: 45, data: { ev, evIdx, images: [] } });
        return;
      }
      const imageChunks = [];
      for (let i = 0; i < allImages.length; i += 4) imageChunks.push(allImages.slice(i, i + 4));
      imageChunks.forEach((imgChunk, chunkIdx) => {
        blocks.push({ type: 'evidence_group', weight: 45, data: { ev, evIdx, images: imgChunk, isContinued: chunkIdx > 0 } });
      });
    });
    
    const evalWeight = 15 + calcTextWeight(tc.opinion);
    blocks.push({ type: 'evaluation', weight: Math.min(evalWeight, 60), data: tc });

    let currentTcChunk: any[] = [];
    let currentTcWeight = 0;
    blocks.forEach(block => {
      if (currentTcWeight + block.weight > 92 && currentTcChunk.length > 0) {
        tcPages.push({ tcIndex: idx, blocks: currentTcChunk });
        currentTcChunk = []; currentTcWeight = 0;
      }
      currentTcChunk.push(block);
      currentTcWeight += block.weight;
    });
    if (currentTcChunk.length > 0) tcPages.push({ tcIndex: idx, blocks: currentTcChunk });
  });

  // const totalPages = 1 + methodPages.length + tcPages.length + 1; // +1 is just assuming test coverage etc, actually `Publish.tsx` used `1+1+...`, we will match it. Let's compute precisely.
  const actualTotalPages = 1 + methodPages.length + tcPages.length; // From Publish: 1(요약) + methodPages + tcPages. Wait, earlier it was 1 + 1 + methodPages... + tcPages. `1 + 1` was Gapji + Eulji? Publish only output Eulji pages starting from pageNum = 2. Yes! Because page 1 is Gapji!
  
  // Actually, we use `actualTotalPages + 1` for total count
  const allTotalPages = actualTotalPages + 1; 
  let currentPageCount = 1;

  const isApproved = test.status === 'APPROVED' || test.status === 'COMPLETED';
  // 정식 발급번호가 있으면 우선 사용, 없으면 시험원 접수번호(testerBarcode), 없으면 접수번호(barcode) 사용
  const displayBarcode = test.formalBarcode || test.testerBarcode || test.barcode;

  return (
    <div id="report-pdf-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      
      {/* Draft Watermark for Admin if not approved */}
      {!isApproved && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '150pt', color: 'rgba(255, 0, 0, 0.1)', fontWeight: 900, zIndex: 1000, pointerEvents: 'none' }}>
          DRAFT
        </div>
      )}

      {/* Page 2: 시험결과 요약 */}
      <EuljiPageWrapper pageNum={++currentPageCount} totalPages={allTotalPages} barcode={test.barcode} testerBarcode={displayBarcode} sectionMainTitle="시험결과 요약" isLastPage={false}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5pt solid black', marginBottom: '25px', fontSize: '9pt', textAlign: 'center' }}>
          <tbody>
            <tr>
              <td style={{ width: '20%', border: '1px solid black', fontWeight: 800, background: '#f8fafc', padding: '10px' }}>접수번호</td>
              <td style={{ width: '30%', border: '1px solid black', padding: '10px', textAlign: 'left', color: '#1e293b', fontWeight: 600 }}>{test.barcode}</td>
              <td style={{ width: '20%', border: '1px solid black', fontWeight: 800, background: '#f8fafc', padding: '10px' }}>시험 담당자</td>
              <td style={{ width: '30%', border: '1px solid black', padding: '10px', textAlign: 'left', color: '#1e293b', fontWeight: 600 }}>{test.tests?.[0]?.tester?.name || '-'}</td>
            </tr>
          </tbody>
        </table>

        {test.euljiRejection && (
          <div style={{ marginBottom: '15px', padding: '12px', border: '1px solid #ef4444', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontWeight: 600 }}>
            [을지 반려사유] {test.euljiRejection}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={{ border: '1px solid black', padding: '8px' }}>TC 번호</th>
              <th style={{ border: '1px solid black', padding: '8px' }}>시험목표</th>
              <th style={{ border: '1px solid black', padding: '8px' }}>결과 (달성여부)</th>
            </tr>
          </thead>
          <tbody>
            {tcResults.map((r: any, i: number) => (
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
        <EuljiPageWrapper key={`method-${cIdx}`} pageNum={++currentPageCount} totalPages={allTotalPages} barcode={test.barcode} testerBarcode={displayBarcode} sectionMainTitle={cIdx === 0 ? "시험방법" : null} subTitle={cIdx === 0 ? null : "시험방법 (계속)"} isLastPage={false}>
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
                          <th style={{ border: '1px solid black', padding: '6px', width: '22%' }}>시험대상품목의 명칭</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '28%' }}>시험대상 항목</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '12%' }}>시험대상 품목의 형태</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '38%' }}>시험규격</th>
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
                            <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                              {block.data.methods[tIdx]?.standard || '-'}
                            </td>
                            <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                              {tc.method || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div key={bIdx} style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', background: '#f8fafc', pageBreakInside: 'avoid' }}>
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
            totalPages={allTotalPages}
            barcode={test.barcode}
            testerBarcode={displayBarcode}
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
                          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gridTemplateRows: gridRows, gap: '10px', height: '320px' }}>
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
  );
};
