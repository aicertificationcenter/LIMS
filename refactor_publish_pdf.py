import re

def refine_publish():
    with open('src/pages/Publish.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix handlePrint and add DRAFT logic
    handle_print_target = re.compile(r'  const handlePrint = \(\) => \{.+?  };\n', re.DOTALL)
    handle_print_replacement = """  const handlePrint = (isPreview: boolean = false) => {
    const printContent = document.getElementById('report-pdf-preview');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업 차단을 해제해주세요.');
      return;
    }

    // DRAFT 워터마크 추가 처리
    const draftHtml = isPreview ? '<div class="draft-badge">DRAFT</div>' : '';

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
"""
    content = handle_print_target.sub(handle_print_replacement, content)

    # 2. Fix Approval Request Status
    approval_target = re.compile(r"status: 'COMPLETED'", re.DOTALL)
    content = approval_target.sub("status: 'APPROVAL_REQUESTED'", content)
    content = content.replace("alert('결재요청이 완료되었습니다. (상태: COMPLETED)');", "alert('결재요청이 완료되었습니다.\\n[참고: 결재 완료 후 출력 기능 활성화]');")

    # 3. Total Pages and wrapper modification
    total_pages_target = re.compile(r"  const totalPages = 2 \+ \(tcOutputs\.length \|\| 0\);\n\n  // 공통 A4 페이지 래퍼 컴포넌트\n  const EuljiPageWrapper = \(\{ pageNum, title, children \}: any\) => \{", re.DOTALL)
    total_pages_replacement = """  // 갑지(1) + 요약(1) + 방법(1) + TC결과들(N)
  const totalPages = 3 + (tcOutputs.length || 0);

  // 공통 A4 페이지 래퍼 컴포넌트
  const EuljiPageWrapper = ({ pageNum, title, children, isLastPage }: any) => {"""
    content = total_pages_target.sub(total_pages_replacement, content)

    # 4. Add "끝" marker logic in EuljiPageWrapper
    end_marker_target = re.compile(r"          \{/\* Main Content \*/\}.*?            \{children\}.*?          </div>", re.DOTALL)
    end_marker_replacement = """          {/* Main Content */}
          <div style={{ flex: 1, fontSize: '9pt', color: 'black', position: 'relative' }}>
            {children}
            {isLastPage && (
              <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '10pt', marginTop: '30px' }}>
                - 끝 -
              </div>
            )}
          </div>"""
    content = end_marker_target.sub(end_marker_replacement, content)

    # 5. Fix TC mapping to pass isLastPage
    tc_map_target = re.compile(r"              <EuljiPageWrapper key=\{idx\} pageNum=\{idx \+ 4\} title=\{\`시험결과 \(TC \$\{idx \+ 1\} - \$\{tcMethods\[idx\]\?\.category \|\| ''\}\)\`\}>", re.DOTALL)
    tc_map_replacement = """              <EuljiPageWrapper key={idx} pageNum={idx + 4} isLastPage={idx === tcOutputs.length - 1} title={`시험결과 (TC ${idx + 1} - ${tcMethods[idx]?.category || ''})`}>"""
    if "isLastPage" not in content:
        content = tc_map_target.sub(tc_map_replacement, content)
        
    if "isLastPage={idx === tcOutputs.length - 1}" not in content:
        # If the regex didn't replace because of some mismatch
        content = content.replace(
            "title={`시험결과 (TC ${idx + 1} - ${tcMethods[idx]?.category || ''})`}>",
            "isLastPage={idx === tcOutputs.length - 1} title={`시험결과 (TC ${idx + 1} - ${tcMethods[idx]?.category || ''})`}>"
        )
        
    # If tcOutputs is empty, then "방법" page becomes the last page.
    # Let's fix that too.
    content = content.replace("title=\"시험방법 (시험항목별 세부방법)\">", "title=\"시험방법 (시험항목별 세부방법)\" isLastPage={tcOutputs.length === 0}>")

    # 6. Change buttons at the bottom.
    btn_target = re.compile(r"          <div style=\{\{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' \}\}>.*?          </div>\n\n        </section>", re.DOTALL)
    
    btn_replacement = """          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
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
              disabled={selectedTest.status !== 'COMPLETED'}
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '40px', background: selectedTest.status === 'COMPLETED' ? '#3b82f6' : '#cbd5e1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: selectedTest.status === 'COMPLETED' ? 'pointer' : 'not-allowed' }}
              title={selectedTest.status !== 'COMPLETED' ? '결재가 완료되어야 활성화됩니다.' : ''}
            >
              <Printer size={20} /> 출력하기 (Print Final)
            </button>
          </div>

        </section>"""
        
    content = btn_target.sub(btn_replacement, content)

    # 7. Add Eye icon for preview if missing
    if "Eye" not in content and "FileText" in content:
        pass # Using FileText for preview is fine.

    with open('src/pages/Publish.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    refine_publish()
