
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Navigate } from 'react-router-dom';
import { Trash2, ShieldAlert, UserCheck, Edit2, Check, X } from 'lucide-react';

export const AdminAuth = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const uData = await apiClient.users.list();
      setUsers(uData);
    } catch (err: any) {
      console.error('Fetch users list failed:', err);
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

  const handleNameUpdate = async (id: string) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName }),
      });
      if (res.ok) {
        setEditingNameId(null);
        fetchData();
      } else {
        const err = await res.json();
        alert('사용자 정보 변경 실패: ' + err.message);
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

  const pendingUsers = users.filter(u => u.role === 'PENDING');
  const activeUsers = users.filter(u => u.role !== 'PENDING' && u.role !== 'RESIGNED');

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
                <td style={{ fontWeight: 600 }}>
                  {editingNameId === u.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        className="input-field" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        style={{ padding: '4px 8px', margin: 0, minHeight: '32px', fontSize: '0.9rem', width: '120px' }}
                        autoFocus
                      />
                      <button onClick={() => handleNameUpdate(u.id)} style={{ padding: '4px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}><Check size={14}/></button>
                      <button onClick={() => setEditingNameId(null)} style={{ padding: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}><X size={14}/></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {u.name} <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({u.id})</span>
                      <button 
                        onClick={() => { setEditingNameId(u.id); setNewName(u.name || ''); }} 
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                        title="이름 수정"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
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
                    disabled={u.id === user?.id}
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
    </main>
  );
};
