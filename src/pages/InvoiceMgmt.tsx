import { useEffect, useState } from 'react';
import { FileText, Search, CheckCircle2, AlertCircle, Clock, Phone, Mail, FileCheck, Save } from 'lucide-react';
import { apiClient } from '../api/client';

/**
 * @file InvoiceMgmt.tsx
 * @description 재무관리자를 위한 세금계산서 발행 및 일정 관리 페이지입니다.
 * 마일스톤(선금, 중도금, 잔금)별 발행 상태를 한눈에 파악하고 관리할 수 있는 파이프라인 UI를 제공합니다.
 */

export default function InvoiceMgmt() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notices, setNotices] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const items = await apiClient.receptions.list();
      // 유효한 견적/결재 정보가 있는 건들만 필터링 (estFees > 0)
      const financialItems = items.filter((i: any) => 
        (i.estFees > 0 || i.advAmt > 0 || i.interimAmt > 0 || i.finalAmt > 0) &&
        i.status !== 'DISPOSED'
      );
      setData(financialItems);
      // Initialize notices from data
      const noticeMap: Record<string, string> = {};
      financialItems.forEach((item: any) => {
        noticeMap[item.id] = item.financeNotice || '';
      });
      setNotices(noticeMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /** 세금계산서 발행 상태 토글 */
  const toggleInvoiced = async (sampleId: string, field: string, currentValue: boolean) => {
    try {
      await apiClient.receptions.update(sampleId, { [field]: !currentValue });
      fetchData();
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  };

  /** 재무 메모 저장 */
  const handleSaveNotice = async (sampleId: string) => {
    try {
      await apiClient.receptions.update(sampleId, { financeNotice: notices[sampleId] });
      alert('메모가 저장되었습니다.');
      fetchData();
    } catch (err: any) {
      alert('메모 저장 실패: ' + err.message);
    }
  };

  // 통계 계산
  const stats = {
    needsIssuance: 0,
    issued: 0,
    completed: 0
  };

  data.forEach(item => {
    const milestones = [
      { amt: item.advAmt, invoiced: item.advInvoiced, paidAmt: item.advPaidAmt },
      { amt: item.interimAmt, invoiced: item.interimInvoiced, paidAmt: item.interimPaidAmt },
      { amt: item.finalAmt, invoiced: item.finalInvoiced, paidAmt: item.finalPaidAmt }
    ];

    milestones.forEach(m => {
      if (!m.amt || m.amt <= 0) return;
      if (!m.invoiced) {
        stats.needsIssuance++;
      } else if (m.invoiced && (m.paidAmt || 0) < m.amt) {
        stats.issued++;
      } else if (m.invoiced && (m.paidAmt || 0) >= m.amt) {
        stats.completed++;
      }
    });
  });

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (item.barcode?.toLowerCase().includes(term)) ||
           (item.clientId?.toLowerCase().includes(term)) ||
           (item.clientName?.toLowerCase().includes(term));
  });

  return (
    <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} color="var(--kaic-navy)" />
                세금계산서 발행 관리 (Invoice Management)
              </h2>
              <p style={{ color: '#64748b' }}>시험원이 입력한 청구 일정에 맞춰 세금계산서 발행 여부를 관리합니다.</p>
            </div>
            <a 
              href="https://hometax.go.kr/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
              className="hover-card"
            >
              <img src="/hometax.png" alt="Hometax" style={{ height: '24px', objectFit: 'contain' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e293b' }}>홈택스 바로가기</span>
            </a>
          </div>
          <div className="search-bar" style={{ width: '300px' }}>
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="접수번호, 업체명 검색" 
              className="search-input" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* 1. 상단 대시보드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '16px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '12px' }}><AlertCircle color="#dc2626" /></div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>발행 필요</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>{stats.needsIssuance}건</div>
            </div>
          </div>
          <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '12px' }}><Clock color="#2563eb" /></div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>발행 완료 (입금대기)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb' }}>{stats.issued}건</div>
            </div>
          </div>
          <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '16px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ background: '#d1fae5', padding: '12px', borderRadius: '12px' }}><CheckCircle2 color="#059669" /></div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600 }}>결제/모두 완결</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{stats.completed}건</div>
            </div>
          </div>
        </div>

        {/* 2. 업무 파이프라인 보드 */}
        {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>데이터를 불러오는 중...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ background: 'transparent', paddingLeft: '1rem', width: '30%' }}>의뢰기관 / 접수정보</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>선금 (착수금)</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>중도금</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>잔금</th>
                  <th style={{ background: 'transparent', textAlign: 'center', width: '25%' }}>재무 관리자 Notice</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id} style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '1.25rem 1rem', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 900, color: 'var(--kaic-blue)', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{item.barcode}</span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{item.clientId}</h3>
                          {item.bizLicenseUrl && (
                            <button 
                              onClick={() => window.open(item.bizLicenseUrl, '_blank')}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                              title="사업자등록증 보기"
                            >
                              <FileCheck size={18} color="#2563eb" />
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                          <span>{item.clientName} 담당자</span>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} /> {item.phone || '연락처없음'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                          <Mail size={14} /> {item.email || '이메일없음'}
                        </div>
                      </div>
                    </td>

                    {/* Milestone 1: Advance */}
                    <MilestoneCell 
                      label="선금"
                      amount={item.advAmt}
                      date={item.advDate}
                      invoiced={item.advInvoiced}
                      paidAmt={item.advPaidAmt}
                      onToggle={() => toggleInvoiced(item.id, 'advInvoiced', item.advInvoiced)}
                    />

                    {/* Milestone 2: Interim */}
                    <MilestoneCell 
                      label="중도금"
                      amount={item.interimAmt}
                      date={item.interimDate}
                      invoiced={item.interimInvoiced}
                      paidAmt={item.interimPaidAmt}
                      onToggle={() => toggleInvoiced(item.id, 'interimInvoiced', item.interimInvoiced)}
                    />

                    {/* Milestone 3: Final */}
                    <MilestoneCell 
                      label="잔금"
                      amount={item.finalAmt}
                      date={item.finalDate}
                      invoiced={item.finalInvoiced}
                      paidAmt={item.finalPaidAmt}
                      onToggle={() => toggleInvoiced(item.id, 'finalInvoiced', item.finalInvoiced)}
                    />

                    <td style={{ padding: '1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <textarea 
                          className="input-field"
                          placeholder="재무 특이사항 입력..."
                          style={{ width: '100%', minHeight: '80px', fontSize: '0.8rem', padding: '8px', paddingRight: '35px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                          value={notices[item.id] || ''}
                          onChange={(e) => setNotices(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <button 
                          onClick={() => handleSaveNotice(item.id)}
                          style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'var(--kaic-blue)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="저장"
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

/** 마일스톤 셀 컴포넌트 */
function MilestoneCell({ amount, date, invoiced, paidAmt, onToggle }: any) {
  if (!amount || amount <= 0) {
    return (
      <td style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>-</span>
      </td>
    );
  }

  const isPaid = (paidAmt || 0) >= amount;
  
  // D-Day 계산
  const today = new Date();
  today.setHours(0,0,0,0);
  const targetDate = date ? new Date(date) : null;
  let dDayText = '';
  let dDayColor = '#64748b';

  if (targetDate) {
    targetDate.setHours(0,0,0,0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      dDayText = 'D-Day (오늘)';
      dDayColor = '#dc2626';
    } else if (diffDays < 0) {
      dDayText = `D+${Math.abs(diffDays)} (지남)`;
      dDayColor = '#991b1b';
    } else {
      dDayText = `D-${diffDays}`;
      if (diffDays <= 3) dDayColor = '#ea580c';
      else dDayColor = '#2563eb';
    }
  }

  return (
    <td style={{ padding: '0.75rem', borderRight: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b' }}>
          {amount.toLocaleString()}원
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>{date || '일정미정'}</div>
          {date && <div style={{ fontSize: '0.7rem', fontWeight: 800, color: dDayColor }}>{dDayText}</div>}
        </div>
        
        <button 
          onClick={onToggle}
          disabled={isPaid}
          style={{
            marginTop: '4px',
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: isPaid ? 'default' : 'pointer',
            border: 'none',
            background: isPaid ? '#ecfdf5' : invoiced ? '#eff6ff' : '#fef2f2',
            color: isPaid ? '#059669' : invoiced ? '#2563eb' : '#dc2626',
            width: '90px',
            textAlign: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {isPaid ? '입금마감' : invoiced ? '발행완료' : '발행필요'}
        </button>
      </div>
    </td>
  );
}
