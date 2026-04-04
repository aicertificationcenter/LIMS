import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';

export const Login = () => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="KAIC 한국인공지능검증원 로고" style={{ height: '50px', objectFit: 'contain' }} />
        </div>
        <p style={{ textAlign: 'center', marginBottom: '2.5rem', color: '#64748b', fontSize: '0.95rem' }}>로그인하여 시험 업무를 시작하세요</p>
        
        <form onSubmit={handleLogin}>
          {error && <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ width: '80px', marginBottom: 0, fontWeight: 600, color: '#475569' }}>아이디</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', transition: 'border-color 0.2s, box-shadow 0.2s' }} value={id} onChange={e => setId(e.target.value)} placeholder="아이디를 입력하세요" required autoFocus />
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ width: '80px', marginBottom: 0, fontWeight: 600, color: '#475569' }}>비밀번호</label>
            <input className="input-field" style={{ flex: 1, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', transition: 'border-color 0.2s, box-shadow 0.2s' }} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호를 입력하세요" required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)', transition: 'transform 0.1s, background-color 0.2s' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>
          계정이 없으신가요? <Link to="/register" style={{ color: 'var(--kaic-blue)', fontWeight: 600, textDecoration: 'none' }}>사용자 등록 요청</Link>
        </p>

        <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '2rem', paddingTop: '1.5rem', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
          <strong style={{ color: '#475569', display: 'block', marginBottom: '0.5rem' }}>[테스트 전용 계정]</strong>
          <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.6 }}>
            <li>관리자 접속: id <b>admin</b> / pw <b>admin</b></li>
            <li>시험원 접속: id <b>tester1</b> / pw <b>1234</b></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
