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
  const [filterStatus, setFilterStatus] = useState<'all' | 'needed' | 'issued' | 'completed'>('all');

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

  /** 데이터 평면화: 마일스톤별 액션 리스트 생성 */
  const flattenMilestones = (items: any[]) => {
    const actions: any[] = [];
    items.forEach(item => {
      const milestones = [
        { key: 'advInvoiced', label: '선금', amt: item.advAmt, date: item.advDate, invoiced: item.advInvoiced, paidAmt: item.advPaidAmt },
        { key: 'interimInvoiced', label: '중도금', amt: item.interimAmt, date: item.interimDate, invoiced: item.interimInvoiced, paidAmt: item.interimPaidAmt },
        { key: 'finalInvoiced', label: '잔금', amt: item.finalAmt, date: item.finalDate, invoiced: item.finalInvoiced, paidAmt: item.finalPaidAmt }
      ];

      milestones.forEach(m => {
        if (!m.amt || m.amt <= 0) return;
        actions.push({
          ...item,
          actionKey: m.key,
          actionLabel: m.label,
          amount: m.amt,
          targetDate: m.date,
          isInvoiced: m.invoiced,
          isPaid: (m.paidAmt || 0) >= m.amt
        });
      });
    });
    return actions;
  };

  const allActions = flattenMilestones(data);

  // 검색 및 필터링
  const filteredActions = allActions.filter(action => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (action.barcode?.toLowerCase().includes(term)) ||
                         (action.clientId?.toLowerCase().includes(term)) ||
                         (action.clientName?.toLowerCase().includes(term));
    
    if (!matchesSearch) return false;

    if (filterStatus === 'needed') return !action.isInvoiced;
    if (filterStatus === 'issued') return action.isInvoiced && !action.isPaid;
    if (filterStatus === 'completed') return action.isPaid;
    return true;
  });

  // 타임라인 그룹화
  const groupActionsByTimeline = (actions: any[]) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const groups: Record<string, any[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      upcoming: []
    };

    actions.forEach(a => {
      if (!a.targetDate) {
        groups.upcoming.push(a);
        return;
      }
      const d = new Date(a.targetDate);
      d.setHours(0,0,0,0);
      const diff = d.getTime() - today.getTime();
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

      if (a.isInvoiced && a.isPaid) {
        groups.upcoming.push(a); // 완료건은 순차적으로 표시
        return;
      }

      if (diffDays < 0) groups.overdue.push(a);
      else if (diffDays === 0) groups.today.push(a);
      else if (diffDays <= 7) groups.thisWeek.push(a);
      else groups.upcoming.push(a);
    });

    // 날짜순 정렬
    Object.keys(groups).forEach(key => {
      groups[key].sort((x, y) => (x.targetDate || '').localeCompare(y.targetDate || ''));
    });

    return groups;
  };

  const timelineGroups = groupActionsByTimeline(filteredActions);

  // 통계 재계산 (현재 필터 무시한 전체 기준)
  const stats = {
    needsIssuance: allActions.filter(a => !a.isInvoiced).length,
    issued: allActions.filter(a => a.isInvoiced && !a.isPaid).length,
    completed: allActions.filter(a => a.isPaid).length
  };

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

        {/* 2. 상태 필터 및 검색 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: '전체보기', count: allActions.length },
              { id: 'needed', label: '발행필요', count: stats.needsIssuance, color: '#dc2626' },
              { id: 'issued', label: '발행완료', count: stats.issued, color: '#2563eb' },
              { id: 'completed', label: '입금완료', count: stats.completed, color: '#059669' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  border: filterStatus === tab.id ? '2px solid var(--kaic-navy)' : '1px solid #e2e8f0',
                  background: filterStatus === tab.id ? 'var(--kaic-navy)' : 'white',
                  color: filterStatus === tab.id ? 'white' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {tab.label}
                <span style={{ 
                  background: filterStatus === tab.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
                  color: filterStatus === tab.id ? 'white' : tab.color || '#64748b',
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.75rem' 
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="search-bar" style={{ width: '350px', margin: 0 }}>
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="업체명, 접수번호로 검색..." 
              className="search-input" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* 3. 액션 타임라인 보드 */}
        {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>데이터를 불러오는 중...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {timelineGroups.overdue.length > 0 && <TimelineGroup title="기한 지남 (Overdue)" actions={timelineGroups.overdue} color="#dc2626" toggleInvoiced={toggleInvoiced} notices={notices} setNotices={setNotices} handleSaveNotice={handleSaveNotice} />}
            {timelineGroups.today.length > 0 && <TimelineGroup title="오늘 발행 (Today)" actions={timelineGroups.today} color="#ea580c" toggleInvoiced={toggleInvoiced} notices={notices} setNotices={setNotices} handleSaveNotice={handleSaveNotice} />}
            {timelineGroups.thisWeek.length > 0 && <TimelineGroup title="이번 주 (This Week)" actions={timelineGroups.thisWeek} color="#2563eb" toggleInvoiced={toggleInvoiced} notices={notices} setNotices={setNotices} handleSaveNotice={handleSaveNotice} />}
            {timelineGroups.upcoming.length > 0 && <TimelineGroup title="향후 일정 (Upcoming)" actions={timelineGroups.upcoming} color="#64748b" toggleInvoiced={toggleInvoiced} notices={notices} setNotices={setNotices} handleSaveNotice={handleSaveNotice} />}
            
            {filteredActions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '6rem', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                <FileText size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#64748b', fontWeight: 600 }}>표시할 발행 내역이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/** 타임라인 그룹 컴포넌트 */
function TimelineGroup({ title, actions, color, toggleInvoiced, notices, setNotices, handleSaveNotice }: any) {
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '4px', height: '24px', background: color, borderRadius: '2px' }}></div>
        {title}
        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>({actions.length})</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {actions.map((action: any) => (
          <ActionCard 
            key={`${action.id}-${action.actionLabel}`} 
            action={action} 
            toggleInvoiced={toggleInvoiced}
            notices={notices}
            setNotices={setNotices}
            handleSaveNotice={handleSaveNotice}
          />
        ))}
      </div>
    </div>
  );
}

