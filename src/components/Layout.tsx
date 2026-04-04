import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { MockAPI } from '../mocks';
import { ClipboardList, FileText, LayoutDashboard, UserCheck, PlusCircle } from 'lucide-react';
export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNoti, setShowNoti] = useState(false);
  const notifications = user ? MockAPI.getNotifications(user.id).filter(n => !n.read) : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearNoti = () => {
    if (user) MockAPI.markNotiRead(user.id);
    setShowNoti(false);
  };

  if (!user) {
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      return <Navigate to="/login" replace />;
    }
    return <Outlet />; // For login/register pages
  }

  return (
    <div className="app-container">
      <header className="navbar">
        <Link to="/stats" className="brand-title" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
          <img src="/logo.png" alt="KAIC 한국인공지능검증원 로고" style={{ height: '36px', objectFit: 'contain', background: 'white', padding: '4px 10px', borderRadius: '4px' }} />
        </Link>
        
        {/* Navigation Menu */}
        <nav style={{ display: 'flex', gap: '2rem' }}>
          {user.role === 'ADMIN' && (
            <Link to="/admin" style={{ color: location.pathname==='/admin' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={18} /> 회원 승인
            </Link>
          )}
          {user.role === 'ADMIN' && (
            <Link to="/reception" style={{ color: location.pathname==='/reception' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={18} /> 접수하기
            </Link>
          )}
          <Link to="/my-tests" style={{ color: location.pathname==='/my-tests' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardList size={18} /> 나의시험
          </Link>
          <Link to="/reports" style={{ color: location.pathname==='/reports' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={18} /> 성적서 발행
          </Link>
          <Link to="/stats" style={{ color: location.pathname==='/stats' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutDashboard size={18} /> 대시보드
          </Link>
        </nav>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNoti(!showNoti)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginRight: '1rem', fontSize: '1.2rem' }}>
            🔔 {notifications.length > 0 && <span style={{ background: 'red', borderRadius: '50%', color: 'white', fontSize: '0.7rem', padding: '2px 6px', verticalAlign: 'top' }}>{notifications.length}</span>}
          </button>
          
          {showNoti && notifications.length > 0 && (
            <div style={{ position: 'absolute', top: '40px', right: '100px', background: 'white', color: 'black', width: '300px', padding: '1rem', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000}}>
              <h4 style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid #ccc' }}>알림</h4>
              {notifications.map((n, i) => (
                <div key={i} style={{ padding: '0.5rem 0', fontSize: '0.9rem' }}>
                  <p style={{ margin: 0 }}>{n.msg}</p>
                  <small style={{ color: 'gray' }}>{n.time}</small>
                </div>
              ))}
              <button onClick={clearNoti} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem', minHeight: '30px', padding: '5px' }}>모두 읽음표시</button>
            </div>
          )}

          <span style={{ marginRight: '1rem', fontWeight: 600 }}>{user.id} ({user.role})</span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', minHeight: '40px', padding: '0 1rem', marginBottom: 0 }}>로그아웃</button>
        </div>
      </header>

      <Outlet />
    </div>
  );
};
