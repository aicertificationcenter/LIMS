/**
 * Dropbox API 전용 유틸리티
 * 엑세스 토큰 자동 갱신(Refresh) 기능을 포함합니다.
 */

/**
 * 유효한 드롭박스 엑세스 토큰을 가져옵니다.
 * 환경 변수에 DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET 이 설정되어 있으면
 * 자동으로 새로운 엑세스 토큰을 생성하여 리턴합니다.
 */
export async function getDropboxToken() {
  const refresh_token = process.env.DROPBOX_REFRESH_TOKEN;
  const app_key = process.env.DROPBOX_APP_KEY;
  const app_secret = process.env.DROPBOX_APP_SECRET;
  const static_token = process.env.DROPBOX_ACCESS_TOKEN;

  // 리프레시 정보가 모두 있으면 갱신 시도
  if (refresh_token && app_key && app_secret) {
    try {
      const res = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(app_key + ':' + app_secret).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Dropbox Token Refresh Error]', errText);
        // 실패 시 스태틱 토큰으로 폴백
        return static_token;
      }

      const data = await res.json();
      return data.access_token;
    } catch (err) {
      console.error('[Dropbox Token Refresh Exception]', err);
      return static_token;
    }
  }

  // 리프레시 정보가 없으면 기존 스태틱 토큰 사용
  return static_token;
}
