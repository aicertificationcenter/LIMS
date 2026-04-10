import re

def refine_files():
    # ---------- UPDATE Publish.tsx ----------
    with open('src/pages/Publish.tsx', 'r', encoding='utf-8') as f:
        pub_content = f.read()

    # 1. Remove testMethodSrc Block completely
    pub_content = re.sub(
        r"  // \[블록 A: 기본 시험방법 \(원문\)\]\n  if \(selectedTest\?\.testMethod\) \{\n    pushMethodBlock\(\{ type: 'testMethodSrc'.*?\}\);\n  \}\n",
        "", pub_content, flags=re.DOTALL
    )

    # 2. Swap tcMethodsTable to be block A and update the rendering logic for tcMethodsTable
    # First, let's remove it from its original place
    pub_content = re.sub(
        r"  // \[블록 C: 시험 세부항목 및 방법 테이블\]\n  if \(tcMethods && tcMethods\.length > 0\) \{\n    pushMethodBlock\(\{ type: 'tcMethodsTable'.*?\}\);\n  \}\n",
        "", pub_content, flags=re.DOTALL
    )
    
    # Re-insert before Block B
    new_tc_methods_push = """  // [블록 A: 시험 세부항목 및 방법 테이블 (기본 개요 대체)]
  if (tcMethods && tcMethods.length > 0) {
    pushMethodBlock({ type: 'tcMethodsTable', weight: Math.min(25 + tcMethods.length * 8, 80), data: { methods: tcMethods, product: selectedTest?.testProduct || '(나의시험에서 입력한 품목명이 자동 연동됩니다)' } });
  }

"""
    pub_content = pub_content.replace("// [블록 B: 시험환경]", new_tc_methods_push + "  // [블록 B: 시험환경]")

    # Now rewrite the HTML rendering of tcMethodsTable
    old_table_html = r"                    if \(block\.type === 'tcMethodsTable'\) \{.*?                    \}"
    new_table_html = """                    if (block.type === 'tcMethodsTable') {
                      return (
                        <div key={bIdx}>
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
                    }"""
    pub_content = re.sub(old_table_html, new_table_html, pub_content, flags=re.DOTALL)
    
    # Also remove testMethodSrc html renderer
    pub_content = re.sub(r"                    if \(block\.type === 'testMethodSrc'\) \{.*?                    \}\n", "", pub_content, flags=re.DOTALL)


    # 3. Add tc_objective logic to tcPages
    # Add push
    target2 = "    blocks.push({ type: 'metric', weight: tc.metricFormulaImg ? 20 : 12, data: tc });"
    replacement2 = """    blocks.push({ type: 'tc_objective', weight: 15, data: { purpose: tcDetails[idx]?.method, standard: tcMethods[idx]?.standard } });
    blocks.push({ type: 'metric', weight: tc.metricFormulaImg ? 20 : 12, data: tc });"""
    pub_content = pub_content.replace(target2, replacement2)

    # Add html renderer
    target3 = "                    {pageChunk.blocks.map((block: any, bIdx: number) => {"
    replacement3 = """                    {pageChunk.blocks.map((block: any, bIdx: number) => {
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
                      }"""
    pub_content = pub_content.replace(target3, replacement3)

    with open('src/pages/Publish.tsx', 'w', encoding='utf-8') as f:
        f.write(pub_content)



    # ---------- UPDATE Reports.tsx ----------
    with open('src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
        rep_content = f.read()

    # Add notice text under Diagram upload button
    target_env = r"(<label className=\"btn btn-secondary\".*?<UploadCloud.*?구성도 이미지 선택\n.*?<\/label>)"
    rep_content = re.sub(target_env, r"\1\n                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>※ PDF 인쇄 공간 최적화를 위해 가로사진(예: 16:9)을 권장합니다.</div>", rep_content, flags=re.DOTALL)

    # Add notice text under Venue Images upload button
    target_venue = r"(<label className=\"btn btn-secondary\".*?<UploadCloud.*?시험환경 사진 추가\n.*?<\/label>)"
    rep_content = re.sub(target_venue, r"\1\n          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>※ PDF 인쇄 최적화를 위해 가로가 긴 직사각형 사진(16:9 비율 등) 업로드를 권장합니다. 세로 사진은 불필요한 백지 공백을 유발할 수 있습니다.</div>", rep_content, flags=re.DOTALL)
    
    # Add notice text under Evidence images upload button
    target_ev = r"(<label className=\"btn btn-secondary\".*?<UploadCloud.*?사진 첨부\n.*?<\/label>)"
    rep_content = re.sub(target_ev, r"\1\n                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', textAlign: 'center', width: '100%' }}>※ PDF 인쇄 최적화를 위해 가로사진(예: 16:9) 권장</div>", rep_content, flags=re.DOTALL)

    with open('src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
        f.write(rep_content)

if __name__ == "__main__":
    refine_files()
