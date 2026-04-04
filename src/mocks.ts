

// --- Types ---
export type Role = 'ADMIN' | 'TESTER' | 'TECH_MGR' | 'QUAL_MGR' | 'PENDING' | 'GUEST' | 'RESIGNED';

export interface User {
  id: string; // Login ID
  pw: string;
  email: string;
  phone: string;
  role: Role;
  name: string;
}

export type TestStatus = 'RECEIVED' | 'TESTING' | 'PROGRESS' | 'COMPLETED';

export interface ConsultationHistory {
  date: string;
  oldText: string;
  modifierId: string;
}

export interface Evidence {
  id: string;
  filename: string;
  fileType: string;
  date: string;
  uploaderId: string;
  dataUrl?: string;
}

export interface Consultation {
  id: string;
  text: string;
  date: string;
  authorId: string;
  history: ConsultationHistory[];
}

export interface TestSchedule {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  locationType: 'FIXED_LAB' | 'ON_SITE' | '';
  locationDetail: string;
  testType: 'GENERAL' | 'KOLAS' | '';
}

export interface TestReception {
  id: string; // KAIC_YYYYMMDD_001
  date: string;
  client: string;
  clientName: string;
  phone: string;
  email: string;
  content: string; // 2000 chars
  consultation: string; // 2000 chars
  isLocked: boolean;
  assignedTesterId: string | null;
  status: TestStatus;
  
  // Test Details
  testId?: string; // e.g. KAIC_20260401_004_04011010_001
  consultations?: Consultation[];
  schedule?: TestSchedule;
  evidences?: Evidence[];
}

// --- Initial Mock Data ---
const DEFAULT_USERS: User[] = [
  { id: 'admin', pw: 'admin', email: 'admin@kaic.kr', phone: '010-0000-0000', role: 'ADMIN', name: '슈퍼관리자' },
  { id: 'tester1', pw: '1234', email: 't1@kaic.kr', phone: '010-1111-1111', role: 'TESTER', name: '홍길동 시험원' },
];

const DEFAULT_RECEPTIONS: TestReception[] = [
  {
    id: 'KAIC_20241120_001',
    date: '2024-11-20 10:00:00',
    client: '대한은행',
    clientName: '김철수 부장',
    phone: '010-9999-9999',
    email: 'kcs@bank.com',
    content: '금융 앱 보안 취약점 사전 점검 의뢰',
    consultation: '11/30까지 빠른 성적서 발급 요망',
    isLocked: true,
    assignedTesterId: 'tester1',
    status: 'TESTING'
  }
];

// LocalStorage helpers
const getStorage = <T>(key: string, defaultVal: T): T => {
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : defaultVal;
};

const setStorage = <T>(key: string, val: T) => {
  localStorage.setItem(key, JSON.stringify(val));
};

let USERS: User[] = getStorage('kaic_users', DEFAULT_USERS);
let RECEPTIONS: TestReception[] = getStorage('kaic_receptions', DEFAULT_RECEPTIONS);
let NOTIFICATIONS: { userId: string, msg: string, time: string, read: boolean }[] = getStorage('kaic_notifications', []);

// Function to update local storage whenever data changes
const persistData = () => {
  setStorage('kaic_users', USERS);
  setStorage('kaic_receptions', RECEPTIONS);
  setStorage('kaic_notifications', NOTIFICATIONS);
};

// --- Mock API Helpers ---