/** 개별 액션 카드 컴포넌트 */
function ActionCard({ action, toggleInvoiced, notices, setNotices, handleSaveNotice }: any) {
  const isPaid = action.isPaid;
  const isInvoiced = action.isInvoiced;

  // D-Day 계산
  const today = new Date();
  today.setHours(0,0,0,0);
  const targetDate = action.targetDate ? new Date(action.targetDate) : null;
  let dDayText = '';
  let dDayColor = '#64748b';

  if (targetDate) {
    targetDate.setHours(0,0,0,0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) { dDayText = 'D-Day (오늘)'; dDayColor = '#dc2626'; }
    else if (diffDays < 0) { dDayText = `D+${Math.abs(diffDays)} (지남)`; dDayColor = '#991b1b'; }
    else { dDayText = `D-${diffDays}`; dDayColor = diffDays <= 3 ? '#ea580c' : '#2563eb'; }
  }

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '20px', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
      border: '1px solid #e2e8f0',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden'
    }} className="hover-card">
      {/* 1. 날짜 섹션 */}
      <div style={{ minWidth: '120px', textAlign: 'center', borderRight: '1px solid #f1f5f9', paddingRight: '1.5rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{action.targetDate || '일정미정'}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: dDayColor, marginTop: '4px' }}>{dDayText}</div>
        <div style={{ 
          marginTop: '8px', 
          fontSize: '0.75rem', 
          fontWeight: 900, 
          padding: '4px 10px', 
          borderRadius: '8px', 
          background: action.actionLabel === '선금' ? '#eff6ff' : action.actionLabel === '중도금' ? '#faf5ff' : '#f0fdf4',
          color: action.actionLabel === '선금' ? '#1d4ed8' : action.actionLabel === '중도금' ? '#7e22ce' : '#15803d',
          display: 'inline-block'
        }}>
          {action.actionLabel}
        </div>
      </div>

      {/* 2. 업체 정보 섹션 */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--kaic-blue)', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>{action.barcode}</span>
          <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>{action.clientId}</h4>
          {action.bizLicenseUrl && (
            <button onClick={() => window.open(action.bizLicenseUrl, '_blank')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
              <FileCheck size={20} color="#2563eb" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={14} /> {action.phone || 'N/A'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mail size={14} /> {action.email || 'N/A'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e293b' }}>
            <strong>{action.clientName} 담당</strong>
          </div>
        </div>
      </div>

      {/* 3. 금액 및 상태 버튼 */}
      <div style={{ textAlign: 'right', minWidth: '180px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '10px' }}>
          {action.amount?.toLocaleString()}원
        </div>
        <button 
          onClick={() => toggleInvoiced(action.id, action.actionKey, action.isInvoiced)}
          disabled={isPaid}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: isPaid ? 'default' : 'pointer',
            border: 'none',
            background: isPaid ? '#ecfdf5' : isInvoiced ? '#eff6ff' : '#fef2f2',
            color: isPaid ? '#059669' : isInvoiced ? '#2563eb' : '#dc2626',
            width: '100%',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {isPaid ? '입금마감' : isInvoiced ? '발급완료' : '세금계산서 발급하기'}
        </button>
      </div>

      {/* 4. Notice 입력칸 (오른쪽 사이드) */}
      <div style={{ width: '250px', marginLeft: '1rem', position: 'relative' }}>
        <textarea 
          placeholder="재무 특이사항 입력..."
          style={{ 
            width: '100%', 
            minHeight: '86px', 
            fontSize: '0.8rem', 
            padding: '10px', 
            paddingRight: '35px',
            borderRadius: '12px', 
            border: '1px solid #e2e8f0', 
            background: '#f8fafc',
            resize: 'none',
            fontFamily: 'inherit'
          }}
          value={notices[action.id] || ''}
          onChange={(e) => setNotices((prev: any) => ({ ...prev, [action.id]: e.target.value }))}
        />
        <button 
          onClick={() => handleSaveNotice(action.id)}
          style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'var(--kaic-blue)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
          title="메모 저장"
        >
          <Save size={14} />
        </button>
      </div>
    </div>
  );
}
