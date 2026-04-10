import React from 'react';

/**
 * 성적서 (갑지) 미리보기 컴포넌트
 * MyTests(시험원 폼)와 Approvals(관리자 결재)에서 모두 재사용합니다.
 */
export const GapjiPreview = ({ 
  test, 
  users 
}: { 
  test: any; 
  users: any[];
}) => {
  if (!test) return null;

  try {
    const startDateStr = test.testStartDate ? String(test.testStartDate) : '';
    const year = startDateStr ? startDateStr.substring(0, 4) : new Date().getFullYear().toString();
    const yy = year.substring(2);
    const typeChar = test.testType === '일반시험' ? 'T' : 'K';
    const seq = (test.testerBarcode || '').split('_').pop() || '000';
    
    // 승인 완료된 경우만 정식 발급번호 사용, 그 외에는 접수번호 사용
    const isApproved = test.status === 'APPROVED' || test.status === 'COMPLETED';
    const issueNo = (isApproved && test.formalBarcode) ? test.formalBarcode : test.barcode;
    const productId = `${yy}-${typeChar}-${seq}-S1`;
    const testerName = test.tests?.[0]?.tester?.name || '-';
    const techMgr = users.find(u => u.role === 'TECH_MGR');
    
    // 공통 스타일 정의
    const itemTitleStyle: React.CSSProperties = { fontFamily: '"Malgun Gothic", sans-serif', fontWeight: 'bold', fontSize: '11pt', marginBottom: '6px', color: 'black' };
    const itemBodyStyle: React.CSSProperties = { fontSize: '8pt', color: 'black', marginLeft: '20px' };
    const sectionStyle: React.CSSProperties = { marginBottom: '20px' };

    return (
      <div id="cover-page-content" style={{ background: 'white', padding: 0, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '4px', color: 'black', fontStyle: 'normal', lineHeight: 1.4, width: 'fit-content', margin: '0 auto' }}>
        <div className="document-frame" style={{ width: '210mm', height: '297mm', position: 'relative', background: 'white', boxSizing: 'border-box' }}>
          <div className="outer-border" style={{ position: 'absolute', top: '10mm', left: '10mm', right: '10mm', bottom: '10mm', border: '0.3pt solid #000' }}></div>
          {test.status !== 'APPROVED' && test.status !== 'COMPLETED' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '120pt', color: 'rgba(255,0,0,0.1)', fontWeight: 900, pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>
              DRAFT
            </div>
          )}
          <img src="/Back.png" className="watermark" alt="" style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', width: '120mm', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />
          
          <div className="document-content" style={{ padding: '20mm', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <img src="/kaic-logo.png" alt="KAIC" style={{ height: '30px', width: 'auto', alignSelf: 'flex-start' }} />
                      <div style={{ fontSize: '7pt', color: '#64748b', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                        서울특별시 성동구 왕십리로 58, 416 (성수동, 서울숲포휴)<br/>
                        Tel : 02-2135-4264 / Fax : 02-6280-3134
                      </div>
                    </div>
                  </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '7pt', color: '#64748b' }}>성적서 번호</div>
                  <div style={{ fontSize: '9pt', fontWeight: 700 }}>{issueNo}</div>
                  <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '2px' }}>[ 1 / 1 ]</div>
                </div>
              </div>

              <h1 className="title-main" style={{ textAlign: 'center', fontSize: '24pt', fontWeight: 900, margin: '25px 0', letterSpacing: '6px' }}>
                시 험 성 적 서
              </h1>

              <div style={sectionStyle}>
                <h4 style={itemTitleStyle}>1. 의뢰인</h4>
                <div style={itemBodyStyle}>
                  <div style={{ marginBottom: '3px' }}>○ 기 관 명 : {test.client || test.clientOrganization || test.clientName || '-'}</div>
                  <div>○ 주 소 : {(() => {
                    try {
                      if (!test.extra) return '-';
                      const parsed = JSON.parse(test.extra);
                      return parsed.clientAddress || '-';
                    } catch (e) {
                      return '-';
                    }
                  })()}</div>
                </div>
              </div>

              <div style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <h4 style={{ ...itemTitleStyle, margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>2. 시험대상품목 : </h4>
                <span style={{ fontWeight: 600, fontSize: '9pt', wordBreak: 'break-all' }}>{test.testProduct || '-'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <table className="table" style={{ width: '80%', margin: '0 auto', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '0.5pt solid black', padding: '4px', background: '#f8fafc', width: '35%', textAlign: 'center', fontSize: '8pt' }}>시험대상품목번호</td>
                      <td style={{ border: '0.5pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt' }}>{productId}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '0.5pt solid black', padding: '4px', background: '#f8fafc', textAlign: 'center', fontSize: '8pt' }}>접수번호</td>
                      <td style={{ border: '0.5pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt' }}>{test.barcode || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={sectionStyle}>
                <h4 style={{ ...itemTitleStyle, margin: 0 }}>3. 시험기간 : <span style={{ fontWeight: 400 }}>{test.testStartDate || '-'} ~ {test.testEndDate || '-'}</span></h4>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                <h4 style={{ ...itemTitleStyle, margin: 0, whiteSpace: 'nowrap' }}>4. 시험목적 : </h4>
                <span style={{ fontSize: '9pt', fontWeight: 600 }}>{test.testPurpose || '-'}</span>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ ...itemTitleStyle, margin: '0 0 6px 0' }}>5. 시험방법 : </h4>
                <div style={{ ...itemBodyStyle, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-all' }}>
                  {test.testMethod || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ ...itemTitleStyle, margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  6. 시험결과 : (KAIC-F-7.8-03(을)) “시험결과요약”, “시험방법” 및 “시험결과” 첨부 참조<br/>
                  <span style={{ fontWeight: 400, marginLeft: '20px', fontSize: '7.5pt', color: '#334155' }}>
                     시험항목, 한계, 시험결과, 단위 등은 의뢰인과의 협의 시 의뢰인 요구에 의해 선택사항입니다.
                  </span><br/>
                  <span style={{ fontWeight: 400, marginLeft: '20px', fontSize: '7.5pt', color: '#334155' }}>
                    이 시험결과는 의뢰인이 제시한 시험대상품목 및 시험대상품목에 한정되며,  * 표시된 시험결과는 시험기관의 인정 범위 밖의 것임을 밝힙니다.
                  </span>
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                  <table style={{ width: '85%', margin: '0 auto', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td rowSpan={2} style={{ border: '0.5pt solid black', padding: '6px', fontSize: '8pt', width: '60px', textAlign: 'center', background: '#f8fafc' }}>확 인</td>
                        <td style={{ border: '0.5pt solid black', padding: '6px 12px', fontSize: '9pt', minWidth: '180px', textAlign: 'left' }}>
                          작성자 : <span style={{ fontWeight: 700, marginLeft: '12px' }}>{testerName}</span>
                        </td>
                        <td style={{ border: '0.5pt solid black', padding: '6px 12px', fontSize: '9pt', minWidth: '180px', textAlign: 'left' }}>
                          기술책임자 : <span style={{ fontWeight: 700, marginLeft: '12px' }}>{techMgr?.name || '-'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="sub-label" style={{ border: '0.5pt solid black', padding: '4px', fontSize: '7.5pt', textAlign: 'center', color: '#94a3b8' }}>(인/서명)</td>
                        <td className="sub-label" style={{ border: '0.5pt solid black', padding: '4px', fontSize: '7.5pt', textAlign: 'center', color: '#94a3b8' }}>(인/서명)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h4 style={{ ...itemTitleStyle, margin: '0 0 6px 0', display: 'flex', alignItems: 'center' }}>7. 시험장소 : 
                  <span style={{ fontWeight: 400, display: 'inline-flex', gap: '10px', marginLeft: '12px', fontSize: '7.5pt' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{test.testLocation?.includes('고정') ? '☑' : '☐'} 고정시험실</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>☐ 외부시험실(위탁)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>☐ 외부시험실(일반)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>{test.testLocation?.includes('현장') ? '☑' : '☐'} 기타</span>
                  </span>
                </h4>
                <div style={{ fontSize: '7.5pt', marginLeft: '20px', color: '#475569', lineHeight: 1.5 }}>
                  <div>* 고정시험실 주소 : {test.testLocation?.includes('고정') ? '서울특별시 성동구 왕십리로 58. 서울숲포휴 416호' : '-'}</div>
                  <div>* 외부검증 진행지 : {test.testLocation?.includes('현장') ? (test.testAddress || '-') : '-'}</div>
                </div>
              </div>
            </div>

             <div style={{ textAlign: 'center', marginTop: '30px', paddingBottom: '10px' }}>
              <div style={{ fontSize: '10pt', fontWeight: 700 }}>{new Date().getFullYear()}. {new Date().getMonth() + 1}. {new Date().getDate()}.</div>
              <div style={{ fontSize: '16pt', fontWeight: 900, marginTop: '15px' }}>한국인공지능검증원장</div>
              <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ textAlign: 'left', lineHeight: 1.4, maxWidth: '80%' }}>* 이 시험성적서는 시험목적에 의한 시험대상품목의 시험결과 확인 이외의 용도로 사용될 수 없습니다.</div>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>(KAIC-F-7.8-03(갑))</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error('Cover Page Render Error:', err);
    return <div style={{ padding: '20px', color: 'red' }}>성적서 미리보기를 불러오는 중 오류가 발생했습니다.</div>;
  }
};
