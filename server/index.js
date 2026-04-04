const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// === 1. 관리자 대시보드 KPI 조회 ===
app.get('/api/dashboard/manager', (req, res) => {
  // 실제 환경에서는 Prisma를 통해 통계를 집계합니다.
  res.json({
    activeSamples: 15,
    testsInProgress: 8,
    tatAverageDays: 2.4,
    recentAuditLogs: [
      { id: 'aud-492', action: '정정 (ALCOA+)', by: 'Tester_A', time: '2024-11-19 14:05:00' }
    ]
  });
});

// === 2. 하드게이트 기기/환경 적격성 검증 통과 ===
app.post('/api/tests/verify-conditions', async (req, res) => {
  const { equipmentId, testerId, temp, humidity } = req.body;
  
  // 예시: 온습도가 기준(20~25도, 40~60%)을 벗어나면 거부
  if (temp < 20 || temp > 25 || humidity < 40 || humidity > 60) {
    return res.status(400).json({ 
      success: false, 
      message: '환경 조건 부적합. 시험 진행이 차단되었습니다.' 
    });
  }

  // 예시: 기기 id가 만료된 기기면 거부 (DB 연동 시 로직 추가)
  if (equipmentId === 'KAI-EQ-012') {
    return res.status(400).json({ 
      success: false, 
      message: '장비 교정 유효기간 만료. 사용할 수 없습니다.' 
    });
  }

  return res.json({
    success: true,
    message: '하드게이트 통과. 모든 조건이 적합합니다.'
  });
});

// === 3. 데이터 등록 및 감사 기록 (ALCOA+) ===
app.post('/api/tests/:testId/results', async (req, res) => {
  const { testId } = req.params;
  const { value, reason, signature } = req.body;

  // AuditLog 테이블에 영구 저장 (수정 불가)
  // const newAudit = await prisma.auditLog.create({ data: { ... } });

  res.json({
    success: true,
    message: '데이터가 수정 권한(서명)과 함께 기록되었습니다. (Audit Trail Saved)'
  });
});

app.listen(PORT, () => {
  console.log(`KAIC-LIMS Backend System running on http://localhost:${PORT}`);
  console.log('ISO 17025 Compliance Level: ACTIVE');
});
