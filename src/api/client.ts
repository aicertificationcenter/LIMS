/**
 * KAIC-LIMS API Client
 */

const API_BASE = '/api';

export const apiClient = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: '알 수 없는 오류가 발생했습니다.' }));
      throw new Error(error.message || '요청 처리에 실패했습니다.');
    }

    return res.json();
  },

  auth: {
    login: (id: string, pw: string) => 
      apiClient.fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ id, pw }),
      }),
    register: (userData: any) => 
      apiClient.fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
  },

  users: {
    list: () => apiClient.fetch('/users'),
  },

  notifications: {
    list: (userId: string) => apiClient.fetch(`/notifications?userId=${userId}`),
    markAsRead: (userId: string) => 
      apiClient.fetch(`/notifications?userId=${userId}`, {
        method: 'PATCH',
      }),
  },

  tests: {
    listMyTasks: (testerId: string) => apiClient.fetch(`/tests?testerId=${testerId}`),
  },

  consultations: {
    list: (sampleId: string) => apiClient.fetch(`/consultations?sampleId=${sampleId}`),
    create: (data: { sampleId: string; authorId: string; message: string }) => 
      apiClient.fetch('/consultations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { message: string; authorId: string }) =>
      apiClient.fetch('/consultations', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...data }),
      }),
  },

  evidences: {
    list: (sampleId: string) => apiClient.fetch(`/evidences?sampleId=${sampleId}`),
    create: (data: { sampleId: string; uploaderId: string; fileName: string; fileType: string; dataUrl: string }) => 
      apiClient.fetch('/evidences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => 
      apiClient.fetch('/evidences', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      }),
  },

  receptions: {
    list: () => apiClient.fetch('/receptions'),
    create: (data: any) => 
      apiClient.fetch('/receptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assign: (id: string, testerId: string) =>
      apiClient.fetch('/receptions', {
        method: 'PATCH',
        body: JSON.stringify({ id, testerId }),
      }),
  },

  invoices: {
    list: () => apiClient.fetch('/invoices'),
    create: (data: any) => 
      apiClient.fetch('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  }
};
