import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { MockAPI } from '../mocks'; // Keep MockAPI only for receptions for now
import type { Role, User, TestReception, TestStatus } from '../mocks';
import { Navigate } from 'react-router-dom';

const ReceptionCard = ({ data, onStatusChange }: { data: TestReception, onStatusChange: (id: string, s: TestStatus) => void }) => (
  <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--kaic-navy)', marginBottom: '0.25rem' }}>{data.id}</div>
    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}>의뢰: {data.client}</div>
    <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#047857' }}>담당: {data.assignedTesterId || '미배정'}</div>
    <select 
      className="input-field" 
      value={data.status} 
      onChange={e => onStatusChange(data.id, e.target.value as TestStatus)}
      style={{ minHeight: '32px', padding: '0 8px', fontSize: '0.8rem', width: '100%' }}
    >
      <option value="RECEIVED">접수됨 (대기)</option>
      <option value="TESTING">시험중</option>
      <option value="PROGRESS">진행중 (문서/리뷰)</option>
      <option value="COMPLETED">완료됨</option>
    </select>
  </div>
);

export const AdminAuth = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [receptions, setReceptions] = useState<TestReception[]>(MockAPI.getReceptions());
  const [error, setError] = useState<string | null>(null);

  // Fetch real users from DB
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setError(null);
      } else {
        setError(`목록 불러오기 실패 (${response.status}: ${response.statusText})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('서버 연결 실패: ' + err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Only Admin protection
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/stats" />;
  }

  const handleRoleChange = async (id: string, newRole: Role) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      });
      
      if (response.ok) {
        // Refresh list after change
        fetchUsers();
      } else {
        const err = await response.json();
        alert('권한 변경 실패: ' + err.message);
      }
    } catch (error) {
       console.error('Update Role failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`사용자 [${id}]를 정말로 삭제하시겠습니까?`)) return;
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        fetchUsers();
        alert('성공적으로 삭제되었습니다.');
      } else {
        const err = await response.json();
        alert('삭제 실패: ' + err.message);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStatusChange = (id: string, newStatus: TestStatus) => {
    MockAPI.updateReceptionStatus(id, newStatus);
    setReceptions([...MockAPI.getReceptions()]);
  };

  const testing = receptions.filter(r => r.status === 'TESTING');
  const progress = receptions.filter(r => r.status === 'PROGRESS');
  const completed = receptions.filter(r => r.status === 'COMPLETED');

  return (
    <main className="dashboard-grid animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section className="card">
        <h2 className="card-title">가입 요청 및 권한 관리 (관리자 전용)</h2>
        <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>신규 가입 계정에 승인(권한 부여)하거나 기존 사용자의 권한을 변경합니다.</p>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>아이디</th>
              <th>이메일</th>
              <th>현재 권한</th>
              <th>권한 부여(승인) 작업</th>
              <th style={{ textAlign: 'center' }}>가입 거절</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#ef4444', padding: '2rem' }}>
                   {error} (서버 로그를 확인해 주세요)
                </td>
              </tr>
            )}
            {!error && users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                   가입된 사용자가 없습니다.
                </td>
              </tr>
            )}
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.id}</td>
                <td>{u.email}</td>
                <td>
                  {u.role === 'PENDING' ? (
                    <span className="badge badge-pending">승인 대기</span>
                  ) : u.role === 'RESIGNED' ? (
                    <span className="badge" style={{ background: '#ef4444', color: 'white' }}>퇴사 (접근 불가)</span>
                  ) : u.role === 'ADMIN' ? (
                     <span className="badge badge-completed">최고 관리자</span>
                  ) : (
                    <span className="badge badge-progress">{u.role}</span>
                  )}
                </td>
                <td>
                  <select 
                    className="input-field" 
                    value={u.role} 
                    onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                    style={{ minHeight: '40px', padding: '0 10px', fontSize: '0.9rem', width: '200px' }}
                    disabled={u.role === 'ADMIN'}
                  >
                    <option value="PENDING">대기 상태 (권한 없음)</option>
                    <option value="TESTER">시험원</option>
                    <option value="TECH_MGR">기술책임자</option>
                    <option value="QUAL_MGR">품질책임자</option>
                    <option value="RESIGNED" style={{ color: 'red' }}>퇴사 처리 (로그인 불가)</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    className="btn" 
                    style={{ background: '#fecaca', color: '#b91c1c', padding: '4px 12px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => handleDelete(u.id)}
                    disabled={u.role === 'ADMIN'}
                  >
                    완전 삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 접수 현황 칸반 보드 */}
      <section className="card">
        <h2 className="card-title">전체 업무 현황 보드</h2>
        <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>현재 진행 중인 모든 접수 건을 상태별로 확인하고 변경할 수 있습니다.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          
          <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
            <h3 style={{ borderBottom: '3px solid #3b82f6', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>시험중</span>
              <span style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{testing.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {testing.map(r => <ReceptionCard key={r.id} data={r} onStatusChange={handleStatusChange} />)}
              {testing.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>항목이 없습니다.</p>}
            </div>
          </div>

          <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
            <h3 style={{ borderBottom: '3px solid #f59e0b', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>진행중 (문서/리뷰)</span>
              <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{progress.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {progress.map(r => <ReceptionCard key={r.id} data={r} onStatusChange={handleStatusChange} />)}
              {progress.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>항목이 없습니다.</p>}
            </div>
          </div>

          <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
            <h3 style={{ borderBottom: '3px solid #10b981', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>완료</span>
              <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{completed.length}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {completed.map(r => <ReceptionCard key={r.id} data={r} onStatusChange={handleStatusChange} />)}
              {completed.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>항목이 없습니다.</p>}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
};
