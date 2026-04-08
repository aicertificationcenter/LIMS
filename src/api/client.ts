/**
 * @file client.ts
 * @description KAIC-LIMS 서비스의 백엔드 통신을 담당하는 중앙 집중식 API 클라이언트 모듈입니다.
 * Fetch API를 기반으로 하며, 모든 요청은 JSON 형식을 기본으로 합니다.
 */

/** API 서버의 기본 경로 (프록시 설정에 따라 변경될 수 있음) */
const API_BASE = '/api';

/**
 * 전역 API 클라이언트 객체
 */
export const apiClient = {
  /**
   * 공통 Fetch 래퍼 함수
   * @param endpoint API 엔드포인트 경로
   * @param options Fetch 옵션 (Method, Body, Headers 등)
   * @returns 파싱된 JSON 응답
   * @throws API 오류 발생 시 알림용 에러 객체
   */
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // 응답 상태 코드가 정상이 아닐 경우 에러 처리
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: '알 수 없는 오류가 발생했습니다.' }));
      throw new Error(error.message || '요청 처리에 실패했습니다.');
    }

    return res.json();
  },

  /** 사용자 인증 관련 API */
  auth: {
    /** 관리자/시험원 로그인 */
    login: (id: string, pw: string) => 
      apiClient.fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ id, pw }),
      }),
    /** 신규 사용자(시험원) 등록 */
    register: (userData: any) => 
      apiClient.fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
  },

  /** 사용자 관리 관련 API */
  users: {
    /** 전체 사용자 목록 조회 (관리자 전용) */
    list: () => apiClient.fetch('/users'),
  },

  /** 알림 메시지 관련 API */
  notifications: {
    /** 특정 사용자의 읽지 않은 알림 조회 */
    list: (userId: string) => apiClient.fetch(`/notifications?userId=${userId}`),
    /** 모든 알림을 읽음 상태로 변경 */
    markAsRead: (userId: string) => 
      apiClient.fetch(`/notifications?userId=${userId}`, {
        method: 'PATCH',
      }),
  },

  /** 시험 업무 관련 API */
  tests: {
    /** 로그인한 시험원에게 할당된 작업 목록 조회 */
    listMyTasks: (testerId: string) => apiClient.fetch(`/tests?testerId=${testerId}`),
  },

  /** 시험 상담 기록 관련 API */
  consultations: {
    /** 특정 접수 건에 대한 상담 이력 열람 */
    list: (sampleId: string) => apiClient.fetch(`/consultations?sampleId=${sampleId}`),
    /** 신규 상담 내용 등록 */
    create: (data: { sampleId: string; authorId: string; message: string }) => 
      apiClient.fetch('/consultations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    /** 기존 상담 기록 수정 */
    update: (id: string, data: { message: string; authorId: string }) =>
      apiClient.fetch('/consultations', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...data }),
      }),
  },

  /** 증적 자료(파일) 관리 API */
  evidences: {
    /** 특정 시험 건에 업로드된 파일 목록 조회 */
    list: (sampleId: string) => apiClient.fetch(`/evidences?sampleId=${sampleId}`),
    /** 시험 증적 자료(이미지/PDF 등) 업로드 */
    create: (data: { sampleId: string; uploaderId: string; fileName: string; fileType: string; dataUrl: string }) => 
      apiClient.fetch('/evidences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    /** 업로드된 증적 자료 삭제 */
    delete: (id: string) => 
      apiClient.fetch('/evidences', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      }),
  },

  /** 접수 내역 및 시험원 배정 관리 API */
  receptions: {
    /** 전체 상담/접수 목록 조회 */
    list: () => apiClient.fetch('/receptions'),
    /** 신규 상담/접수 내역 등록 */
    create: (data: any) => 
      apiClient.fetch('/receptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    /** 특정 접수 건에 시험원 배정 및 상태 변경 */
    assign: (id: string, testerId: string) =>
      apiClient.fetch('/receptions', {
        method: 'PATCH',
        body: JSON.stringify({ id, testerId }),
      }),
  },

  /** 인보이스(발행 내역) 관리 API */
  invoices: {
    /** 발급된 모든 인보이스 목록 조회 */
    list: () => apiClient.fetch('/invoices'),
    /** 접수 건에 대한 정식 인보이스 발행 */
    create: (data: any) => 
      apiClient.fetch('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  }
};
