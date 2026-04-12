import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleCalendarProps {
  data: any[];
}

// 시험원 이름에 따라 고유한 파스텔 배경색을 부여하기 위한 팔레트
const TESTER_COLORS = [
  { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' }, // Red
  { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' }, // Amber
  { bg: '#dcfce7', border: '#22c55e', text: '#15803d' }, // Green
  { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' }, // Light Blue
  { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' }, // Purple
  { bg: '#ffedd5', border: '#f97316', text: '#c2410c' }, // Orange
  { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' }, // Fuchsia
  { bg: '#f1f5f9', border: '#64748b', text: '#334155' }, // Slate
];

export const ScheduleCalendar = ({ data }: ScheduleCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달력 계산 보조 로직
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // 현재 월에 필터링된 시험 데이터 배열 반환
  const schedules = useMemo(() => {
    // 1. 데이터에서 시험 시작 날짜가 있는 것들만 추출
    const filtered = data.filter(d => d.testStartDate);
    
    // 2. 날짜별로 그룹화
    const byDate: Record<string, any[]> = {};
    
    filtered.forEach(item => {
      // testStartDate가 ISO 형식(2026-04-12T...)이거나 일반 문자열일 수 있으므로 앞 10자리(YYYY-MM-DD)만 추출
      const rawDate = item.testStartDate || '';
      const startDateStr = rawDate.slice(0, 10);
      const testerName = item.tests?.[0]?.tester?.name || '미배정';
      const clientName = item.clientName || item.clientId || '의뢰처 없음';
      
      const payload = {
        id: item.id,
        testerName,
        clientName,
      };
      
      if (!byDate[startDateStr]) {
        byDate[startDateStr] = [];
      }
      byDate[startDateStr].push(payload);
    });
    
    return byDate;
  }, [data]);

  // 시험원 이름 -> 고정된 색상 인덱스 매핑 (간단한 해시 방식)
  const getTesterColor = (testerName: string) => {
    if (testerName === '미배정') return TESTER_COLORS[TESTER_COLORS.length - 1]; // Slate
    let hash = 0;
    for (let i = 0; i < testerName.length; i++) {
        hash = testerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % (TESTER_COLORS.length - 1); // 미배정(슬레이트) 제외
    return TESTER_COLORS[idx];
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const renderCells = () => {
    const cells = [];
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // 전달(빈 칸)
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', minHeight: '100px' }}></div>);
    }

    // 이번달(실제 날짜)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySchedules = schedules[dateStr] || [];
      const isToday = isCurrentMonth && today.getDate() === d;
      
      cells.push(
        <div key={d} className={`calendar-cell ${isToday ? 'today' : ''}`} style={{ background: isToday ? '#eff6ff' : 'white', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', minHeight: '120px', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: isToday ? '#2563eb' : '#475569', textAlign: 'left' }}>
            {d}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {daySchedules.map((sch, i) => {
              const color = getTesterColor(sch.testerName);
              return (
                <div key={sch.id + '-' + i} style={{ 
                  background: color.bg, 
                  borderLeft: `3px solid ${color.border}`, 
                  color: color.text, 
                  fontSize: '0.75rem', 
                  padding: '2px 4px', 
                  borderRadius: '0 4px 4px 0', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }} title={`[${sch.testerName}] ${sch.clientName}`}>
                  <span style={{opacity: 0.8}}>[{sch.testerName}]</span> {sch.clientName}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'auto' }}>
      {/* 캘린더 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <button className="btn" style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.5rem' }} onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
          {year}년 {month + 1}월 통합 시험 일정
        </h3>
        <button className="btn" style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.5rem' }} onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '0.75rem 0', color: '#ef4444' }}>일</div>
        <div style={{ padding: '0.75rem 0' }}>월</div>
        <div style={{ padding: '0.75rem 0' }}>화</div>
        <div style={{ padding: '0.75rem 0' }}>수</div>
        <div style={{ padding: '0.75rem 0' }}>목</div>
        <div style={{ padding: '0.75rem 0' }}>금</div>
        <div style={{ padding: '0.75rem 0', color: '#3b82f6' }}>토</div>
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, backgroundColor: 'white', borderLeft: '1px solid #e2e8f0' }}>
        {renderCells()}
      </div>
    </div>
  );
};
