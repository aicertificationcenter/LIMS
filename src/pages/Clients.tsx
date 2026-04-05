
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Users, Search } from 'lucide-react';

export const Clients = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('Fetch clients list failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return receptions.filter(r => 
      r.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receptions, searchTerm]);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'RECEIVED': return '접수 대기';
      case 'IN_PROGRESS': return '시험 중';
      case 'COMPLETED': return '발행 완료';
      default: return status;
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>접근 권한이 없습니다.</div>;
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      <header className="card" style={{ gridColumn: '1 / -1', background: 'var(--kaic-navy)', color: 'white', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={24} /> 의뢰처 관리 (Client Management)
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>접수된 모든 시험 의뢰를 의뢰처 중심으로 관리합니다.</p>
          </div>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="의뢰처, 의뢰인 또는 번호 검색" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', margin: 0, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </div>
        </div>
      </header>

      <section className="card" style={{ gridColumn: '1 / -1' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>데이터를 불러오는 중...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>접수일자</th>
                  <th>접수번호</th>
                  <th>의뢰처</th>
                  <th>의뢰인</th>
                  <th>연락처</th>
                  <th>이메일</th>
                  <th>진행상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(r.receivedAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{r.barcode}</td>
                    <td style={{ fontWeight: 600 }}>{r.clientId}</td>
                    <td>{r.clientName}</td>
                    <td>{r.phone}</td>
                    <td style={{ fontSize: '0.85rem' }}>{r.email}</td>
                    <td>
                      <span className={`badge badge-${r.status.toLowerCase()}`}>{getStatusLabel(r.status)}</span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
