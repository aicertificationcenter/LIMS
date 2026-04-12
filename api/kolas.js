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

    // 파싱 로직: KOLAS 게시판은 tbody 안의 tr 요소로 되어 있음
    $('table tbody tr').each((i, el) => {
      // 상위 7개까지만 파싱
      if (notices.length >= 7) return false;

      const $el = $(el);
      
      // 글 제목 및 링크 파싱 (a 태그 내부)
      const aTag = $el.find('td.left a');
      if (aTag.length > 0) {
        // 제목 안의 strong 또는 텍스트
        let title = aTag.find('strong').text().trim();
        if (!title) {
          title = aTag.text().trim();
        }
        
        // 날짜 파싱 (보통 뒤에서 두 번째나 세 번째 td)
        // KOLAS 공지사항: [번호, 제목, 첨부, 등록자, 등록일, 조회]
        // 즉, 5번째 td가 등록일임
        const dateStr = $el.find('td').eq(4).text().trim() || $el.find('td').last().prev().text().trim();

        let link = aTag.attr('href') || '#';
        if (link.startsWith('/')) {
          link = `https://www.knab.go.kr${link}`;
        } else if (!link.startsWith('http')) {
           link = `https://www.knab.go.kr/usr/inf/bbs/notice/${link}`;
        }

        if (title) {
          notices.push({
            id: i.toString(),
            title: title.replace(/\s+/g, ' '),
            date: dateStr,
            url: link
          });
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
