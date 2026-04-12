/**
 * @file AuthContext.tsx
 * @description 애플리케이션 전역의 사용자 인증 상태를 관리하는 React Context입니다.
 * 로그인 정보 유지 및 역할(Role) 기반의 접근 제어를 지원합니다.
 */

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

/** 사용자 정보 타입 정의 */
export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'TESTER' | 'TECH_MGR' | 'QUAL_MGR' | 'FIN_MGR';
  email?: string;
}

/** 인증 컨텍스트 데이터 타입 */
interface AuthContextType {
  /** 현재 로그인한 사용자 정보 (null이면 비로그인 상태) */
  user: User | null;
  /** 사용자 로그인 처리 함수 */
  login: (user: User) => void;
  /** 로그아웃 처리 함수 */
  logout: () => void;
}

/** 전역 인증 컨텍스트 생성 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 인증 데이터 제공 컴포넌트
 * App의 최상위에서 컴포넌트 트리에 인증 상태를 주입합니다.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  /** 로그인/로그아웃 처리를 위한 헬퍼 함수 정의 */
  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트를 사용하기 위한 전용 Hook
 * @throws {Error} AuthProvider 외부에서 호출될 경우 에러 발생
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
