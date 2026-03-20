import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/status', { credentials: 'include' });
      const data = await res.json();
      setIsAuthenticated(!!data.authenticated);
    } catch {
      // 后端未启动或请求失败时，视为未认证并跳转登录
      setIsAuthenticated(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      navigate('/admin/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  // 未认证时用 Navigate 跳转登录页，避免空白
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      <header className="h-12 flex items-center justify-between px-4 shrink-0" style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>AI 管理后台</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-xs rounded"
          style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          登出
        </button>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
};
