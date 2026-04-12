import { useEffect, useState } from 'react';
import { Search, Edit2, DollarSign } from 'lucide-react';
import { apiClient } from '../api/client';
import { Pagination } from '../components/Pagination';

export default function FinanceApprovals() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [testerFilter, setTesterFilter] = useState('');
  
  // 접수 상세정보 모달 상태
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<any>(null);

  // 결재 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);

  // 모달 폼 데이터 상태 (원 단위)
  const [editData, setEditData] = useState({
    advPaidAmt: 0, advPaidDate: '',
    interimPaidAmt: 0, interimPaidDate: '',
    finalPaidAmt: 0, finalPaidDate: '',
    isDepositCompleted: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const items = await apiClient.receptions.list();
      // 재무관리는 테스트 배정 이후 단계에서부터 결재 트래킹
      const activeItems = items.filter((i: any) => i.status !== 'RECEIVED' && i.status !== 'DISPOSED');
      setData(activeItems);
    } catch (err) {
      console.error(err);
      alert('결재 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 천원 단위 컴포넌트 변환 헬퍼
  const toThousands = (amount: number) => {
    if (!amount) return '0';
    return (amount / 1000).toLocaleString('ko-KR');
  };

  // 모달 폼 데이터 변환 함수
  // DB에서 Float/number 로 원단위로 저장된 값을 가져옵니다.
  const openModal = (test: any) => {
    setSelectedTest(test);
    setEditData({
      advPaidAmt: test.advPaidAmt || 0,
      advPaidDate: test.advPaidDate || '',
      interimPaidAmt: test.interimPaidAmt || 0,
      interimPaidDate: test.interimPaidDate || '',
      finalPaidAmt: test.finalPaidAmt || 0,
      finalPaidDate: test.finalPaidDate || '',
      isDepositCompleted: test.isDepositCompleted || false
    });
    setIsModalOpen(true);
  };

  const handleModalSave = async () => {
    if (!selectedTest) return;

    // 만약 세 항목의 합계가 예상 비용(estFees)과 같다면 isDepositCompleted를 true로 변환합니다.
    const totalPaid = editData.advPaidAmt + editData.interimPaidAmt + editData.finalPaidAmt;
    const isCompleted = totalPaid >= (selectedTest.estFees || 0) && (selectedTest.estFees || 0) > 0;
    
    // 물론 재무관리자가 강제로 isDepositCompleted를 조작할 수도 있으므로 명시성을 위한 처리입니다.
    const newDepositCompleted = editData.isDepositCompleted || isCompleted;

    try {
      await apiClient.receptions.update(selectedTest.id, {
        advPaidAmt: editData.advPaidAmt,
        advPaidDate: editData.advPaidDate,
        interimPaidAmt: editData.interimPaidAmt,
        interimPaidDate: editData.interimPaidDate,
        finalPaidAmt: editData.finalPaidAmt,
        finalPaidDate: editData.finalPaidDate,
        isDepositCompleted: newDepositCompleted
      });
      alert('업데이트 성공');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('오류: ' + err.message);
    }
  };

  // 대시보드 통계 계산
  const filteredForStats = selectedMonth ? data.filter(item => {
    // 2월에 조회 -> 접수는 count. 3월 조회 -> 접수 x, 만약 receivedAt 이 2월이면 2월만.
    const rDate = item.receivedAt ? item.receivedAt.substring(0, 7) : '';
    const sDate = item.testStartDate ? item.testStartDate.substring(0, 7) : '';
    const eDate = item.testEndDate ? item.testEndDate.substring(0, 7) : '';
    const aDate = item.advPaidDate ? item.advPaidDate.substring(0, 7) : '';
    const iDate = item.interimPaidDate ? item.interimPaidDate.substring(0, 7) : '';
    const fDate = item.finalPaidDate ? item.finalPaidDate.substring(0, 7) : '';
    return rDate === selectedMonth || sDate === selectedMonth || eDate === selectedMonth || aDate === selectedMonth || iDate === selectedMonth || fDate === selectedMonth;
  }) : data;

  let intakeCount = 0;
  let runningCount = 0;
  let totalEstimated = 0;
  let totalDeposited = 0;

  filteredForStats.forEach(item => {
    // 월 통계 규칙 적용
    const m = selectedMonth;
    const rDate = item.receivedAt ? item.receivedAt.substring(0, 7) : '';
    const sDate = item.testStartDate ? item.testStartDate.substring(0, 7) : '';
    const aDate = item.advPaidDate ? item.advPaidDate.substring(0, 7) : '';
    const iDate = item.interimPaidDate ? item.interimPaidDate.substring(0, 7) : '';
    const fDate = item.finalPaidDate ? item.finalPaidDate.substring(0, 7) : '';

    if (!m) {
      // 전체 기간 필터일경우, 무조건 누적
      totalDeposited += (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0);
    } else {
      // 해당 월의 낸 입금 확인
      if (aDate === m) totalDeposited += (item.advPaidAmt || 0);
      if (iDate === m) totalDeposited += (item.interimPaidAmt || 0);
      if (fDate === m) totalDeposited += (item.finalPaidAmt || 0);
    }

    if (!m || rDate === m) {
      intakeCount++;
      totalEstimated += (item.estFees || item.invoice?.total || 0);  // 현재 달력월에 견적 발생
    }
    if (!m || sDate === m) {
      runningCount++;
    }
  });

  const totalBalance = totalEstimated - totalDeposited;

  // 하단 테이블 용도의 리스트 필터링
  const filteredData = data.filter(item => {
    if (selectedMonth && !(
      (item.receivedAt && item.receivedAt.substring(0, 7) === selectedMonth) ||
      (item.testStartDate && item.testStartDate.substring(0, 7) === selectedMonth) ||
      (item.advPaidDate && item.advPaidDate.substring(0, 7) === selectedMonth) ||
      (item.interimPaidDate && item.interimPaidDate.substring(0, 7) === selectedMonth) ||
      (item.finalPaidDate && item.finalPaidDate.substring(0, 7) === selectedMonth)
    )) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const testerName = item.tests && item.tests[0] ? (item.tests[0].tester?.name || '미배정') : '미배정';
      return (item.barcode && item.barcode.toLowerCase().includes(term)) ||
             (item.clientName && item.clientName.toLowerCase().includes(term)) ||
             (item.clientId && item.clientId.toLowerCase().includes(term)) ||
             (testerName.toLowerCase().includes(term)) ||
             (item.status && item.status.toLowerCase().includes(term));
    }
    if (testerFilter) {
      const testerName = item.tests && item.tests[0] ? (item.tests[0].tester?.name || '미배정') : '미배정';
      if (testerName !== testerFilter) return false;
    }
    return true;
  });

  const uniqueTesters = Array.from(new Set(data.map(item => item.tests && item.tests[0] ? (item.tests[0].tester?.name || '미배정') : '미배정'))).sort();
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredTotalEst = filteredData.reduce((acc, item) => acc + (item.estFees || item.invoice?.total || 0), 0);
  const filteredTotalPaid = filteredData.reduce((acc, item) => acc + (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0), 0);
  const filteredTotalBal = filteredTotalEst - filteredTotalPaid;

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={24} color="var(--kaic-navy)" />
              재무 결재 관리 (Finance Approvals)
            </h2>
            <p style={{ color: '#64748b' }}>월별 접수건/입금액 조회 및 각 시험건의 입금 내역을 관리합니다.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="month" 
              className="input-field" 
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              style={{ width: 'auto', margin: 0, fontWeight: 700 }}
            />
            <select 
              className="input-field" 
              value={testerFilter} 
              onChange={(e) => { setTesterFilter(e.target.value); setCurrentPage(1); }} 
              style={{ width: '150px', margin: 0, fontWeight: 700 }}
            >
              <option value="">전체 시험원</option>
              {uniqueTesters.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="search-bar" style={{ width: '250px' }}>
              <Search size={20} className="search-icon" />
              <input type="text" placeholder="접수번호, 업체명 검색" className="search-input" value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
            </div>
            <button className="btn" onClick={fetchData} style={{ background: '#f1f5f9', color: '#1e293b' }}>새로고침</button>
          </div>
        </div>

        {/* 상단 대시보드 리포트 영역 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>접수건수</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{intakeCount}건</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>시험 진행건수</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--kaic-navy)' }}>{runningCount}건</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>총 견적 금액 <span style={{fontSize:'0.7rem'}}>(천원단위)</span></div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#334155' }}>{toThousands(totalEstimated)}천</div>
          </div>
          <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600, marginBottom: '8px' }}>총 입금액 <span style={{fontSize:'0.7rem'}}>(천원단위)</span></div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{toThousands(totalDeposited)}천</div>
          </div>
          <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, marginBottom: '8px' }}>결재 잔액 <span style={{fontSize:'0.7rem'}}>(천원단위)</span></div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>{toThousands(totalBalance > 0 ? totalBalance : 0)}천</div>
          </div>
        </div>

        {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>데이터를 불러오는 중...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>시험원명/접수번호</th>
                  <th>의뢰기관 (담당자)</th>
                  <th>견적액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                  <th>누적 입금액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                  <th>잔액 <span style={{fontSize:'0.8rem'}}>(천원)</span></th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? currentData.map(item => {
                  const est = item.estFees || item.invoice?.total || 0;
                  const paid = (item.advPaidAmt || 0) + (item.interimPaidAmt || 0) + (item.finalPaidAmt || 0);
                  const bal = est - paid;
                  const testRecord = item.tests && item.tests[0];
                  const testerName = testRecord?.tester?.name || '미배정';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--kaic-navy)' }}>{testerName}</div>
                        <button 
                          onClick={() => { setSelectedInfo(item); setInfoModalOpen(true); }}
                          style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '4px' }}
                        >
                          {item.barcode}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.clientId}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>담당자: {item.clientName}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#334155' }}>
                         {toThousands(est)}
                      </td>
                      <td style={{ fontWeight: 700, color: paid > 0 ? '#059669' : '#94a3b8' }}>
                         {toThousands(paid)}
                      </td>
                      <td style={{ fontWeight: 800, color: bal > 0 ? '#ef4444' : '#64748b' }}>
                         {toThousands(bal > 0 ? bal : 0)}
                      </td>
                      <td>
                        {item.isDepositCompleted ? (
                          <span className="badge badge-completed" style={{ background: '#10b981' }}>입금완료</span>
                        ) : (
                          <span className="badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>입금 대기중</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn"
                          onClick={() => openModal(item)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            background: item.isDepositCompleted ? '#10b981' : 'var(--kaic-navy)',
                            color: 'white'
                          }}
                        >
                          <Edit2 size={14} /> 입금관리
                        </button>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>일치하는 데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
              {testerFilter && (
                <tfoot style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <tr style={{ borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--kaic-navy)' }}>
                      [{testerFilter}] 조회 결과 합계
                    </td>
                    <td style={{ color: '#334155' }}>{toThousands(filteredTotalEst)}</td>
                    <td style={{ color: filteredTotalPaid > 0 ? '#059669' : '#94a3b8' }}>{toThousands(filteredTotalPaid)}</td>
                    <td style={{ color: filteredTotalBal > 0 ? '#ef4444' : '#64748b' }}>{toThousands(filteredTotalBal > 0 ? filteredTotalBal : 0)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <Pagination 
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </section>

      {/* 모달: 입금 관리창 (원 단위 입력 및 관리) */}
      {isModalOpen && selectedTest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--kaic-navy)', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <DollarSign size={20} /> 실 입금 내역 관리 
               <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>(원 단위 입력)</span>
            </h3>

            {/* 기본 정보 표기 영역 */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div><strong style={{ color: '#475569' }}>접수번호:</strong> {selectedTest.barcode}</div>
                 <div><strong style={{ color: '#475569' }}>의뢰기관:</strong> {selectedTest.client} ({selectedTest.clientName})</div>
                 <div><strong style={{ color: '#475569' }}>시험시작일:</strong> {selectedTest.testStartDate || '-'}</div>
                 <div><strong style={{ color: '#475569' }}>총 견적금액:</strong> <b style={{ color: '#1e293b' }}>{((selectedTest.estFees || selectedTest.invoice?.total || 0)).toLocaleString()} 원</b></div>
               </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              시험원이 요청한 청구 일정 내역입니다. 아래 입력 칸에 <b>실제 입금된 금액(원 단위)</b>과 입금일을 기록해주세요.
            </p>

            {/* 입력 폼 그리드 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {/* 1. 선금(착수금) 영역 */}
               <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem' }}>
                 <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '1rem', color: '#1e293b' }}>
                   착수금 (계획: {selectedTest.advAmt ? (selectedTest.advAmt).toLocaleString() : 0} 원 / {selectedTest.advDate || '미정'})
                 </h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금액 (원)</label>
                     <input 
                        type="number" 
                        className="input-field" 
                        value={editData.advPaidAmt}
                        onChange={e => setEditData({ ...editData, advPaidAmt: Number(e.target.value) })}
                        style={{ margin: 0 }}
                     />
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금일자</label>
                     <input 
                        type="date" 
                        className="input-field" 
                        value={editData.advPaidDate}
                        onChange={e => setEditData({ ...editData, advPaidDate: e.target.value })}
                        style={{ margin: 0 }}
                     />
                   </div>
                 </div>
               </div>

               {/* 2. 중도금 영역 */}
               <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem' }}>
                 <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '1rem', color: '#1e293b' }}>
                   중도금 (계획: {selectedTest.interimAmt ? (selectedTest.interimAmt).toLocaleString() : 0} 원 / {selectedTest.interimDate || '미정'})
                 </h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금액 (원)</label>
                     <input 
                        type="number" 
                        className="input-field" 
                        value={editData.interimPaidAmt}
                        onChange={e => setEditData({ ...editData, interimPaidAmt: Number(e.target.value) })}
                        style={{ margin: 0 }}
                     />
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금일자</label>
                     <input 
                        type="date" 
                        className="input-field" 
                        value={editData.interimPaidDate}
                        onChange={e => setEditData({ ...editData, interimPaidDate: e.target.value })}
                        style={{ margin: 0 }}
                     />
                   </div>
                 </div>
               </div>

               {/* 3. 잔금 영역 */}
               <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem' }}>
                 <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '1rem', color: '#1e293b' }}>
                   잔금 (계획: {selectedTest.finalAmt ? (selectedTest.finalAmt).toLocaleString() : 0} 원 / {selectedTest.finalDate || '미정'})
                 </h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금액 (원)</label>
                     <input 
                        type="number" 
                        className="input-field" 
                        value={editData.finalPaidAmt}
                        onChange={e => setEditData({ ...editData, finalPaidAmt: Number(e.target.value) })}
                        style={{ margin: 0 }}
                     />
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>실 입금일자</label>
                     <input 
                        type="date" 
                        className="input-field" 
                        value={editData.finalPaidDate}
                        onChange={e => setEditData({ ...editData, finalPaidDate: e.target.value })}
                        style={{ margin: 0 }}
                     />
                   </div>
                 </div>
               </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
               <input 
                 type="checkbox" 
                 id="isDepositCompleted" 
                 checked={editData.isDepositCompleted} 
                 onChange={e => setEditData({ ...editData, isDepositCompleted: e.target.checked })} 
                 style={{ width: '18px', height: '18px' }}
               />
               <label htmlFor="isDepositCompleted" style={{ fontWeight: 700, color: '#10b981' }}>입금이 모두 완료되어 마감합니다 (시험원 제출 활성화)</label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleModalSave}>입금내역 저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 접수정보 보기창 */}
      {infoModalOpen && selectedInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-navy)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>접수 상세 내역</h2>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }} onClick={() => setInfoModalOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div><strong style={{ color: '#64748b' }}>번호:</strong> {selectedInfo.barcode}</div>
                <div><strong style={{ color: '#64748b' }}>접수일:</strong> {selectedInfo.receivedAt ? selectedInfo.receivedAt.substring(0, 10) : '-'}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰기관:</strong> {selectedInfo.clientId}</div>
                <div><strong style={{ color: '#64748b' }}>의뢰자:</strong> {selectedInfo.clientName}</div>
                <div><strong style={{ color: '#64748b' }}>사업자번호:</strong> {selectedInfo.bizNo || 'N/A'}</div>
                <div><strong style={{ color: '#64748b' }}>이메일:</strong> {selectedInfo.email || 'N/A'}</div>
                <div><strong style={{ color: '#64748b' }}>연락처:</strong> {selectedInfo.phone || 'N/A'}</div>
                <div><strong style={{ color: '#64748b' }}>상태:</strong> {selectedInfo.status}</div>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>시험 대상 (의뢰/접수 내용)</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', minHeight: '80px', lineHeight: 1.5 }}>
                {selectedInfo.target || selectedInfo.content || 'N/A'}
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>기타 및 상담 사항</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '1.5rem', minHeight: '80px', lineHeight: 1.5 }}>
                {selectedInfo.extra || selectedInfo.consultation || 'N/A'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 2rem 2rem 2rem' }}>
              <button className="btn btn-primary" onClick={() => setInfoModalOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
