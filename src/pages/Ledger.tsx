import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { FileText, Download, Unlock } from 'lucide-react';

export const Ledger = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'KOLAS' | 'GENERAL'>('ALL');

  useEffect(() => {
    if (user && ['ADMIN', 'TECH_MGR', 'QUAL_MGR'].includes(user.role)) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('발급대장 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return receptions.filter(r => {
      // Only approved or completed issues
      if (!['APPROVED', 'COMPLETED'].includes(r.status)) return false;
      if (filterType === 'KOLAS' && r.testType !== 'KOLAS 시험') return false;
      if (filterType === 'GENERAL' && r.testType === 'KOLAS 시험') return false;
      return true;
    });
  }, [receptions, filterType]);

  const handleUnlock = async (id: string, barcode: string) => {
    if (!window.confirm(`[${barcode}] 건에 대해 모든 승인을 취소하고 시험원이 내용을 수정할 수 있도록 잠금 해제하시겠습니까?`)) return;
    try {
      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'REVISING' })
      });
      alert('잠금 해제(수정승인) 되었습니다.');
      fetchData();
    } catch (err: any) {
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  if (!user || !['ADMIN', 'TECH_MGR', 'QUAL_MGR'].includes(user.role)) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>접근 권한이 없습니다.</div>;
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>발급대장 데이터를 불러오는 중...</div>;

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <FileText size={24} color="var(--kaic-blue)" /> 성적서 발급대장
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            {(['ALL', 'KOLAS', 'GENERAL'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setFilterType(tab)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700,
                  background: filterType === tab ? 'white' : 'transparent',
                  color: filterType === tab ? 'var(--kaic-navy)' : '#64748b',
                  boxShadow: filterType === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none', cursor: 'pointer'
                }}
              >
                {tab === 'ALL' ? '전체 내역' : tab === 'KOLAS' ? 'KOLAS 시험' : '일반 시험'}
              </button>
            ))}
          </div>
        </div>

        {filteredData.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>정식 발급번호</th>
                  <th>의뢰 기관명</th>
                  <th>시험대상 품목</th>
                  <th>접수 일자</th>
                  <th>시작 일자</th>
                  <th>담당 시험원</th>
                  <th>PDF 다운로드</th>
                  <th>잠금 해제</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 800, color: 'var(--kaic-navy)' }}>{r.formalBarcode || r.barcode}</td>
                    <td style={{ fontWeight: 700 }}>{r.client}</td>
                    <td>{r.testProduct || '-'}</td>
                    <td>{new Date(r.receivedAt).toLocaleDateString()}</td>
                    <td>{r.testStartDate || '-'}</td>
                    <td style={{ color: '#047857', fontWeight: 600 }}>{r.tests?.[0]?.tester?.name || '-'}</td>
                    <td>
                      {r.reportPdfUrl ? (
                         <a href={r.reportPdfUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
                           <Download size={14} /> PDF 열기
                         </a>
                      ) : (
                         <span style={{ color: '#94a3b8' }}>미업로드</span>
                      )}
                    </td>
                    <td>
                      <button 
                        onClick={() => handleUnlock(r.id, r.formalBarcode || r.barcode)} 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        <Unlock size={14} /> 수정승인
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>조회된 발급대장 내역이 없습니다.</div>
        )}
      </section>
    </main>
  );
};
