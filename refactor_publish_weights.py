import re

def refine_publish():
    with open('src/pages/Publish.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Method Chunk Threshold from 100 to 82
    content = content.replace(
        "if (currentMethodWeight + block.weight > 100 && currentMethodChunk.length > 0)",
        "if (currentMethodWeight + block.weight > 82 && currentMethodChunk.length > 0)"
    )

    # 2. Update TC Chunk Threshold from 100 to 82
    content = content.replace(
        "if (currentTcWeight + block.weight > 100 && currentTcChunk.length > 0)",
        "if (currentTcWeight + block.weight > 82 && currentTcChunk.length > 0)"
    )

    # 3. Update ev_title weight logic to be dynamic and ev_img weight to 32
    target1 = """    tc.evidences?.slice(0, tc.evidenceCount).forEach((ev: any, evIdx: number) => {
      blocks.push({ type: 'ev_title', weight: 10, data: { ev, evIdx } });
      ev.images?.forEach((img: any) => {
        blocks.push({ type: 'ev_img', weight: 26, data: img });
      });
    });"""
    replacement1 = """    tc.evidences?.slice(0, tc.evidenceCount).forEach((ev: any, evIdx: number) => {
      const descLen = (ev.description || '').length;
      const titleWeight = 10 + Math.ceil(descLen / 50);
      blocks.push({ type: 'ev_title', weight: titleWeight, data: { ev, evIdx } });
      ev.images?.forEach((img: any) => {
        blocks.push({ type: 'ev_img', weight: 32, data: img });
      });
    });"""
    content = content.replace(target1, replacement1)

    # 4. Shrink image maxHeight slightly to 220px for added safety margin
    content = content.replace(
        "maxHeight: '250px', objectFit: 'contain'",
        "maxHeight: '220px', objectFit: 'contain'"
    )

    # 5. Fix tests method description dynamic weight just to be sure it's accurate
    content = content.replace(
        "let weight = 15 + Math.ceil(textLen / 60);",
        "let weight = 15 + Math.ceil(textLen / 50);"
    )

    # 6. Shrink some paddings that waste vertical space
    content = content.replace(
        "padding: '15mm 20mm', display: 'flex', flexDirection: 'column'",
        "padding: '12mm 15mm', display: 'flex', flexDirection: 'column'"
    )

    with open('src/pages/Publish.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    refine_publish()
