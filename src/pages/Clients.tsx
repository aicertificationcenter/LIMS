
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Users, Search, FileText, Download, Mail, Send } from 'lucide-react';

export const Clients = () => {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReception, setSelectedReception] = useState<any>(null);
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const uniqueClientEmails = useMemo(() => {
    const emails = receptions.map(r => r.email).filter(e => e && e.includes('@'));
    return Array.from(new Set(emails));
  }, [receptions]);

  const handleExportCSV = () => {
    if (receptions.length === 0) return;
    
    const headers = ['접수일자', '접수번호', '의뢰처', '사업자번호', '의뢰인', '연락처', '이메일', '진행상태', '시험대상', '기타'];
    const rows = receptions.map(r => [
      new Date(r.receivedAt).toLocaleDateString(),
      r.barcode,
      r.clientId,
      r.bizNo || '',
      r.clientName,
      r.phone || '',
      r.email || '',
      getStatusLabel(r.status),
      (r.target || r.content || '').replace(/\n/g, ' '),
      (r.extra || r.consultation || '').replace(/\n/g, ' ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LIMS_Client_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }
    if (uniqueClientEmails.length === 0) {
       alert('발송 가능한 이메일 주소가 없습니다.');
       return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          content: emailBody,
          recipients: uniqueClientEmails
        })
      });
      if (res.ok) {
        alert(`${uniqueClientEmails.length}명의 의뢰처에 공지 메일을 발송했습니다.`);
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailBody('');
      } else {
        const err = await res.json();
        alert('메일 발송 실패: ' + err.message);
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

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
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', width: '250px' }}>
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
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ margin: 0, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Download size={18} /> CSV 내보내기
            </button>
            <button className="btn btn-primary" onClick={() => setShowEmailModal(true)} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Mail size={18} /> 단체 안내 메일
            </button>
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
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>사업자번호 / 이메일</label><span style={{ fontWeight: 700 }}>{selectedReception.bizNo || 'N/A'} / {selectedReception.email || 'N/A'}</span></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>연락처</label><span style={{ fontWeight: 700 }}>{selectedReception.phone || 'N/A'}</span></div>
                <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>총괄 담당자</label><span style={{ fontWeight: 700, color: '#047857' }}>{selectedReception.tests?.[0]?.tester?.name || '미배정'}</span></div>
              </div>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>시험 대상</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {selectedReception.target || selectedReception.content || 'N/A'}
              </div>
              
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '10px' }}>기타 및 상담 사항</h3>
              <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', whiteSpace: 'pre-wrap', marginBottom: '2rem', minHeight: '100px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {selectedReception.extra || selectedReception.consultation || 'N/A'}
              </div>
              
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

      {/* Email Announcement Modal */}
      {showEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '700px', padding: 0, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--kaic-blue)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={20} /> 의뢰처 전체 안내 메일 발송
              </h2>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowEmailModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '2rem' }}>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                전체 고객사 이메일 중 유효한 <strong>{uniqueClientEmails.length}개</strong>의 주소로 메일을 발송합니다. (개인정보 보호를 위해 숨은 참조발송)
              </p>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">메일 제목</label>
                <input 
                  className="input-field" 
                  value={emailSubject} 
                  onChange={e => setEmailSubject(e.target.value)} 
                  placeholder="예) [KAIC] 품질 시험 업무 관련 안내 말씀"
                />
              </div>

              <div className="form-group">
                <label className="form-label">메일 내용</label>
                <textarea 
                  className="input-field" 
                  rows={10} 
                  value={emailBody} 
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder="공지 사항의 상세 내용을 입력하세요."
                  style={{ minHeight: '250px' }}
                />
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                 <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, margin: 0, minHeight: '50px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  disabled={isSending}
                  onClick={handleSendEmail}
                 >
                   {isSending ? '발송 중...' : <><Send size={18} /> 안내 메일 발송하기</>}
                 </button>
                 <button className="btn btn-secondary" style={{ width: '100px', margin: 0 }} onClick={() => setShowEmailModal(false)}>취소</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
