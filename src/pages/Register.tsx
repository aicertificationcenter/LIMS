import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export const Register = () => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.auth.register({ id, pw, email, phone, name });
      alert('회원가입이 요청되었습니다. 관리자 승인을 기다려주세요.');
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--neutral-100)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="card-title text-center" style={{ textAlign: 'center' }}>회원가입 (권한 승인 요청)</h2>
        
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">아이디</label>
            <input className="input-field" value={id} onChange={e => setId(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input className="input-field" type="password" value={pw} onChange={e => setPw(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">메일 주소</label>
            <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">전화번호</label>
            <input className="input-field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="010-0000-0000" />
          </div>
          <div className="form-group">
            <label className="form-label">성함(이름)</label>
            <input className="input-field" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="홍길동" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? '등록 중...' : '계정 생성 요청'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          이미 계정이 있으신가요? <Link to="/login" style={{ color: 'var(--kaic-blue)', fontWeight: 600 }}>로그인</Link>
        </p>
      </div>
    </div>
  );
};
