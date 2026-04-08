/**
 * @file App.tsx
 * @description KAIC-LIMS 애플리케이션의 메인 진입점 컴포넌트입니다.
 * 라우팅 구성, 글로벌 컨텍스트(AuthProvider) 주입 및 레이아웃 구조를 정의합니다.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminAuth } from './pages/AdminAuth';
import { Reception } from './pages/Reception';
import { MyTests } from './pages/MyTests';
import { Stats } from './pages/Stats';
import { Reports } from './pages/Reports';
import { Clients } from './pages/Clients';
import { Invoices } from './pages/Invoices';
import './App.css';

/**
 * 전역 애플리케이션 컴포넌트
 * @returns {JSX.Element} 라우팅된 전체 앱 구조
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공통 레이아웃을 포함한 라우트 그룹 */}
          <Route path="/" element={<Layout />}>
            {/* 초기 접속 시 로그인 페이지로 리다이렉트 */}
            <Route index element={<Navigate to="/login" />} />
            
            {/* 인증 및 계정 관련 */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            
            {/* 업무 관리 섹션 */}
            <Route path="admin" element={<AdminAuth />} />      {/* 관리자 대시보드 */}
            <Route path="reception" element={<Reception />} />  {/* 접수 및 시험원 배정 */}
            <Route path="my-tests" element={<MyTests />} />    {/* 나의 할당 시험 관리 */}
            <Route path="stats" element={<Stats />} />          {/* 통계 및 대시보드 */}
            <Route path="reports" element={<Reports />} />      {/* 성적서 발급 관리 */}
            <Route path="clients" element={<Clients />} />      {/* 의뢰 기관 정보 관리 */}
            <Route path="invoices" element={<Invoices />} />    {/* 인보이스/견적서 발행 */}
            
            {/* 정의되지 않은 경로 접근 시 로그인으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
