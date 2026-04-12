/**
 * @file Layout.tsx
 * @description 애플리케이션의 최상위 웹 레이아웃 구성을 담당합니다.
 * 상단 네비게이션 바(GNB), 사용자 역할에 따른 메뉴 필터링, 실시간 알림 시스템을 포함합니다.
 */

import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { ClipboardList, FileText, LayoutDashboard, UserCheck, PlusCircle, Users, CheckSquare, Settings, Menu, X } from 'lucide-react';

export const Layout = () => {
  // 인증 및 라우팅 정보
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 알림 시스템 상태
  const [showNoti, setShowNoti] = useState(false);  // 알림창 표시 여부
  const [notifications, setNotifications] = useState<any[]>([]); // 미확인 알림 목록
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 알림 폴링 주입 (30초 주기)
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  /** 서버에서 새로운 알림 목록을 가져옵니다. */
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiClient.notifications.list(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('알림 조회 실패:', err);
    }
  };

  /** 로그아웃 처리 */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /** 모든 알림을 읽음으로 처리하고 목록을 비웁니다. */
  const clearNoti = async () => {
    if (user) {
      try {
        await apiClient.notifications.markAsRead(user.id);
        setNotifications([]);
      } catch (err) {
        console.error('알림 읽음 처리 실패:', err);
      }
    }
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
        
        <button 
          className="show-mobile-block hide-mobile" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          style={{ background: 'transparent', color: 'white', border: 'none', marginLeft: 'auto', marginRight: '1rem', display: 'none' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={isMobileMenuOpen ? "nav-mobile-open" : "hide-mobile"} style={{ display: 'flex', gap: '2rem' }}>
          <Link to="/stats" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/stats' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LayoutDashboard size={18} /> 대시보드
          </Link>
          
          {['ADMIN', 'QUAL_MGR', 'TECH_MGR'].includes(user.role) && (
            <Link to="/reception" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/reception' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={18} /> 접수하기
            </Link>
          )}
          {['ADMIN', 'QUAL_MGR', 'TECH_MGR'].includes(user.role) && (
            <Link to="/invoices" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/invoices' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={18} /> 견적서발행
            </Link>
          )}
          {['ADMIN', 'TECH_MGR'].includes(user.role) && (
            <Link to="/approvals" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/approvals' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={18} /> 결재하기
            </Link>
          )}
          {['ADMIN', 'QUAL_MGR', 'TECH_MGR'].includes(user.role) && (
            <div 
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }} 
              onMouseEnter={() => setShowManageDropdown(true)}
              onMouseLeave={() => setShowManageDropdown(false)}
            >
              <button 
                onClick={() => setShowManageDropdown(!showManageDropdown)} 
                style={{ background: 'transparent', border: 'none', color: ['/admin', '/clients', '/ledger'].includes(location.pathname) ? '#0066B3' : 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 0', fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }}
              >
                <Settings size={18} /> 관리하기
              </button>
              {showManageDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: '0', paddingTop: '10px', zIndex: 100 }}>
                  <div style={{ background: 'white', display: 'flex', flexDirection: 'column', padding: '0.5rem', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', minWidth: '160px' }}>
                    <Link to="/ledger" onClick={() => {setShowManageDropdown(false); setIsMobileMenuOpen(false);}} style={{ color: location.pathname==='/ledger' ? '#0066B3' : '#1e293b', padding: '0.75rem 1rem', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <FileText size={16} /> 발급대장
                    </Link>
                    {['ADMIN', 'QUAL_MGR'].includes(user.role) && (
                      <Link to="/admin" onClick={() => {setShowManageDropdown(false); setIsMobileMenuOpen(false);}} style={{ color: location.pathname==='/admin' ? '#0066B3' : '#1e293b', padding: '0.75rem 1rem', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <UserCheck size={16} /> 시험원관리
                      </Link>
                    )}
                    {['ADMIN', 'QUAL_MGR', 'TECH_MGR'].includes(user.role) && (
                      <Link to="/clients" onClick={() => {setShowManageDropdown(false); setIsMobileMenuOpen(false);}} style={{ color: location.pathname==='/clients' ? '#0066B3' : '#1e293b', padding: '0.75rem 1rem', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Users size={16} /> 의뢰처관리
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {['TESTER'].includes(user.role) && (
            <>
              <Link to="/my-tests" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/my-tests' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={18} /> 나의시험
              </Link>
              <Link to="/reports" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/reports' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={18} /> 성적서 작성
              </Link>
              <Link to="/publish" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/publish' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={18} /> 발행
              </Link>
              <Link to="/upload-report" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/upload-report' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={18} /> 최종제출
              </Link>
              <Link to="/clients" onClick={() => setIsMobileMenuOpen(false)} style={{ color: location.pathname==='/clients' ? '#0066B3' : 'white', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={18} /> 의뢰처관리
              </Link>
            </>
          )}
        </nav>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNoti(!showNoti)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginRight: '1rem', fontSize: '1.2rem' }}>
            🔔 {notifications.length > 0 && <span style={{ background: 'red', borderRadius: '50%', color: 'white', fontSize: '0.7rem', padding: '2px 6px', verticalAlign: 'top' }}>{notifications.length}</span>}
          </button>
          
          {showNoti && (
            <div style={{ position: 'absolute', top: '45px', right: '0', background: 'white', color: 'black', width: '320px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', zIndex: 1000, border: '1px solid #edf2f7', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1a202c' }}>알림</h4>
                <span style={{ fontSize: '0.75rem', background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>{notifications.length}건</span>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem' }}>
                    새로운 알림이 없습니다.
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={n.id || i} style={{ padding: '1rem', borderBottom: i === notifications.length - 1 ? 'none' : '1px solid #f7fafc', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#2d3748', lineHeight: '1.5', fontWeight: 500 }}>
                        {n.message}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: '#a0aec0', fontSize: '0.75rem' }}>{new Date(n.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                        <span style={{ width: '6px', height: '6px', background: '#4299e1', borderRadius: '50%' }}></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderTop: '1px solid #edf2f7' }}>
                  <button onClick={clearNoti} className="btn btn-secondary" style={{ width: '100%', marginTop: 0, minHeight: '36px', padding: '0', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    모두 읽음표시
                  </button>
                </div>
              )}
            </div>
          )}

          <span style={{ marginRight: '1rem', fontWeight: 600 }}>{user.name || user.id} ({user.role})</span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', minHeight: '40px', padding: '0 1rem', marginBottom: 0 }}>로그아웃</button>
        </div>
      </header>

      <Outlet />
    </div>
  );
};
