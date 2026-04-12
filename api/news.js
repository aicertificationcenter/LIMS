import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*') // 모든 도메인 허용
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // 구글 뉴스 RSS 피드 (인공지능 키워드 방어 검색)
    const url = 'https://news.google.com/rss/search?q=%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5&hl=ko&gl=KR&ceid=KR:ko';
    
    // 타임아웃을 설정한 fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s
    
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('Fetch timeout or network error:', e);
      return res.status(500).json({ error: 'Fetch timeout' });
    }

    if (!response.ok) {
      console.error(`Status: ${response.status}`);
      return res.status(response.status).json({ error: `Fetch failed` });
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const newsList = [];

    // RSS item 파싱
    $('item').each((i, el) => {
      // 10개까지만 (요청사항 반영)
      if (newsList.length >= 10) return false;

      const $el = $(el);
      const title = $el.find('title').text();
      const link = $el.find('link').text();
      const pubDate = $el.find('pubDate').text();
      const sourceName = $el.find('source').text() || '구글 뉴스';

      // 날짜 포맷 변환 (예: 2026-04-12 형태로)
      let formattedDate = pubDate;
      const dateObj = new Date(pubDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      }

      if (title && link) {
        newsList.push({
          id: i.toString(),
          title: title,
          link: link,
          pubDate: formattedDate,
          source: sourceName
        });
      }
    });

    res.status(200).json(newsList);
  } catch (error) {
    console.error('AI News Scraper error:', error);
    res.status(500).json({ error: 'Failed to scrape news' });
  }
}
