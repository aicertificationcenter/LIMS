/**
 * @file Login.tsx
 * @description 사용자 인증(로그인)을 담당하는 페이지입니다.
 * 아이디와 비밀번호를 입력받아 AuthContext의 로그인 상태를 갱신하고 메인 페이지로 이동합니다.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { ScheduleCalendar } from '../components/ScheduleCalendar';

export const Login = () => {
  // 로그인 입력 필드 상태
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  
  // 로그인 UI 상태
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // KOLAS 공지사항 상태
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [noticeError, setNoticeError] = useState(false);

  // AI 뉴스 상태
  const [aiNews, setAiNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState(false);

  // 시스템 접수 현황 (달력용)
  const [schedules, setSchedules] = useState<any[]>([]);

  // 인증 및 네비게이션 훅
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. KOLAS 공지사항 로드
    apiClient.kolas.listNotices()
      .then(data => {
        setNotices(data || []);
        setLoadingNotices(false);
      })
      .catch(err => {
        console.error("KOLAS notices fetch error:", err);
        setNoticeError(true);
        setLoadingNotices(false);
      });

    // 2. 사내 시험 접수 전체 목록 로드 (달력 연동용)
    apiClient.receptions.list()
      .then(data => setSchedules(data || []))
      .catch(err => console.error("Schedules fetch error:", err));

    // 3. 인공지능 뉴스 로드
    apiClient.news.list()
      .then(data => {
        setAiNews(data || []);
        setLoadingNews(false);
      })
      .catch(err => {
        console.error("AI News fetch error:", err);
        setNewsError(true);
        setLoadingNews(false);
      });
  }, []);

  /** 로그인 폼 제출 처리 */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await apiClient.auth.login(id, pw);
      login(user);
      navigate('/stats');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      
      {/* 1. 사이드바 (로그인 영역) */}
      <div style={{ width: '380px', background: 'white', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.04)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', marginTop: '2rem' }}>
          <img src="/logo.png" alt="KAIC 한국인공지능검증원 로고" style={{ height: '55px', objectFit: 'contain' }} />
        </div>
        <p style={{ textAlign: 'center', marginBottom: '3rem', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
          통합 시험 관리 시스템
        </p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: '4px', fontSize: '0.9rem' }}>{error}</div>}
          
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>아이디</label>
            <input className="input-field" style={{ width: '100%', transition: 'all 0.2s', padding: '0.75rem 1rem', background: '#f8fafc' }} value={id} onChange={e => setId(e.target.value)} placeholder="아이디 입력" required autoFocus />
          </div>
          
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>비밀번호</label>
            <input className="input-field" style={{ width: '100%', transition: 'all 0.2s', padding: '0.75rem 1rem', background: '#f8fafc' }} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호 입력" required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)', transition: 'transform 0.1s, background-color 0.2s' }} disabled={loading}>
            {loading ? '로그인 중...' : '시스템 로그인'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#64748b' }}>계정이 없으신가요? </span>
          <Link to="/register" style={{ color: 'var(--kaic-blue)', fontWeight: 600, textDecoration: 'none' }}>사용자 등록 요청</Link>
        </p>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
          &copy; 2026 KAIC LIMS. All rights reserved.
        </div>
      </div>

      {/* 2. 메인 대시보드 데이터 영역 */}
      <div style={{ flex: 1, padding: '3rem', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* 상단 2분할 그리드 (기관 공지 & 인공지능 뉴스) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* KOLAS 공지 패널 */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ color: '#3b82f6', fontWeight: 800 }}>KOLAS</span> 기관 공지사항
              </h2>
              <a href="https://www.knab.go.kr/usr/inf/bbs/notice/List.do" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none' }}>더보기 &rarr;</a>
            </div>
            
            {loadingNotices ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>최신 공지사항을 불러오는 중입니다...</div>
            ) : noticeError ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '8px', fontSize: '0.9rem' }}>공지사항을 불러올 수 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {notices.slice(0, 5).map((notice, i) => (
                  <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <a href={notice.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#334155', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.2s', lineHeight: '1.4', fontSize: '0.95rem' }} onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
                      {notice.title}
                    </a>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{notice.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 인공지능 뉴스 패널 */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>AI</span> 인공지능 속보 뉴스
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Google Alerts</span>
            </div>
            
            {loadingNews ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>인공지능 뉴스를 수집하는 중입니다...</div>
            ) : newsError ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '8px', fontSize: '0.9rem' }}>뉴스를 불러올 수 없습니다.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {aiNews.slice(0, 10).map((news, i) => (
                   <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <a href={news.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#334155', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.2s', lineHeight: '1.4', fontSize: '0.95rem' }} onMouseEnter={e => e.currentTarget.style.color = '#10b981'} onMouseLeave={e => e.currentTarget.style.color = '#334155'}>
                       {htmlDecode(news.title)}
                     </a>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                       <span>{news.source}</span>
                       <span>{news.pubDate}</span>
                     </div>
                   </li>
                ))}
              </ul>
            )}
          </div>
          
        </div>

        {/* 하단 캘린더 패널 */}
        <div style={{ flex: 1, minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
           <ScheduleCalendar data={schedules} />
        </div>

      </div>
    </div>
  );
};

// HTML 엔티티 디코드 유틸 (&quot; 등을 처리)
function htmlDecode(input: string) {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent || input;
}

