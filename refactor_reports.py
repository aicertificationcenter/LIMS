import re

def refactor_reports():
    with open('src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Title change
    content = content.replace('<h2 style={{ margin: 0 }}>성적서 발행 및 증적 관리</h2>', '<h2 style={{ margin: 0 }}>성적서 작성 관리</h2>')

    # 2. Remove Evidence logic (handleAddEvidence, handleDownloadEvidence, handleRemoveEvidence, handleReportUpload, handleCompleteTest)
    pattern_evidence_funcs = re.compile(r'/\*\* 시험을 최종 완료 상태로 변경합니다.*?/\*\* TC 결과 저장 함수 \*/', re.DOTALL)
    content = pattern_evidence_funcs.sub('/** TC 결과 저장 함수 */', content)

    # 3. Remove sections 1 and 2 from the UI
    pattern_bottom_sections = re.compile(r'\{\/\* 1\. 증적 자료 관리 섹션 \*\/\}.*?</main>', re.DOTALL)
    content = pattern_bottom_sections.sub('</main>', content)

    with open('src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    refactor_reports()
