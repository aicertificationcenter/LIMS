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
  }, []);

  /** 로그인 폼 제출 처리 */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // API를 호출하여 로그인 검증
      const user = await apiClient.auth.login(id, pw);
      login(user); // 글로벌 인증 상태 업데이트
      navigate('/stats'); // 기본 페이지로 이동
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '2rem', maxWidth: '1000px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* 좌측: 로그인 폼 영역 */}
        <div className="card animate-fade-in" style={{ flex: '1 1 400px', maxWidth: '420px', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="KAIC 한국인공지능검증원 로고" style={{ height: '50px', objectFit: 'contain' }} />
          </div>
          <p style={{ textAlign: 'center', marginBottom: '2.5rem', color: '#64748b', fontSize: '0.95rem' }}>로그인하여 시험 업무를 시작하세요</p>
          
          <form onSubmit={handleLogin}>
            {error && <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ width: '80px', marginBottom: 0, fontWeight: 600, color: '#475569' }}>아이디</label>
              <input className="input-field" style={{ flex: 1, transition: 'border-color 0.2s, box-shadow 0.2s' }} value={id} onChange={e => setId(e.target.value)} placeholder="아이디를 입력하세요" required autoFocus />
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ width: '80px', marginBottom: 0, fontWeight: 600, color: '#475569' }}>비밀번호</label>
              <input className="input-field" style={{ flex: 1, transition: 'border-color 0.2s, box-shadow 0.2s' }} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호를 입력하세요" required />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)', transition: 'transform 0.1s, background-color 0.2s' }} disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
            계정이 없으신가요? <Link to="/register" style={{ color: 'var(--kaic-blue)', fontWeight: 600, textDecoration: 'none' }}>사용자 등록 요청</Link>
          </p>
        </div>

        {/* 우측: KOLAS 공지사항 영역 */}
        <div className="card animate-fade-in" style={{ flex: '1 1 430px', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#3b82f6', fontWeight: 800 }}>KOLAS</span> 기관 공지사항
          </h2>
          
          {loadingNotices ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>한국인정기구 최근 소식을 불러오는 중입니다...</div>
          ) : noticeError ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '8px' }}>접속 지연으로 공지사항을 불러올 수 없습니다.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notices.slice(0, 5).map((notice, i) => (
                <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <a href={notice.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#1e293b', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.2s', lineHeight: '1.4' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--kaic-blue)'} onMouseLeave={e => e.currentTarget.style.color = '#1e293b'}>
                    {notice.title}
                  </a>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{notice.date}</span>
                </li>
              ))}
              {notices.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>등록된 공지사항이 없습니다.</div>
              )}
            </ul>
          )}
          
          <div style={{ marginTop: 'auto', paddingTop: '2rem', textAlign: 'right' }}>
             <a href="https://www.knab.go.kr/usr/inf/bbs/notice/List.do" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>KOLAS 홈페이지로 이동 &rarr;</a>
          </div>
        </div>
      </div>
      
      {/* 하단: 월간 통합 시험일정 달력 영역 */}
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '2rem auto 0 auto' }}>
         <ScheduleCalendar data={schedules} />
      </div>
    </div>
  );
};
