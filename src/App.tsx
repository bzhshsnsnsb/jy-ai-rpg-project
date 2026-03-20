import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AIAdminPage } from './pages/admin/AIAdminPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/ai" element={<AdminLayout><AIAdminPage /></AdminLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
