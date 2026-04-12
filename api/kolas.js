import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. KOLAS 공지사항 메인 페이지 HTML 가져오기 (인증서 오류 무시 또는 일반 fetch)
    const response = await fetch('https://www.knab.go.kr/usr/inf/bbs/notice/List.do', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from KOLAS: ${response.statusText}`);
    }

    const html = await response.text();
    
    // 2. cheerio를 사용하여 파싱
    const $ = cheerio.load(html);
    const notices = [];

    // 파싱 로직: KOLAS 게시판은 table.grid 안의 tbody > tr 로 구성됨
    $('.grid tbody tr').each((i, el) => {
      if (notices.length >= 7) return false;

      const $el = $(el);
      const tds = $el.find('td');
      
      // KOLAS 공지사항 5열 구조: [번호, 구분, 제목, 작성일, 조회]
      if (tds.length >= 4) {
        const titleTd = tds.eq(2);
        const aTag = titleTd.find('a');
        const dateTd = tds.eq(3);

        if (aTag.length > 0) {
          const title = aTag.text().trim();
          const dateStr = dateTd.text().trim();
          
          let href = aTag.attr('href') || '';
          let link = '#';

          // href가 javascript:detail(26049); 형태임
          const match = href.match(/detail\s*\(\s*(\d+)\s*\)/);
          if (match && match[1]) {
            const boardSn = match[1];
            link = `https://www.knab.go.kr/usr/inf/bbs/notice/Detail.do?boardSn=${boardSn}`;
          }

          if (title && link !== '#') {
            notices.push({
              id: match ? match[1] : i.toString(),
              title: title.replace(/\s+/g, ' '),
              date: dateStr,
              url: link
            });
          }
        }
      }
    });

    // 3. JSON으로 응답
    res.status(200).json(notices);
  } catch (error) {
    console.error('KOLAS Scraping Error:', error);
    res.status(500).json({ error: 'Failed to fetch KOLAS notices', details: error.message });
  }
}
