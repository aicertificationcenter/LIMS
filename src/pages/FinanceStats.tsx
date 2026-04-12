import { useEffect, useState, useMemo } from 'react';
import { LayoutDashboard, Search, FileText, Download, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { Pagination } from '../components/Pagination';

export default function FinanceStats() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  
  // startMonth/endMonth for range filter
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const items = await apiClient.receptions.list();
      const activeItems = items.filter((i: any) => i.status !== 'RECEIVED' && i.status !== 'DISPOSED');
      setData(activeItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toThousands = (amount: number) => {
    if (!amount) return '0';
    return (amount / 1000).toLocaleString('ko-KR');
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // We look at receivedAt, testStartDate, or paid dates to exist in range
      const rDate = item.receivedAt ? item.receivedAt.substring(0, 7) : '';
      const sDate = item.testStartDate ? item.testStartDate.substring(0, 7) : '';

      let inRange = true;
      const relevantDate = sDate || rDate; 
      if (startMonth && relevantDate < startMonth) inRange = false;
      if (endMonth && relevantDate > endMonth) inRange = false;

      if (!inRange) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const testerName = item.tests && item.tests[0]?.tester?.name ? item.tests[0].tester.name : '미배정';
        return (item.barcode && item.barcode.toLowerCase().includes(term)) ||
               (item.clientName && item.clientName.toLowerCase().includes(term)) ||
               (item.clientId && item.clientId.toLowerCase().includes(term)) ||
               (testerName.toLowerCase().includes(term)) ||
               (item.testerBarcode && item.testerBarcode.toLowerCase().includes(term));
      }
      return true;
    });
  }, [data, startMonth, endMonth, searchTerm]);

  // 상단 요약본: 기간별 시험자별 수행건수, 총매출, 총미수금액 등
  const testerStats = useMemo(() => {
    const stats: Record<string, { count: number, totalSales: number, totalUnpaid: number }> = {};
    
    filteredData.forEach(item => {
      const testerId = item.tests && item.tests[0]?.tester?.name ? item.tests[0].tester.name : '미배정';
      if (!stats[testerId]) {
        stats[testerId] = { count: 0, totalSales: 0, totalUnpaid: 0 };
      }
      
      const sales = item.estFees || item.invoice?.total || 0;
      const paid = (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0);
      const unpaid = sales - paid;

      stats[testerId].count++;
      stats[testerId].totalSales += sales;
      stats[testerId].totalUnpaid += (unpaid > 0 ? unpaid : 0);
    });

    return Object.entries(stats).map(([tester, data]) => ({
      tester,
      ...data
    })).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredData]);

  const globalTotalSales = testerStats.reduce((sum, s) => sum + s.totalSales, 0);
  const globalTotalUnpaid = testerStats.reduce((sum, s) => sum + s.totalUnpaid, 0);

  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    if (filteredData.length === 0) return alert('다운로드할 데이터가 없습니다.');
    const headers = ['접수번호', '의뢰기관', '담당자명', '시험원명', '견적금액_원', '총입금액_원', '결재잔액_원', '상태'];
    const rows = filteredData.map(item => {
      const est = item.estFees || item.invoice?.total || 0;
      const paid = (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0);
      const bal = est > paid ? est - paid : 0;
      const testerName = item.tests && item.tests[0]?.tester?.name ? item.tests[0].tester.name : '미배정';
      
      return [
        item.barcode,
        item.clientId,
        item.clientName, // 담당자
        testerName,
        est,
        paid,
        bal,
        item.isDepositCompleted ? '입금완료' : '진행중'
      ].join(',');
    });

    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_stats_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={24} color="var(--kaic-navy)" />
              재무 통계 관리 (Finance Global Stats)
            </h2>
            <p style={{ color: '#64748b' }}>기간별 통계 및 매출분석 데이터를 확인합니다.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="month" className="input-field" value={startMonth} onChange={e => setStartMonth(e.target.value)} style={{ width:'130px', margin:0 }} />
              <span style={{ fontWeight: 600, color: '#64748b' }}>~</span>
              <input type="month" className="input-field" value={endMonth} onChange={e => setEndMonth(e.target.value)} style={{ width:'130px', margin:0 }} />
            </div>
            <div className="search-bar" style={{ width: '250px' }}>
              <Search size={20} className="search-icon" />
              <input type="text" placeholder="검색어 입력" className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn btn-secondary" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> CSV 다운로드
            </button>
          </div>
        </div>

        {/* 최상단 전체 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700 }}>총 매출 발생액 (천원)</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{toThousands(globalTotalSales)} 천원</div>
            </div>
          </div>
          <div style={{ background: '#fef2f2', padding: '2rem', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1rem', color: '#991b1b', fontWeight: 700 }}>총 미수 금액 (천원)</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#dc2626' }}>{toThousands(globalTotalUnpaid)} 천원</div>
            </div>
          </div>
        </div>

        {/* 시험자별 요약 */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> 시험자별 실적 요약</h3>
        <div className="table-responsive" style={{ marginBottom: '3rem' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th>시험원명</th>
                <th style={{ textAlign: 'right' }}>수행건수</th>
                <th style={{ textAlign: 'right' }}>총 매출액 (천원)</th>
                <th style={{ textAlign: 'right' }}>미수 잔액 (천원)</th>
              </tr>
            </thead>
            <tbody>
              {testerStats.map(stat => (
                <tr key={stat.tester}>
                  <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{stat.tester}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{stat.count} 건</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{toThousands(stat.totalSales)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: stat.totalUnpaid > 0 ? '#ef4444' : '#64748b' }}>{toThousands(stat.totalUnpaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 상세 리스트 */}
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> 시험/결재 상세 내역 (기간내 전체)</h3>
        {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>데이터를 불러오는 중...</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>접수번호</th>
                    <th>의뢰기관 / 담당자</th>
                    <th>시험원명</th>
                    <th style={{ textAlign: 'right' }}>견적액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                    <th style={{ textAlign: 'right' }}>입금액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                    <th style={{ textAlign: 'right' }}>잔액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                    <th style={{ textAlign: 'center' }}>견적조회</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length > 0 ? currentData.map(item => {
                    const est = item.estFees || item.invoice?.total || 0;
                    const paid = (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0);
                    const bal = est - paid;
                    const testerName = item.tests && item.tests[0]?.tester?.name ? item.tests[0].tester.name : '미배정';

                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{item.barcode}</td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.clientId}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>담당: {item.clientName}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{testerName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{toThousands(est)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: paid > 0 ? '#059669' : '#64748b' }}>{toThousands(paid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: bal > 0 ? '#ef4444' : '#64748b' }}>{toThousands(bal > 0 ? bal : 0)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => alert('진행중인 기능입니다. 기존 Invoices 와 연동됩니다.')}
                          >견적조회</button>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>일치하는 데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination 
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
      </section>
    </main>
  );
}
