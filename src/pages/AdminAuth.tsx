import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Navigate } from 'react-router-dom';
import { Trash2, ShieldAlert, UserCheck, Activity } from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => {
  const map: any = {
    'RECEIVED': { bg: '#3b82f6', label: '접수 대기' },
    'IN_PROGRESS': { bg: '#f59e0b', label: '시험 중' },
    'COMPLETED': { bg: '#10b981', label: '발행 완료' }
  };
  const info = map[status] || { bg: '#64748b', label: status };
  return <span style={{ background: info.bg, color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{info.label}</span>;
};

const ReceptionCard = ({ data, onStatusChange }: { data: any, onStatusChange: (id: string, s: string) => void }) => (
  <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--kaic-navy)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
      {data.barcode}
      <StatusBadge status={data.status} />
    </div>
    <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.25rem' }}><strong>의뢰처:</strong> {data.clientId}</div>
    <div style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#047857', fontWeight: 600 }}>
       담당: {data.tests?.[0]?.tester?.name || '미배정'}
    </div>
    <select 
      className="input-field" 
      value={data.status} 
      onChange={e => onStatusChange(data.id, e.target.value)}
      style={{ minHeight: '36px', padding: '0 8px', fontSize: '0.85rem', width: '100%', marginBottom: 0, borderRadius: '6px' }}
    >
      <option value="RECEIVED">접수 대기</option>
      <option value="IN_PROGRESS">시험 진행 중</option>
      <option value="COMPLETED">발행 완료</option>
    </select>
  </div>
);

export const AdminAuth = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uData, rData] = await Promise.all([
        apiClient.users.list(),
        apiClient.receptions.list()
      ]);
      setUsers(uData);
      setReceptions(rData);
    } catch (err: any) {
      console.error('Fetch admin data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchData();
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/stats" />;
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert('권한 변경 실패: ' + err.message);
      }
    } catch (error: any) {
      alert('오류: ' + error.message);
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
    } catch (error: any) {
      alert('오류: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert('상태 변경 실패: ' + err.message);
      }
    } catch (error: any) {
      alert('오류: ' + error.message);
    }
  };

  const pendingUsers = users.filter(u => u.role === 'PENDING');
  const activeUsers = users.filter(u => u.role !== 'PENDING' && u.role !== 'RESIGNED');

  const boardSections = [
    { id: 'RECEIVED', label: '접수 대기', color: '#3b82f6' },
    { id: 'IN_PROGRESS', label: '시험 및 분석 중', color: '#f59e0b' },
    { id: 'COMPLETED', label: '성적서 발행 완료', color: '#10b981' }
  ];

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>데이터를 불러오는 중...</div>;

  return (
    <main className="dashboard-grid animate-fade-in">
      
      {/* 1. Account Management */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
           <UserCheck size={24} color="var(--kaic-navy)" />
           <h2 className="card-title" style={{ margin: 0, border: 'none' }}>사용자 계정 승인 및 관리 (Live)</h2>
        </div>

        {pendingUsers.length > 0 && (
          <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ color: '#9a3412', fontSize: '1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> 가입 승인 대기 명단
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {pendingUsers.map(u => (
                <div key={u.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.name} ({u.id})</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleRoleChange(u.id, 'TESTER')} style={{ minHeight: '36px', padding: '0 12px', fontSize: '0.85rem' }}>승인(시험원)</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>성명(ID)</th>
              <th>이메일</th>
              <th>현재 권한</th>
              <th>권한 변경</th>
              <th style={{ textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name} <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({u.id})</span></td>
                <td>{u.email}</td>
                <td>
                   <span className={`badge badge-${u.role === 'ADMIN' ? 'completed' : 'progress'}`} style={{ background: u.role === 'ADMIN' ? 'var(--kaic-navy)' : undefined }}>
                     {u.role === 'ADMIN' ? '최고 관리자' : u.role}
                   </span>
                </td>
                <td>
                  <select 
                    className="input-field" 
                    value={u.role} 
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{ minHeight: '38px', padding: '0 10px', fontSize: '0.9rem', width: '180px', marginBottom: 0 }}
                    disabled={u.id === user?.id} // Don't allow self-role-change
                  >
                    <option value="TESTER">시험원</option>
                    <option value="TECH_MGR">기술책임자</option>
                    <option value="QUAL_MGR">품질책임자</option>
                    <option value="ADMIN">관리자 전용</option>
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

      {/* 2. Kanban Board */}
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
           <Activity size={24} color="var(--kaic-navy)" />
           <h2 className="card-title" style={{ margin: 0, border: 'none' }}>시험 프로세스 칸반 보드 (Workflow)</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {boardSections.map(sec => {
            const list = receptions.filter(r => r.status === sec.id);
            return (
              <div key={sec.id} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: `3px solid ${sec.color}` }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{sec.label}</span>
                  <span style={{ background: sec.color, color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{list.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {list.map(r => (
                    <ReceptionCard key={r.id} data={r} onStatusChange={handleStatusChange} />
                  ))}
                  {list.length === 0 && (
                     <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.9rem', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                        진행 중인 업무가 없습니다.
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
