import re

def optimize_whitespace():
    # ---------- UPDATE Publish.tsx ----------
    with open('src/pages/Publish.tsx', 'r', encoding='utf-8') as f:
        pub_content = f.read()

    # 1. Image DOM Resizing (`maxHeight: 220px` to `width: 100%, height: auto`)
    # For evidence images
    pub_content = pub_content.replace(
        "maxWidth: '100%', maxHeight: '220px', objectFit: 'contain'",
        "width: '100%', height: 'auto', objectFit: 'contain'"
    )

    # 2. Re-adjust algorithmic weights for full-width 16:9 scaling
    # Update Threshold from 82 to 92 (allow tighter packing at the bottom of pages)
    pub_content = pub_content.replace(
        "if (currentMethodWeight + block.weight > 82 ",
        "if (currentMethodWeight + block.weight > 92 "
    )
    pub_content = pub_content.replace(
        "if (currentTcWeight + block.weight > 82 ",
        "if (currentTcWeight + block.weight > 92 "
    )
    
    # Increase weight of ev_img because full width 16:9 images are naturally taller
    pub_content = pub_content.replace(
        "blocks.push({ type: 'ev_img', weight: 32, data: img });",
        "blocks.push({ type: 'ev_img', weight: 36, data: img });" # 36% of modern A4 height when stretched 100% horizontally
    )

    with open('src/pages/Publish.tsx', 'w', encoding='utf-8') as f:
        f.write(pub_content)


    # ---------- UPDATE Reports.tsx ----------
    with open('src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
        rep_content = f.read()

    # Change the advisory notice to match the user's specific request
    target_ev_notice = "※ PDF 인쇄 최적화를 위해 가로사진(예: 16:9) 권장"
    new_ev_notice = "※ 최적의 PDF 출력을 위해 가로사진(16:9 비율) 크기가 최적입니다."
    rep_content = rep_content.replace(target_ev_notice, new_ev_notice)

    target_venue_notice = "※ PDF 인쇄 최적화를 위해 가로가 긴 직사각형 사진(16:9 비율 등) 업로드를 권장합니다. 세로 사진은 불필요한 백지 공백을 유발할 수 있습니다."
    new_venue_notice = "※ 최적의 PDF 출력을 위해 가로사진(16:9 비율) 크기가 최적입니다."
    rep_content = rep_content.replace(target_venue_notice, new_venue_notice)

    target_env_notice = "※ PDF 인쇄 공간 최적화를 위해 가로사진(예: 16:9)을 권장합니다."
    new_env_notice = "※ 최적의 PDF 출력을 위해 가로사진(16:9 비율) 크기가 최적입니다."
    rep_content = rep_content.replace(target_env_notice, new_env_notice)

    with open('src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
        f.write(rep_content)

if __name__ == "__main__":
    optimize_whitespace()
