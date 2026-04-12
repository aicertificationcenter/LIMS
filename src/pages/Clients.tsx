/**
 * @file Clients.tsx
 * @description 시스템에 등록된 모든 의뢰처(고객) 정보를 통합 관리하는 페이지입니다.
 * 실시간 검색, CSV 내보내기, 다중 수신자를 대상으로 한 공지 이메일 발송(파일 첨부 포함) 기능을 제공합니다.
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Users, Search, Download, Mail, Send, CheckSquare, Square, Paperclip, Trash2, AlertTriangle } from 'lucide-react';
import { ReceptionDetailModal } from '../components/ReceptionDetailModal';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export const Clients = () => {
  // 인증 정보
  const { user } = useAuth();
  
  // 데이터 상태 관리
  const [receptions, setReceptions] = useState<any[]>([]); // 원천 데이터 (모든 접수 건)
  const [loading, setLoading] = useState(true);           // 로딩 플래그
  const [searchTerm, setSearchTerm] = useState('');       // 검색어
  const [selectedReception, setSelectedReception] = useState<any>(null); // 상세 보기용 접수 건
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 이메일 발송 관련 상태
  const [showEmailModal, setShowEmailModal] = useState(false); // 메일 발송 모달 표시 여부
  const [emailSubject, setEmailSubject] = useState('');       // 메일 제목
  const [emailBody, setEmailBody] = useState('');             // 메일 본문
  const [isSending, setIsSending] = useState(false);          // 발송 중여부
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set()); // 선택된 수신자 집합
  const [files, setFiles] = useState<File[]>([]);             // 첨부할 파일 목록
  const fileInputRef = useRef<HTMLInputElement>(null);         // 파일 선택을 위한 Ref

  /** 컴포넌트 마운트 시 데이터 로드 */
  useEffect(() => {
    fetchData();
  }, []);

  /** 원천 접수 목록 조회 (의뢰처 정보를 추출하기 위함) */
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.receptions.list();
      setReceptions(data);
    } catch (err) {
      console.error('의뢰처 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  /** 검색어 필터링 처리 (기관명, 의뢰인, 바코드) */
  const filteredData = useMemo(() => {
    return receptions.filter(r => 
      r.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receptions, searchTerm]);

  /** 페이지네이션 데이터 */
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  /** 전체 접수 건에서 중복되지 않는 고유한 의뢰처(이메일 기준) 목록 추출 */
  const uniqueClientInfo = useMemo(() => {
    const clientsMap: Record<string, any> = {};
    receptions.forEach(r => {
      if (r.email && r.email.includes('@')) {
        clientsMap[r.email] = {
          email: r.email,
          clientId: r.clientId,
          clientName: r.clientName
        };
      }
    });
    return Object.values(clientsMap).sort((a,b) => a.clientId.localeCompare(b.clientId));
  }, [receptions]);

  /** 모달이 열릴 때 수신자 목록 초기화 */
  useEffect(() => {
    if (showEmailModal) {
      setSelectedEmails(new Set(uniqueClientInfo.map(c => c.email)));
      setFiles([]);
    }
  }, [showEmailModal, uniqueClientInfo]);

  /** 개별 수신자 선택 토글 */
  const toggleEmail = (email: string) => {
    const newSet = new Set(selectedEmails);
    if (newSet.has(email)) newSet.delete(email);
    else newSet.add(email);
    setSelectedEmails(newSet);
  };

  /** 전체 수신자 선택/해제 */
  const selectAll = () => setSelectedEmails(new Set(uniqueClientInfo.map(c => c.email)));
  const selectNone = () => setSelectedEmails(new Set());

  /** 파일 첨부 핸들러 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  /** 첨부 파일 제거 */
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  /** 파일을 Base64 문자열로 변환 (API 전송용) */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
         const base64 = (reader.result as string).split(',')[1];
         resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  /** 현재 표시된 목록을 CSV 파일로 내보냅니다. */
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

  /** 선택된 의뢰처들에게 공지 메일을 발송합니다. */
  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }
    if (selectedEmails.size === 0) {
       alert('발송할 수신자를 선택해 주세요.');
       return;
    }

    setIsSending(true);
    try {
      // 첨부파일들을 Base64로 병렬 변환
      const attachments = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file)
        }))
      );

      // 백엔드 이메일 API 호출
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          content: emailBody,
          recipients: Array.from(selectedEmails),
          attachments
        })
      });
      
      if (res.ok) {
        alert(`${selectedEmails.size}명의 의뢰처에 공지 메일을 발송했습니다.`);
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailBody('');
        setFiles([]);
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

  /** 상태 코드별 한글 라벨 변환 */
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'RECEIVED': return '접수';
      case 'QUOTED': return '견적발송';
      case 'ASSIGNED': return '시험배정';
      case 'IN_PROGRESS': return '시험진행';
      case 'APPROVAL_REQUESTED': return '결재중';
      case 'REVISING': return '반려';
      case 'APPROVED': return '결재완료';
      case 'COMPLETED': return '완료';
      case 'DISPOSED': return '폐기 완료';
      default: return status;
    }
  };

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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)', pointerEvents: 'none' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="의뢰처, 의뢰인 또는 번호 검색" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ 
                  paddingLeft: '52px', 
                  margin: 0, 
                  height: '48px',
                  borderRadius: '24px',
                  fontSize: '1rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '100%'
                }}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ margin: 0, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Download size={18} /> CSV 내보내기
            </button>
            <button className="btn btn-primary" onClick={() => setShowEmailModal(true)} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Mail size={18} /> 메일보내기
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
                {paginatedData.map(r => (
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
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
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

        <Pagination 
          totalItems={filteredData.length} 
          itemsPerPage={itemsPerPage} 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </section>

      {/* Detail Modal */}
      {selectedReception && (
        <ReceptionDetailModal 
          reception={selectedReception} 
          onClose={() => setSelectedReception(null)} 
        />
      )}

      {/* Email Announcement Modal (Attachments & Improved UI) */}
      {showEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '1100px', maxHeight: '90vh', padding: 0, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 2rem', background: 'var(--kaic-blue)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={18} /> 메일 보내기 (보내는 사람: 한국인공지능검증원)
              </h2>
              <button style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowEmailModal(false)}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', flex: 1, overflow: 'hidden' }}>
              {/* Left Column: Editor & Attachments */}
              <div style={{ padding: '1.5rem 2rem', borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                
                {/* 메일 제목 영역 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 800, color: '#1e293b', marginBottom: '8px', fontSize: '0.9rem' }}>메일 제목</label>
                  <input 
                    className="input-field" 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)} 
                    placeholder="공지 사항의 제목을 입력하세요."
                    style={{ fontSize: '1rem', width: '100%', margin: 0 }}
                  />
                </div>

                {/* 메일 본문 영역 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 800, color: '#1e293b', marginBottom: '8px', fontSize: '0.9rem' }}>메일 내용</label>
                  <textarea 
                    className="input-field" 
                    rows={12} 
                    value={emailBody} 
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="여기에 공지 사항의 상세 내용을 입력하세요."
                    style={{ fontSize: '1rem', width: '100%', margin: 0, minHeight: '300px', lineHeight: 1.6 }}
                  />
                </div>

                {/* 파일 첨부 영역 */}
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>파일 첨부 (여러 개 선택 가능)</label>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary" 
                        style={{ margin: 0, padding: '4px 12px', minHeight: '34px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                         <Paperclip size={14} /> 파일 선택
                      </button>
                      <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} style={{ display: 'none' }} />
                   </div>
                   
                   <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '1rem', minHeight: '80px' }}>
                      {files.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: '20px 0' }}>첨부된 파일이 없습니다.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                           {files.map((f, i) => (
                             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, display: 'flex' }}><Trash2 size={14} /></button>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                   
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <AlertTriangle size={16} color="#d97706" />
                      <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
                        시스템 제한 안내: 전체 첨부 파일 용량은 합계 **4.5MB** 이하를 권장합니다. (대용량 발송 실패 방지)
                      </span>
                   </div>
                </div>
              </div>

              {/* Right Column: Recipient Selection */}
              <div style={{ padding: '1.5rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>수신 대상 ({selectedEmails.size}명)</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--kaic-blue)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>전체 선택</button>
                    <button onClick={selectNone} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>전체 해제</button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.5rem' }}>
                   {uniqueClientInfo.map(c => (
                     <div 
                        key={c.email} 
                        onClick={() => toggleEmail(c.email)}
                        style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: selectedEmails.has(c.email) ? '#eff6ff' : 'transparent', border: `1px solid ${selectedEmails.has(c.email) ? '#bfdbfe' : 'transparent'}`, transition: 'all 0.2s' }}
                     >
                        {selectedEmails.has(c.email) ? <CheckSquare size={18} color="var(--kaic-blue)" /> : <Square size={18} color="#cbd5e1" />}
                        <div style={{ overflow: 'hidden' }}>
                           <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{c.clientId} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.75rem' }}>({c.clientName})</span></div>
                           <div style={{ fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', opacity: 0.8 }}>{c.email}</div>
                        </div>
                     </div>
                   ))}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                   <div style={{ background: '#334155', color: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      <strong>개인정보 보호 안내:</strong> 숨은 참조(BCC)로 발송되어 수신자들은 서로의 주소를 확인할 수 없습니다.
                   </div>
                   <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', margin: 0, minHeight: '52px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', borderRadius: '12px' }}
                      disabled={isSending || selectedEmails.size === 0}
                      onClick={handleSendEmail}
                   >
                     {isSending ? '공지 발송 중...' : <><Send size={18} /> 메일 보내기</>}
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
