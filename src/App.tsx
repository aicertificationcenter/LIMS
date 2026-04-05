
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
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            
            <Route path="admin" element={<AdminAuth />} />
            <Route path="reception" element={<Reception />} />
            <Route path="my-tests" element={<MyTests />} />
            <Route path="stats" element={<Stats />} />
            <Route path="reports" element={<Reports />} />
            <Route path="clients" element={<Clients />} />
            
            {/* Catch All */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
