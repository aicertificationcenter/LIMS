
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Users, Search, FileText } from 'lucide-react';

export const Clients = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReception, setSelectedReception] = useState<any>(null);

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
                    <td style={{ fontWeight: 700 }}>
                      <button 
                        onClick={() => setSelectedReception(r)}
                        style={{ background: 'none', border: 'none', color: 'var(--kaic-navy)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 800, padding: 0 }}
                      >
                        {r.barcode}
                      </button>
                    </td>
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

      {/* Detail Modal */}
      {selectedReception && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: 0, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} /> 접수 상세 정보 (Reception Details)
              </h2>
              <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedReception(null)}>&times;</button>
            </div>
            
            <div style={{ padding: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>접수번호</label><span style={{ fontWeight: 800, color: 'var(--kaic-navy)' }}>{selectedReception.barcode}</span></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>진행상태</label><span className={`badge badge-${selectedReception.status.toLowerCase()}`}>{getStatusLabel(selectedReception.status)}</span></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>의뢰처 / 의뢰인</label><span style={{ fontWeight: 700 }}>{selectedReception.clientId} / {selectedReception.clientName} 담당</span></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>총괄 담당자</label><span style={{ fontWeight: 700, color: '#047857' }}>{selectedReception.tests?.[0]?.tester?.name || '미배정'}</span></div>
              </div>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>의뢰 상세 내용</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedReception.content}</div>
              
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>상담 및 기록 사항</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedReception.consultation}</div>
              
              {selectedReception.status === 'COMPLETED' && selectedReception.reportPdfUrl && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fffa', borderRadius: '16px', border: '1px solid #c6f6d5', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#276749' }}>✅ 최종 시험 완료 리포트가 업로드되어 있습니다.</h4>
                  <button 
                    onClick={() => { const win = window.open(); win?.document.write(`<html><body style="margin:0"><iframe src="${selectedReception.reportPdfUrl}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe></body></html>`); }} 
                    className="btn btn-primary" 
                    style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem' }}
                  >
                    <FileText size={18} /> 발행 성적서 (PDF) PDF 열기
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button className="btn btn-secondary" style={{ margin: 0, minHeight: '40px' }} onClick={() => setSelectedReception(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
