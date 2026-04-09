/**
 * @file Reports.tsx
 * @description 시험원이 담당한 시험 건의 증적 자료를 관리하고 최종 성적서(PDF)를 업로드하여 시험을 완료하는 페이지입니다.
 * 증적 파일 업로드/삭제, 성적서 등록 및 최종 제출(상태 변경) 기능을 담당합니다.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../api/client';
import { Download, FileText, Trash2, UploadCloud, FileType, Image as ImageIcon, Monitor, Save } from 'lucide-react';

/**
 * 이미지 파일을 압축하고 리사이징하는 헬퍼 함수
 * @param file 원본 파일
 * @param maxWidth 최대 너비 (기본 1200px)
 * @param maxHeight 최대 높이 (기본 1200px)
 * @param quality 압축 품질 (0~1, 기본 0.8)
 */
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
 
        // 비율 유지하며 리사이징 계산
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            width = maxHeight;
          }
        }
 
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');
        
        ctx.drawImage(img, 0, 0, width, height);
        // JPEG로 압축하여 용량 축소
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const Reports = () => {
  // 인증 정보
  const { user } = useAuth();
  
  // 데이터 상태 관리
  const [myTests, setMyTests] = useState<any[]>([]); // 내가 담당한 시험 목록
  const [loading, setLoading] = useState(true);     // 데이터 로딩 플래그
  const [selectedId, setSelectedId] = useState<string | null>(null); // 현재 성적서 작업 중인 시험 ID
  
  /** 현재 선택된 시험 객체 */
  const selectedTest = myTests.find((t: any) => t.id === selectedId);

  // --- 시험 결과 요약(Test Case) 상태 관리 ---
  const [tcCount, setTcCount] = useState(1);
  const [tcResults, setTcResults] = useState<any[]>([]);
  const [tcMethods, setTcMethods] = useState<any[]>([]);

  // --- 시험 환경(Environment) 상태 관리 ---
  const [envDiagramUrl, setEnvDiagramUrl] = useState<string | null>(null);
  const [pcSpec, setPcSpec] = useState('');
  const [envDescription, setEnvDescription] = useState('');

  // --- 시험장 환경(Venue) 상태 관리 ---
  const [venueImageCount, setVenueImageCount] = useState(1);
  const [venueImages, setVenueImages] = useState<any[]>(new Array(4).fill(null).map(() => ({ url: null, caption: '' })));

  // --- 시험 상세 방법(Details) 상태 관리 ---
  const [tcDetails, setTcDetails] = useState<any[]>([]);

  // 선택된 시험이 바뀔 때 기존 TC 데이터 로드
  useEffect(() => {
    if (selectedTest?.extra) {
      try {
        const extraData = JSON.parse(selectedTest.extra);
        if (extraData.tcResults && Array.isArray(extraData.tcResults)) {
          setTcResults(extraData.tcResults);
          setTcCount(extraData.tcResults.length);
        } else {
          setTcResults([{ goal: '', result: '' }]);
          setTcCount(1);
        }

        if (extraData.tcMethods && Array.isArray(extraData.tcMethods)) {
          setTcMethods(extraData.tcMethods);
        } else {
          setTcMethods([{ category: '', type: '', standard: '' }]);
        }

        // 시험환경 데이터 로드
        setEnvDiagramUrl(extraData.envDiagramUrl || null);
        setPcSpec(extraData.pcSpec || '');
        setEnvDescription(extraData.envDescription || '');

        // 시험장 환경 데이터 로드 (다중 이미지 갤러리)
        if (extraData.venueImages && Array.isArray(extraData.venueImages)) {
          const loadedImages = [...extraData.venueImages];
          while (loadedImages.length < 4) loadedImages.push({ url: null, caption: '' });
          setVenueImages(loadedImages);
          setVenueImageCount(extraData.venueImageCount || 1);
        } else if (extraData.envImages && Array.isArray(extraData.envImages)) {
          const loadedImages = [...extraData.envImages];
          while (loadedImages.length < 4) loadedImages.push({ url: null, caption: '' });
          setVenueImages(loadedImages);
          setVenueImageCount(extraData.envImageCount || 1);
        } else {
          setVenueImages(new Array(4).fill(null).map(() => ({ url: null, caption: '' })));
          setVenueImageCount(1);
        }

        if (extraData.tcDetails && Array.isArray(extraData.tcDetails)) {
          setTcDetails(extraData.tcDetails);
        } else {
          setTcDetails(new Array(extraData.tcResults?.length || 1).fill(null).map(() => ({ method: '' })));
        }
      } catch (e) {
        setTcResults([{ goal: '', result: '' }]);
        setTcMethods([{ category: '', type: '', standard: '' }]);
        setTcDetails([{ method: '' }]);
        setEnvDiagramUrl(null);
        setPcSpec('');
        setEnvDescription('');
        setVenueImages(new Array(4).fill(null).map(() => ({ url: null, caption: '' })));
        setVenueImageCount(1);
        setTcCount(1);
      }
    } else {
      setTcResults([{ goal: '', result: '' }]);
      setTcMethods([{ category: '', type: '', standard: '' }]);
      setTcDetails([{ method: '' }]);
      setEnvDiagramUrl(null);
      setPcSpec('');
      setEnvDescription('');
      setVenueImages(new Array(4).fill(null).map(() => ({ url: null, caption: '' })));
      setVenueImageCount(1);
      setTcCount(1);
    }
  }, [selectedTest?.id, selectedId]); // selectedId change also triggers reload

  // TC 개수 변경 시 배열 크기 조정
  const handleTcCountChange = (count: number) => {
    setTcCount(count);
    
    // Results 동기화
    const newResults = [...tcResults];
    if (count > newResults.length) {
      for (let i = newResults.length; i < count; i++) {
        newResults.push({ goal: '', result: '' });
      }
    } else {
      newResults.splice(count);
    }
    setTcResults(newResults);

    // Methods 동기화
    const newMethods = [...tcMethods];
    if (count > newMethods.length) {
      for (let i = newMethods.length; i < count; i++) {
        newMethods.push({ category: '', type: '', standard: '' });
      }
    } else {
      newMethods.splice(count);
    }
    setTcMethods(newMethods);

    // Details 동기화
    const newDetails = [...tcDetails];
    if (count > newDetails.length) {
      for (let i = newDetails.length; i < count; i++) {
        newDetails.push({ method: '' });
      }
    } else {
      newDetails.splice(count);
    }
    setTcDetails(newDetails);
  };

  // 사용자 정보 로드 시 시험 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  /** 본인에게 배정된 시험 업무 목록을 조회합니다. */
  const fetchMyTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient.tests.listMyTasks(user.id);
      // 이미 시작된 시험(IN_PROGRESS)이나 완료된 시험(COMPLETED)만 표시
      setMyTests(data.filter((t: any) => t.status !== 'RECEIVED'));
    } catch (err) {
      console.error('업무 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };


  /** 시험을 최종 완료 상태로 변경합니다. (성적서가 등록되어야 가능) */

  /** 
   * 단일 파일을 증적 자료로 업로드합니다.
   * 이미지를 포함한 모든 파일 형식을 지원하며, uploaderId가 포함됩니다.
   */
  const handleAddEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !user) return;
    
    try {
      // 이미지 파일인 경우 압축 수행
      const dataUrl = file.type.startsWith('image/') 
        ? await compressImage(file) 
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
 
      await apiClient.evidences.create({
        sampleId: selectedId,
        uploaderId: user.id,
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image/jpeg' : file.type, // 압축 시 jpeg로 변경됨
        dataUrl
      });
      alert(`${file.name} 증적이 업로드되었습니다.`);
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  /** 증적 자료를 로컬로 다운로드합니다. */
  const handleDownloadEvidence = (ev: any) => {
    if (!ev.dataUrl) return;
    const link = document.createElement('a');
    link.href = ev.dataUrl;
    link.download = ev.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /** 업로드된 증적 자료를 삭제합니다. (컴플릿 상태 전까지만 가능) */
  const handleRemoveEvidence = async (evidenceId: string) => {
    if (confirm('정말로 이 증적 자료를 삭제하시겠습니까?')) {
      try {
        await apiClient.evidences.delete(evidenceId);
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  /** 최종 성적서(PDF) 파일을 업로드합니다. */
  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    
    if (file.type !== 'application/pdf') {
      alert('성적서는 PDF 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        await fetch('/api/receptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedId, reportPdfUrl: dataUrl })
        });
        alert('성적서가 업로드되었습니다.');
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  /** 시험을 최종 완료 상태로 변경합니다. (성적서가 등록되어야 가능) */
  const handleCompleteTest = async () => {
    if (!selectedId) return;
    if (confirm('시험을 최종 완료하시겠습니까? 완료 후에는 수정이 제한될 수 있습니다.')) {
      try {
        await fetch('/api/receptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedId, status: 'COMPLETED' })
        });
        alert('시험이 최종 완료되었습니다.');
        fetchMyTasks();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  /** TC 결과 저장 함수 */
  const handleSaveTCResults = async () => {
    if (!selectedId) return;
    try {
      let extraData: any = {};
      if (selectedTest?.extra) {
        try { extraData = JSON.parse(selectedTest.extra); } catch(e) {}
      }
      extraData.tcResults = tcResults;
      extraData.tcMethods = tcMethods;
      extraData.envDiagramUrl = envDiagramUrl;
      extraData.pcSpec = pcSpec;
      extraData.envDescription = envDescription;
      extraData.venueImages = venueImages;
      extraData.venueImageCount = venueImageCount;
      extraData.tcDetails = tcDetails;

      await fetch('/api/receptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, extra: JSON.stringify(extraData) })
      });
      alert('시험 정보(결과, 방법, 환경)가 저장되었습니다.');
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message);
    }
  };

  /** 시험환경 구성도(단일) 업로드 핸들러 */
  const handleEnvDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file);
      setEnvDiagramUrl(compressedDataUrl);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  /** 시험장 환경(갤러리) 이미지 업로드 핸들러 */
  const handleVenueImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    try {
      const compressedDataUrl = await compressImage(file);
      const newImages = [...venueImages];
      newImages[idx].url = compressedDataUrl;
      setVenueImages(newImages);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중...</div>;
  }

  // 재사용 가능한 섹션 제목 컴포넌트
  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
      <div style={{ width: '4px', height: '20px', background: 'var(--kaic-navy)', borderRadius: '2px' }}></div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h3>
    </div>
  );

  // 성적서 편집 상세 모드
  if (selectedTest) {
    return (
      <main className="dashboard-grid animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <header className="card" style={{ gridColumn: '1 / -1', background: 'var(--kaic-navy)', color: 'white', padding: '1.5rem 2rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ margin: 0 }}>성적서 발행 및 증적 관리</h2>
             <button 
               className="btn" 
               onClick={() => setSelectedId(null)} 
               style={{ 
                 background: 'rgba(255, 255, 255, 0.15)', 
                 border: '1px solid rgba(255, 255, 255, 0.4)', 
                 color: 'white',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '6px',
                 padding: '8px 16px',
                 fontSize: '0.9rem',
                 fontWeight: 600,
                 borderRadius: '8px',
                 transition: 'all 0.2s'
               }}
               onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
               onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
             >
               ← 목록으로 이동
             </button>
           </div>
           <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>시험번호: {selectedTest.testerBarcode || selectedTest.barcode}</p>
        </header>

        {/* 0. 시험 결과 요약 입력 섹션 */}
        <section className="card" style={{ gridColumn: '1 / -1', border: '1px solid #cbd5e1', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
          <SectionHeader title="시험 결과 요약" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', borderRight: '1px solid #000', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontWeight: 600, width: '100px', textAlign: 'center' }}>접수번호</div>
              <div style={{ borderLeft: '1px solid #000', paddingLeft: '1rem', flex: 1, color: '#334155' }}>
                {selectedTest.barcode}
              </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontWeight: 600, width: '100px', textAlign: 'center' }}>시험 담당자</div>
              <div style={{ borderLeft: '1px solid #000', paddingLeft: '1rem', flex: 1, color: '#334155' }}>
                {user?.name}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>Test Case 개수 선택 (최대 15개):</span>
            <select 
              value={tcCount} 
              onChange={(e) => handleTcCountChange(Number(e.target.value))}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              {[...Array(15)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}개</option>
              ))}
            </select>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            {tcResults.map((tc, idx) => (
              <div key={idx} style={{ padding: '1rem 1.5rem', borderBottom: idx === tcResults.length - 1 ? 'none' : '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--kaic-navy)', flexShrink: 0, paddingTop: '10px' }}>
                  TC{idx + 1}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', width: '80px', paddingTop: '12px' }}>목표 확인:</span>
                    <textarea 
                      className="input-field" 
                      placeholder="예: 시험대상목적물의 기능 정확성 달성 여부 확인 (목표: Accuracy 95%)"
                      value={tc.goal}
                      onChange={(e) => {
                        const newRes = [...tcResults];
                        newRes[idx].goal = e.target.value;
                        setTcResults(newRes);
                      }}
                      style={{ fontSize: '0.95rem', minHeight: '60px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', width: '80px', paddingTop: '12px' }}>결과 요약:</span>
                    <textarea 
                      className="input-field" 
                      placeholder="예: 기능 정확성 달성 목표 제시기준: 결함 분류 정확도가 달성됨. (Accuracy: 100%)"
                      value={tc.result}
                      onChange={(e) => {
                        const newRes = [...tcResults];
                        newRes[idx].result = e.target.value;
                        setTcResults(newRes);
                      }}
                      style={{ fontSize: '0.95rem', minHeight: '60px', borderLeft: '3px solid var(--kaic-blue)' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem' }}>
            <SectionHeader title="시험방법" />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>시험대상품목의<br/>명칭</th>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '35%' }}>시험대상 항목</th>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '15%' }}>시험대상 품목의<br/>형태</th>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>시험규격</th>
                  </tr>
                </thead>
                <tbody>
                  {tcMethods.map((tc, idx) => (
                    <tr key={idx}>
                      {idx === 0 && (
                        <td rowSpan={tcCount} style={{ border: '1px solid #000', padding: '12px', verticalAlign: 'middle', background: '#fff' }}>
                          <div style={{ fontWeight: 600, color: 'var(--kaic-blue)', textAlign: 'center', wordBreak: 'break-all' }}>
                            {selectedTest.testProduct || '(나의시험에서 입력한 품목명이 자동 연동됩니다)'}
                          </div>
                        </td>
                      )}
                      <td style={{ border: '1px solid #000', padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, color: '#111', flexShrink: 0, marginTop: '10px' }}>[TC{idx + 1}]</span>
                          <textarea 
                            className="input-field" 
                            value={tc.category}
                            onChange={(e) => {
                              const newMethods = [...tcMethods];
                              newMethods[idx].category = e.target.value;
                              setTcMethods(newMethods);
                            }}
                            placeholder="시험대상 항목 입력"
                            rows={2}
                            style={{ fontSize: '0.85rem', border: 'none', background: 'transparent', resize: 'vertical' }}
                          />
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>
                        <textarea 
                          className="input-field" 
                          value={tc.type}
                          onChange={(e) => {
                            const newMethods = [...tcMethods];
                            newMethods[idx].type = e.target.value;
                            setTcMethods(newMethods);
                          }}
                          placeholder="형태 입력 (예: 소프트웨어)"
                          rows={2}
                          style={{ fontSize: '0.85rem', border: 'none', background: 'transparent', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>
                        <textarea 
                          className="input-field" 
                          value={tc.standard}
                          onChange={(e) => {
                            const newMethods = [...tcMethods];
                            newMethods[idx].standard = e.target.value;
                            setTcMethods(newMethods);
                          }}
                          placeholder="시험규격 입력"
                          rows={2}
                          style={{ fontSize: '0.85rem', border: 'none', background: 'transparent' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#444', lineHeight: 1.6, padding: '0 5px' }}>
              ○ 위 각 시험항목의 대상이 되는 시험대상 목적물(소프트웨어 모델 및 데이터셋)은 ISO/IEC 17025 및 측정불확도 추정 요건과 무관하게 시험 의뢰기관에 의해 제공되었으며, 본 시험기관은 제공된 데이터셋과 모델을 사용하여 성능 평가를 수행함.<br/>
              ○ 소프트웨어 성능시험 시험대상품목 “<span style={{ fontWeight: 700, color: 'var(--kaic-navy)' }}>{selectedTest?.testProduct || '(품목명)'}</span>”을 대상으로 주어진 시험 방법에 따라 시험을 수행한다.
            </p>
          </div>

          {/* 0-1. 시험 환경 섹션 */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2rem' }}>
            <SectionHeader title="시험환경" />
 
            <div style={{ display: 'grid', gridTemplateColumns: '5.5fr 4.5fr', border: '1.5px solid #000' }}>
              {/* 왼쪽: 시험환경 구성도 */}
              <div style={{ borderRight: '1.5px solid #000', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#f1f5f9', padding: '10px', borderBottom: '1.5px solid #000', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ImageIcon size={20} /> 시험환경 구성도
                </div>
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white' }}>
                  {envDiagramUrl ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '500px', marginBottom: '1rem' }}>
                      <img src={envDiagramUrl} alt="시험환경 구성도" style={{ width: '100%', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <button 
                         onClick={() => setEnvDiagramUrl(null)} 
                         style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', border: 'none', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      >
                         ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '200px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: '1rem' }}>
                      <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '10px' }} />
                      <span style={{ fontSize: '0.9rem' }}>구성도 이미지를 업로드하세요</span>
                    </div>
                  )}
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', padding: '8px 16px' }}>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleEnvDiagramUpload} />
                    <UploadCloud size={16} /> 구성도 이미지 선택
                  </label>
                </div>
              </div>
 
              {/* 오른쪽: 시험용 PC 규격 */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: '#f1f5f9', padding: '10px', borderBottom: '1.5px solid #000', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Monitor size={20} /> 시험용 PC 규격
                </div>
                <div style={{ padding: '1.5rem', flex: 1, background: 'white' }}>
                  <textarea 
                    className="input-field" 
                    value={pcSpec} 
                    onChange={e => setPcSpec(e.target.value)} 
                    placeholder="○ Client&#10;- CPU : Intel i7...&#10;- RAM : 32GB..." 
                    style={{ width: '100%', height: '200px', border: 'none', background: 'transparent', fontSize: '0.95rem', lineHeight: 1.6, resize: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', border: '1.5px solid #000' }}>
              <div style={{ background: '#f1f5f9', padding: '8px', borderBottom: '1.5px solid #000', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                시험환경 설명
              </div>
              <div style={{ padding: '1rem', background: 'white' }}>
                <textarea 
                  className="input-field" 
                  value={envDescription} 
                  onChange={e => setEnvDescription(e.target.value)} 
                  placeholder="시험환경 구성 및 주요 특징에 대한 상세 설명을 입력하세요..." 
                  style={{ width: '100%', height: '100px', border: 'none', background: 'transparent', fontSize: '0.9rem', lineHeight: 1.5, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* 0-2. 시험 세부항목 및 방법 섹션 */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2rem' }}>
            <SectionHeader title="시험 세부항목 및 방법" />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '15%' }}>시험항목</th>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '45%' }}>시험 세부항목/기준</th>
                    <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '40%' }}>시험 방법</th>
                  </tr>
                </thead>
                <tbody>
                  {tcDetails.map((tc, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontWeight: 800, background: '#fff' }}>
                        TC{idx + 1}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '12px', background: '#f8fafc', color: '#334155', verticalAlign: 'top' }}>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.5, minHeight: '60px' }}>
                          {tcMethods[idx]?.standard || '(상단 시험방법의 시험규격을 입력하면 자동 연동됩니다)'}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>
                        <textarea 
                          className="input-field" 
                          value={tc.method}
                          onChange={(e) => {
                            const newDetails = [...tcDetails];
                            newDetails[idx].method = e.target.value;
                            setTcDetails(newDetails);
                          }}
                          placeholder="구체적인 시험 방법 입력"
                          rows={3}
                          style={{ fontSize: '0.9rem', border: 'none', background: 'transparent' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 0-3. 시험장 환경 섹션 */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2rem' }}>
            <SectionHeader title="시험장 환경" />
 
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>시험장 사진 개수:</span>
              <select 
                value={venueImageCount} 
                onChange={(e) => setVenueImageCount(Number(e.target.value))}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}개</option>)}
              </select>
            </div>
 
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${venueImageCount}, 1fr)`, gap: '1rem', marginBottom: '1.5rem' }}>
              {venueImages.slice(0, venueImageCount).map((img, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', marginBottom: '10px', borderRadius: '6px', overflow: 'hidden', border: '1px dashed #cbd5e1' }}>
                    {img.url ? <img src={img.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="미리보기" /> : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                        <ImageIcon size={32} style={{ opacity: 0.3 }} />
                        <span style={{ fontSize: '0.75rem' }}>이미지 없음</span>
                      </div>
                    )}
                  </div>
                  <label className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '10px' }}>
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleVenueImageUpload(idx, e)} />
                    사진 선택
                  </label>
                  <input 
                    className="input-field" 
                    placeholder="사진 설명" 
                    value={img.caption} 
                    onChange={(e) => {
                      const newImages = [...venueImages];
                      newImages[idx].caption = e.target.value;
                      setVenueImages(newImages);
                    }}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              ))}
            </div>
          </div>
 
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveTCResults}
              style={{ padding: '1rem 4rem', fontSize: '1.2rem', fontWeight: 800, background: 'var(--kaic-navy)', borderRadius: '40px', boxShadow: '0 4px 12px rgba(29, 42, 120, 0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <Save size={24} /> 모든 시험 정보 저장 (Save All Information)
            </button>
          </div>
        </section>

        {/* 1. 증적 자료 관리 섹션 */}
        <section className="card" style={{ gridColumn: 'span 8' }}>
          <h3 className="card-title">증적 자료 관리</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {selectedTest.evidences?.map((ev: any) => (
              <div key={ev.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  {ev.fileType.startsWith('image/') ? (
                    <img src={ev.dataUrl} alt={ev.fileName} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '4px' }} />
                  ) : (
                    <FileText size={32} color="#94a3b8" />
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--kaic-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.fileName}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <button onClick={() => handleDownloadEvidence(ev)} className="btn btn-secondary" style={{ flex: 1, minHeight: '28px', padding: 0 }} title="다운로드"><Download size={14} /></button>
                  {selectedTest.status !== 'COMPLETED' && (
                    <button onClick={() => handleRemoveEvidence(ev.id)} className="btn btn-secondary" style={{ flex: 1, minHeight: '28px', padding: 0, color: '#ef4444' }} title="삭제"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedTest.status !== 'COMPLETED' && (
            <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="file" style={{ display: 'none' }} onChange={handleAddEvidence} />
              <UploadCloud size={18} /> 증적 추가 업로드
            </label>
          )}
        </section>

        {/* 2. 최종 성적서 업로드 및 시험 완료 섹션 */}
        <section className="card" style={{ gridColumn: 'span 4' }}>
          <h3 className="card-title">최종 성적서 업로드</h3>
          <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#f1f5f9' }}>
            {selectedTest.reportPdfUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <FileType size={48} color="#ef4444" />
                <div style={{ fontWeight: 700 }}>성적서 PDF 등록 완료</div>
                <button 
                  onClick={() => { const win = window.open(); win?.document.write(`<iframe src="${selectedTest.reportPdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`); }} 
                  className="btn btn-secondary" style={{ width: '100%' }}
                >
                  파일 확인하기
                </button>
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>등록된 성적서가 없습니다.</p>
              </div>
            )}
            
            {selectedTest.status !== 'COMPLETED' && (
              <label className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleReportUpload} />
                {selectedTest.reportPdfUrl ? '성적서 교체' : 'PDF 성적서 업로드'}
              </label>
            )}
          </div>

          <div style={{ marginTop: '2rem' }}>
             <button 
               className="btn btn-primary" 
               onClick={handleCompleteTest} 
               disabled={selectedTest.status === 'COMPLETED' || !selectedTest.reportPdfUrl}
               style={{ width: '100%', background: selectedTest.status === 'COMPLETED' ? '#10b981' : '#f59e0b', fontSize: '1.1rem', padding: '1rem' }}
             >
               {selectedTest.status === 'COMPLETED' ? '✓ 시험 완료됨' : '📂 시험완료 (최종 제출)'}
             </button>
             {selectedTest.status !== 'COMPLETED' && !selectedTest.reportPdfUrl && (
               <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem', textAlign: 'center' }}>* 성적서 PDF를 먼저 업로드해 주세요.</p>
             )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title">성적서 발행 및 시험 완료</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>현재 진행 중이거나 완료된 시험 목록입니다. 증적을 관리하고 최종 성적서를 업로드하세요.</p>
        
        {myTests.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>시험번호</th>
                <th>의뢰기관</th>
                <th>구분</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {myTests.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--kaic-navy)' }}>{t.testerBarcode || t.barcode}</td>
                  <td>{t.client}</td>
                  <td><span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{t.testType || '-'}</span></td>
                  <td>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status === 'COMPLETED' ? '완료' : '시험 중'}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => setSelectedId(t.id)} style={{ padding: '4px 12px', minHeight: '32px', fontSize: '0.85rem' }}>성적서 작성</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>진행 중인 시험 업무가 없습니다.</div>
        )}
      </section>
    </main>
  );
};