export const MockAPI = {
  getUsers: () => USERS,
  
  register: (user: Omit<User, 'role' | 'name'>) => {
    if (USERS.find(u => u.id === user.id)) throw new Error('Already exists');
    USERS.push({ ...user, role: 'PENDING', name: `${user.id} 님` });
    persistData();
  },
  
  login: (id: string, pw: string) => {
    const u = USERS.find(u => u.id === id && u.pw === pw);
    if (!u) throw new Error('Invalid credentials');
    if (u.role === 'PENDING') throw new Error('관리자 승인 대기중입니다.');
    if (u.role === 'RESIGNED') throw new Error('퇴사 처리된 계정입니다. 해당 계정으로는 로그인할 수 없습니다.');
    return u;
  },

  updateRole: (id: string, role: Role) => {
    USERS = USERS.map(u => u.id === id ? { ...u, role } : u);
    persistData();
  },

  getReceptions: () => RECEPTIONS,

  createReception: (rec: Omit<TestReception, 'id' | 'date' | 'isLocked' | 'assignedTesterId' | 'status'>) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const count = RECEPTIONS.filter(r => r.id.includes(dateStr)).length + 1;
    const seq = String(count).padStart(3, '0');
    
    const newRec: TestReception = {
      ...rec,
      id: `KAIC_${dateStr}_${seq}`,
      date: new Date().toLocaleString('ko-KR'),
      isLocked: true,
      assignedTesterId: null,
      status: 'RECEIVED'
    };
    RECEPTIONS = [newRec, ...RECEPTIONS];
    persistData();
    return newRec;
  },

  assignTester: (receptionId: string, testerId: string) => {
    RECEPTIONS = RECEPTIONS.map(r => r.id === receptionId ? { ...r, assignedTesterId: testerId, status: 'TESTING' } : r);
    // Push notification
    NOTIFICATIONS.push({
      userId: testerId,
      msg: `새로운 시험 [${receptionId}]이(가) 귀하에게 배정되었습니다.`,
      time: new Date().toLocaleTimeString('ko-KR'),
      read: false
    });
    persistData();
  },

  updateReceptionStatus: (receptionId: string, status: TestStatus) => {
    RECEPTIONS = RECEPTIONS.map(r => r.id === receptionId ? { ...r, status } : r);
    persistData();
  },

  createTestId: (receptionId: string) => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const hh = String(today.getHours()).padStart(2, '0');
    const min = String(today.getMinutes()).padStart(2, '0');
    const mmddhhmm = `${mm}${dd}${hh}${min}`;
    
    // 순차 증가하는 번호 _001 (현재 1접수 = 1채번)
    const newTestId = `${receptionId}_${mmddhhmm}_001`;
    RECEPTIONS = RECEPTIONS.map(r => r.id === receptionId ? { 
      ...r, 
      testId: newTestId, 
      consultations: [], 
      evidences: [],
      schedule: { startDate: '', endDate: '', startTime: '', endTime: '', locationType: '', locationDetail: '', testType: '' } 
    } : r);
    persistData();
    return newTestId;
  },

  addConsultation: (receptionId: string, text: string, authorId: string) => {
    RECEPTIONS = RECEPTIONS.map(r => {
      if (r.id === receptionId) {
        const newConsults = [...(r.consultations || [])];
        newConsults.push({
          id: Date.now().toString(),
          text,
          date: new Date().toLocaleString('ko-KR'),
          authorId,
          history: []
        });
        return { ...r, consultations: newConsults };
      }
      return r;
    });
    persistData();
  },

  updateConsultation: (receptionId: string, consultId: string, newText: string, modifierId: string) => {
    RECEPTIONS = RECEPTIONS.map(r => {
      if (r.id === receptionId) {
        const newConsults = (r.consultations || []).map(c => {
          if (c.id === consultId && c.text !== newText) {
            return {
              ...c,
              text: newText,
              history: [...c.history, { date: new Date().toLocaleString('ko-KR'), oldText: c.text, modifierId }]
            };
          }
          return c;
        });
        return { ...r, consultations: newConsults };
      }
      return r;
    });
    persistData();
  },

  updateTestSchedule: (receptionId: string, schedule: TestSchedule) => {
    RECEPTIONS = RECEPTIONS.map(r => r.id === receptionId ? { ...r, schedule } : r);
    persistData();
  },

  addEvidence: (receptionId: string, filename: string, fileType: string, uploaderId: string, dataUrl?: string) => {
    RECEPTIONS = RECEPTIONS.map(r => {
      if (r.id === receptionId) {
        const newEvidences = [...(r.evidences || [])];
        newEvidences.push({
          id: Date.now().toString(),
          filename,
          fileType,
          date: new Date().toLocaleString('ko-KR'),
          uploaderId,
          dataUrl
        });
        return { ...r, evidences: newEvidences };
      }
      return r;
    });
    persistData();
  },

  removeEvidence: (receptionId: string, evidenceId: string) => {
    RECEPTIONS = RECEPTIONS.map(r => {
      if (r.id === receptionId) {
        return { ...r, evidences: (r.evidences || []).filter(ev => ev.id !== evidenceId) };
      }
      return r;
    });
    persistData();
  },

  getNotifications: (userId: string) => NOTIFICATIONS.filter(n => n.userId === userId),
  
  markNotiRead: (userId: string) => {
    NOTIFICATIONS = NOTIFICATIONS.map(n => n.userId === userId ? { ...n, read: true } : n);
    persistData();
  }
};
