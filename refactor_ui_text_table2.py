import re

def refine_files():
    # ---------- UPDATE Publish.tsx ----------
    with open('src/pages/Publish.tsx', 'r', encoding='utf-8') as f:
        pub_content = f.read()

    # 1. Add tcDetailsTable logic right after envDiagram
    target_block = """  // [블록 B: 시험환경]
  if (envDiagramUrl || pcSpec || envDescription) {
    pushMethodBlock({ type: 'envDiagram', weight: envDiagramUrl ? 40 : 25, data: { envDiagramUrl, pcSpec, envDescription } });
  }"""
    
    replacement_block = """  // [블록 B: 시험환경]
  if (envDiagramUrl || pcSpec || envDescription) {
    pushMethodBlock({ type: 'envDiagram', weight: envDiagramUrl ? 40 : 25, data: { envDiagramUrl, pcSpec, envDescription } });
  }

  // [블록 B2: 시험 세부항목 및 방법 (테이블2)]
  if (tcDetails && tcDetails.length > 0) {
    pushMethodBlock({ type: 'tcDetailsTable', weight: Math.min(25 + tcDetails.length * 8, 80), data: { details: tcDetails, methods: tcMethods, product: selectedTest?.testProduct || '(나의시험에서 입력한 품목명이 자동 연동됩니다)' } });
  }"""

    pub_content = pub_content.replace(target_block, replacement_block)

    # 2. Rename the First Table header to "▶ 시험방법"
    pub_content = pub_content.replace(
        "                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black', fontSize: '8.5pt' }}>",
        "                          <div style={{ fontWeight: 800, marginBottom: '6px', fontSize: '9.5pt' }}>▶ 시험방법</div>\n                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black', fontSize: '8.5pt' }}>"
    )

    # 3. Add html renderer for tcDetailsTable
    target_html = r"                    if \(block\.type === 'venueEnv'\) \{"
    replacement_html = """                    if (block.type === 'tcDetailsTable') {
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
                    if (block.type === 'venueEnv') {"""
    
    pub_content = re.sub(target_html, replacement_html, pub_content, flags=re.DOTALL)

    with open('src/pages/Publish.tsx', 'w', encoding='utf-8') as f:
        f.write(pub_content)

if __name__ == "__main__":
    refine_files()
