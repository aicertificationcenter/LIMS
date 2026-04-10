/**
 * @file AdminAuth.tsx
 * @description 최고 관리자 전용 사용자 계정 관리 페이지입니다.
 * 신규 가입자 승인, 사용자 정보 수정(성명, 이메일, 연락처, 비밀번호), 권한 변경 및 계정 삭제 기능을 제공합니다.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Navigate } from 'react-router-dom';
import { Trash2, ShieldAlert, UserCheck, Edit2, X } from 'lucide-react';

export const AdminAuth = () => {
  // 인증 정보
  const { user } = useAuth();
  
  // 데이터 상태 관리
  const [users, setUsers] = useState<any[]>([]); // 시스템 전체 사용자 목록
  const [loading, setLoading] = useState(true); // 데이터 로딩 플래그
  
  // 사용자 정보 수정을 위한 모달 상태
  const [editUser, setEditUser] = useState<any>(null);

  /** 전체 사용자 데이터 로드 (관리자 권한인 경우에만 수행) */
  const fetchData = async () => {
    setLoading(true);
    try {
      const uData = await apiClient.users.list();
      setUsers(uData);
    } catch (err: any) {
      console.error('사용자 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  /** 컴포넌트 마운트 및 인증 정보 로드 시 실행 */
  useEffect(() => {
    if (user?.role === 'ADMIN') fetchData();
  }, [user]);

  // 권한 체크 (관리자가 아니면 통계 페이지로 추방)
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/stats" />;
  }

  /** 
   * 사용자의 역할(Role)을 변경합니다. 
   * @param id 사용자 ID
   * @param newRole 부여할 새로운 역할
   */
  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      });
      if (res.ok) fetchData();
    } catch (_error: any) {
      alert('오류: ' + (_error.message || '알 수 없는 오류'));
    }
  };

  /** 모달을 통해 수정된 사용자 정보를 서버에 저장합니다. */
  const handleUpdateUser = async () => {
    if (!editUser) return;
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser),
      });
      if (res.ok) {
        setEditUser(null);
        fetchData();
        alert('사용자 정보가 업데이트되었습니다.');
      } else {
        const err = await res.json();
        alert('수정 실패: ' + err.message);
      }
    } catch (_error: any) {
      alert('오류: ' + (_error.message || '알 수 없는 오류'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm(`사용자 [${id}]를 영구적으로 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchData();
        alert('사용자가 삭제되었습니다.');
      } else {
        const err = await res.json();
        alert('삭제 실패: ' + err.message);
      }
    } catch (_error: any) {
      alert('오류: ' + (_error.message || '알 수 없는 오류'));
    }
  };

  const pendingUsers = users.filter(u => u.role === 'PENDING');
  const activeUsers = users.filter(u => u.role !== 'PENDING');

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>데이터를 불러오는 중...</div>;

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* 1. 계정 관리 메인 카드 */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
           <UserCheck size={24} color="var(--kaic-navy)" />
           <h2 className="card-title" style={{ margin: 0, border: 'none' }}>사용자 계정 승인 및 관리 (Live)</h2>
        </div>

        {/* 1.1 가입 승인 대기 섹션 (PENDING 상태인 사용자만 표시) */}
        {pendingUsers.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ color: '#9a3412', fontSize: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> 가입 승인 대기 명단
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {pendingUsers.map(u => (
                <div key={u.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.name} <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>({u.id} / {u.passwordHash})</span></div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleRoleChange(u.id, 'TESTER')} style={{ minHeight: '36px', padding: '0 12px', fontSize: '0.85rem' }}>승인(시험원)</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1.2 활성 사용자 관리 테이블 */}
        <table className="data-table">
          <thead>
            <tr>
              <th>성명 (ID / 비밀번호)</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>현재 권한</th>
              <th>권한 변경</th>
              <th style={{ textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {u.name} 
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>({u.id} / {u.passwordHash})</span>
                    <button 
                      onClick={() => setEditUser({ ...u })} 
                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      title="상세 수정"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>{u.phone || '-'}</td>
                <td>
                   <span className={`badge badge-${u.role === 'ADMIN' ? 'completed' : u.role === 'RESIGNED' ? 'error' : 'progress'}`} style={{ background: u.role === 'ADMIN' ? 'var(--kaic-navy)' : u.role === 'RESIGNED' ? '#ef4444' : undefined, padding: '4px 10px' }}>
                     {u.role === 'ADMIN' ? '최고 관리자' : u.role === 'RESIGNED' ? '퇴사자 (정지)' : u.role}
                   </span>
                </td>
                <td>
                   <select 
                    className="input-field role-select" 
                    value={u.role} 
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{ 
                      minHeight: '38px', 
                      paddingLeft: '14px',
                      paddingRight: '36px',
                      fontSize: '0.85rem', 
                      width: '160px', 
                      marginBottom: 0, 
                      cursor: 'pointer',
                      fontWeight: 700,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231e3a8a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '14px'
                    }}
                    disabled={u.id === user?.id}
                  >
                    <option value="TESTER">시험원</option>
                    <option value="TECH_MGR">기술책임자</option>
                    <option value="QUAL_MGR">품질책임자</option>
                    <option value="ADMIN">관리자 전용</option>
                    <option value="RESIGNED">퇴사처리 (정지)</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="영구 삭제">
                     <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 2. 사용자 상세 정보 수정용 모달 */}
      {editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Edit2 size={20}/> 사용자 상세 수정</h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>성명</label>
                <input 
                  className="input-field" 
                  value={editUser.name} 
                  onChange={e => setEditUser({ ...editUser, name: e.target.value })} 
                  style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>이메일</label>
                <input 
                   className="input-field" 
                   type="email"
                   value={editUser.email} 
                   onChange={e => setEditUser({ ...editUser, email: e.target.value })} 
                   style={{ margin: 0 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>연락처(휴대폰)</label>
                <input 
                   className="input-field" 
                   placeholder="010-0000-0000"
                   value={editUser.phone || ''} 
                   onChange={e => setEditUser({ ...editUser, phone: e.target.value })} 
                   style={{ margin: 0 }}
                />
              </div>
              <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 900, marginBottom: '6px', color: '#b91c1c' }}>비밀번호 초기화/수정</label>
                <input 
                   className="input-field" 
                   value={editUser.passwordHash} 
                   onChange={e => setEditUser({ ...editUser, passwordHash: e.target.value })} 
                   style={{ margin: 0 }}
                />
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>* 저장 시 해당 비밀번호로 즉시 변경됩니다.</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={handleUpdateUser} style={{ flex: 1, margin: 0, padding: '12px' }}>저장하기</button>
                <button className="btn btn-secondary" onClick={() => setEditUser(null)} style={{ flex: 1, margin: 0, padding: '12px' }}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
