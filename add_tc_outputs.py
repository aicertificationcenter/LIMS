import re

def insert_code():
    with open('src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. State Hooks
    state_hook = """  // --- 시험 상세 방법(Details) 상태 관리 ---
  const [tcDetails, setTcDetails] = useState<any[]>([]);

  // --- TC 종합 결과(Outputs) 상태 관리 ---
  const [tcOutputs, setTcOutputs] = useState<any[]>([]);
  const [expandedTCs, setExpandedTCs] = useState<boolean[]>([]);
"""
    content = content.replace("  // --- 시험 상세 방법(Details) 상태 관리 ---\n  const [tcDetails, setTcDetails] = useState<any[]>([]);\n", state_hook)

    # 2. Add to useEffect (TRY block)
    try_replacement = """        if (extraData.tcOutputs && Array.isArray(extraData.tcOutputs)) {
          setTcOutputs(extraData.tcOutputs);
          setExpandedTCs(new Array(extraData.tcOutputs.length).fill(false));
        } else {
          setTcOutputs(new Array(extraData.tcResults?.length || 1).fill(null).map(() => ({ metricName: '', metricFormulaImg: null, resultSummary: '', evidenceCount: 1, evidences: [{ title: '', description: '', images: [] }], metricTarget: '', metricResult: '', metricEvaluation: '' })));
          setExpandedTCs(new Array(extraData.tcResults?.length || 1).fill(false));
        }
      }"""
    content = content.replace("      } catch (e) {", try_replacement + " catch (e) {")

    # 3. Add to useEffect (CATCH block)
    catch_replacement = """        setTcOutputs([{ metricName: '', metricFormulaImg: null, resultSummary: '', evidenceCount: 1, evidences: [{ title: '', description: '', images: [] }], metricTarget: '', metricResult: '', metricEvaluation: '' }]);
        setExpandedTCs([false]);
        setEnvDiagramUrl(null);"""
    content = content.replace("        setEnvDiagramUrl(null);", catch_replacement, 1)

    # 4. Add to useEffect (ELSE block)
    content = content.replace("      setEnvDiagramUrl(null);", catch_replacement, 1)

    # 5. Sync handling
    sync_replacement = """    setTcDetails(newDetails);

    // Outputs 동기화
    const newOutputs = [...(tcOutputs || [])];
    if (count > newOutputs.length) {
      for (let i = newOutputs.length; i < count; i++) {
        newOutputs.push({ metricName: '', metricFormulaImg: null, resultSummary: '', evidenceCount: 1, evidences: [{ title: '', description: '', images: [] }], metricTarget: '', metricResult: '', metricEvaluation: '' });
      }
    } else {
      newOutputs.splice(count);
    }
    setTcOutputs(newOutputs);
    
    // Expanded 상태 동기화
    const newExpanded = [...(expandedTCs || [])];
    if (count > newExpanded.length) {
      for (let i = newExpanded.length; i < count; i++) {
        newExpanded.push(false);
      }
    } else {
      newExpanded.splice(count);
    }
    setExpandedTCs(newExpanded);
  };"""
    content = content.replace("    setTcDetails(newDetails);\n  };", sync_replacement)

    # 6. Save update
    save_replacement = """      extraData.tcDetails = tcDetails;
      extraData.tcOutputs = tcOutputs;"""
    content = content.replace("      extraData.tcDetails = tcDetails;", save_replacement)

    # 7. Add Handlers before return
    handlers = """  /** TC별 평가산식 업로드 핸들러 */
  const handleMetricFormulaUpload = async (tcIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const newOutputs = [...tcOutputs];
      newOutputs[tcIdx].metricFormulaImg = dataUrl;
      setTcOutputs(newOutputs);
    } catch(err) {}
  };

  /** TC별 개별 증적 이미지 업로드 핸들러 */
  const handleTCEvidenceImageUpload = async (tcIdx: number, evIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const newOutputs = [...tcOutputs];
      if (!newOutputs[tcIdx].evidences[evIdx].images) newOutputs[tcIdx].evidences[evIdx].images = [];
      newOutputs[tcIdx].evidences[evIdx].images.push({ url: dataUrl, caption: '' });
      if (newOutputs[tcIdx].evidences[evIdx].images.length > 4) {
        newOutputs[tcIdx].evidences[evIdx].images.splice(4);
      }
      setTcOutputs(newOutputs);
    } catch(err) {}
  };

  /** TC별 증적 개수 변경 핸들러 */
  const handleTCEvidenceCountChange = (tcIdx: number, count: number) => {
    const newOutputs = [...tcOutputs];
    newOutputs[tcIdx].evidenceCount = count;
    const currentEvs = newOutputs[tcIdx].evidences;
    if (count > currentEvs.length) {
      for(let i = currentEvs.length; i < count; i++) {
        currentEvs.push({ title: '', description: '', images: [] });
      }
    } else {
      currentEvs.splice(count);
    }
    setTcOutputs(newOutputs);
  };

  if (loading) {"""
    content = content.replace("  if (loading) {", handlers)


    # 8. Add imports if needed. We might need ChevronDown, ChevronUp from lucide-react.
    content = content.replace("import { UploadCloud, Image as ImageIcon, Monitor, Save }", "import { UploadCloud, Image as ImageIcon, Monitor, Save, ChevronDown, ChevronRight, PlusCircle, Trash2 }")

    # 9. UI Insertion
    target_ui_anchor = """          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>"""
    
    new_ui = """
          {/* 0-5. TC별 시험결과 섹션 */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2rem' }}>
            <SectionHeader title="시험결과" />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tcOutputs?.map((tcOut, idx) => (
                <div key={`tc-res-${idx}`} style={{ border: '2px solid #000', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                  
                  {/* 아코디언 헤더 */}
                  <div 
                    onClick={() => {
                      const newExpanded = [...expandedTCs];
                      newExpanded[idx] = !newExpanded[idx];
                      setExpandedTCs(newExpanded);
                    }}
                    style={{ background: '#f1f5f9', padding: '12px 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--kaic-navy)', fontSize: '1.1rem' }}>[TC {idx + 1}]</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{tcMethods[idx]?.category || '(시험대상 항목)'}</span>
                    </div>
                    <div>
                      {expandedTCs[idx] ? <ChevronDown size={24} color="#64748b" /> : <ChevronRight size={24} color="#64748b" />}
                    </div>
                  </div>

                  {/* 아코디언 본문 */}
                  {expandedTCs[idx] && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #cbd5e1' }}>
                      
                      {/* 소제목: 시험방법 */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '12px', fontWeight: 800, borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>시험방법</div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                          <div style={{ marginBottom: '8px', display: 'flex' }}>
                            <span style={{ fontWeight: 700, width: '60px', color: '#475569' }}>1) 목적 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', color: '#334155' }}>
                              {tcDetails[idx]?.method || '(시험 세부항목 및 방법에서 입력한 내용이 없습니다)'}
                            </span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ fontWeight: 700, width: '60px', color: '#475569' }}>2) 규격 :</span>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap', color: '#334155' }}>
                              {tcMethods[idx]?.standard || '(시험방법 표에서 입력한 규격이 없습니다)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 소제목: 시험지표 */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '12px', fontWeight: 800, borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>시험지표</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontWeight: 700, width: '100px', color: '#475569' }}>1) 평가지표 :</span>
                          <input 
                            className="input-field"
                            value={tcOut.metricName}
                            onChange={(e) => {
                              const newOut = [...tcOutputs];
                              newOut[idx].metricName = e.target.value;
                              setTcOutputs(newOut);
                            }}
                            placeholder="예: Accuracy"
                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, width: '100px', color: '#475569', paddingTop: '8px' }}>2) 평가산식 :</span>
                          <div style={{ flex: 1 }}>
                            {tcOut.metricFormulaImg ? (
                              <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', padding: '10px', background: '#fff' }}>
                                <img src={tcOut.metricFormulaImg} alt="평가산식" style={{ maxWidth: '100%', maxHeight: '200px', display: 'block' }} />
                                <button
                                  onClick={() => {
                                    const newOut = [...tcOutputs];
                                    newOut[idx].metricFormulaImg = null;
                                    setTcOutputs(newOut);
                                  }}
                                  style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem' }}
                                >삭제</button>
                              </div>
                            ) : (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '20px 40px', borderRadius: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.9rem' }}>
                                <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleMetricFormulaUpload(idx, e)} />
                                <UploadCloud size={20} /> 산식 이미지 업로드
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 소제목: 시험결과 */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '12px', fontWeight: 800, borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>시험결과</div>
                        <input 
                          className="input-field"
                          value={tcOut.resultSummary}
                          onChange={(e) => {
                            const newOut = [...tcOutputs];
                            newOut[idx].resultSummary = e.target.value;
                            setTcOutputs(newOut);
                          }}
                          placeholder="예: [목표 95% 이상 / 시험 100%]"
                          style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}
                        />
                      </div>

                      {/* 소제목: 증적 */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 800, borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>증적</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>증적 개수 선택:</span>
                            <select 
                              value={tcOut.evidenceCount}
                              onChange={(e) => handleTCEvidenceCountChange(idx, Number(e.target.value))}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              {[...Array(10)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}개</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {tcOut.evidences?.slice(0, tcOut.evidenceCount).map((ev: any, evIdx: number) => (
                            <div key={`ev-${idx}-${evIdx}`} style={{ border: '1.5px solid #000', background: '#fff' }}>
                              <div style={{ background: '#f1f5f9', display: 'flex' }}>
                                <div style={{ borderRight: '1.5px solid #000', padding: '12px', width: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, textAlign: 'center' }}>
                                  세부 시험 {evIdx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <input 
                                    value={ev.title}
                                    onChange={(e) => {
                                      const newOut = [...tcOutputs];
                                      newOut[idx].evidences[evIdx].title = e.target.value;
                                      setTcOutputs(newOut);
                                    }}
                                    placeholder="시험 제목 입력 (예: 학습 모델 _ 결함 분류 AI 모델 코드)"
                                    style={{ width: '100%', border: 'none', background: 'transparent', padding: '12px', fontSize: '1rem', fontWeight: 700, outline: 'none' }}
                                  />
                                </div>
                              </div>
                              <div style={{ borderTop: '1.5px solid #000', padding: '12px' }}>
                                <textarea 
                                  value={ev.description}
                                  onChange={(e) => {
                                    const newOut = [...tcOutputs];
                                    newOut[idx].evidences[evIdx].description = e.target.value;
                                    setTcOutputs(newOut);
                                  }}
                                  placeholder="시험 결과를 입력하세요 (예: 결함 분류 AI모델 코드를 확인함)"
                                  style={{ width: '100%', border: 'none', background: 'transparent', resize: 'vertical', minHeight: '40px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--kaic-blue)', outline: 'none', padding: 0 }}
                                />
                              </div>
                              
                              {/* 이미지 업로드 영역 (최대 4개) */}
                              <div style={{ borderTop: '1px dashed #cbd5e1', padding: '1rem', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                                {ev.images?.map((img: any, imgIdx: number) => (
                                  <div key={`img-${idx}-${evIdx}-${imgIdx}`} style={{ width: '200px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '140px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                      <img src={img.url} alt="증적" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                      <button 
                                        onClick={() => {
                                          const newOut = [...tcOutputs];
                                          newOut[idx].evidences[evIdx].images.splice(imgIdx, 1);
                                          setTcOutputs(newOut);
                                        }}
                                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      ><Trash2 size={14}/></button>
                                    </div>
                                    <input 
                                      value={img.caption}
                                      onChange={(e) => {
                                        const newOut = [...tcOutputs];
                                        newOut[idx].evidences[evIdx].images[imgIdx].caption = e.target.value;
                                        setTcOutputs(newOut);
                                      }}
                                      placeholder="그림 설명 입력"
                                      style={{ width: '100%', border: 'none', borderTop: '1px solid #e2e8f0', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }}
                                    />
                                  </div>
                                ))}
                                {(!ev.images || ev.images.length < 4) && (
                                  <label style={{ width: '200px', height: '175px', flexShrink: 0, border: '2px dashed #cbd5e1', borderRadius: '4px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleTCEvidenceImageUpload(idx, evIdx, e)} />
                                    <PlusCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                    <span style={{ fontSize: '0.85rem' }}>사진 추가 ({ev.images?.length || 0}/4)</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 소제목: TC 시험결과 표 */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '12px', fontWeight: 800, borderLeft: '4px solid var(--kaic-blue)', paddingLeft: '8px' }}>
                          TC {idx + 1} 시험결과 요약표
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', textAlign: 'center' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>성능지표</th>
                              <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>성능목표</th>
                              <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>시험결과</th>
                              <th style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem', width: '25%' }}>평가</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '12px', background: '#fff', color: 'var(--kaic-blue)', fontWeight: 600 }}>
                                {tcOut.metricName || '(지표 미입력)'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', background: '#fff' }}>
                                <input 
                                  value={tcOut.metricTarget}
                                  onChange={(e) => {
                                    const newOut = [...tcOutputs];
                                    newOut[idx].metricTarget = e.target.value;
                                    setTcOutputs(newOut);
                                  }}
                                  placeholder="예: 95% 이상"
                                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.95rem', outline: 'none' }}
                                />
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', background: '#fff' }}>
                                <input 
                                  value={tcOut.metricResult}
                                  onChange={(e) => {
                                    const newOut = [...tcOutputs];
                                    newOut[idx].metricResult = e.target.value;
                                    setTcOutputs(newOut);
                                  }}
                                  placeholder="예: 100%"
                                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.95rem', outline: 'none' }}
                                />
                              </td>
                              <td style={{ border: '1px solid #000', padding: '8px', background: '#fff' }}>
                                <input 
                                  value={tcOut.metricEvaluation}
                                  onChange={(e) => {
                                    const newOut = [...tcOutputs];
                                    newOut[idx].metricEvaluation = e.target.value;
                                    setTcOutputs(newOut);
                                  }}
                                  placeholder="예: 달성"
                                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.95rem', fontWeight: 700, outline: 'none' }}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>"""
          
    content = content.replace(target_ui_anchor, new_ui)

    with open('src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    insert_code()
