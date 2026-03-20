import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        navigate('/admin/ai');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (e) {
      setError('无法连接服务器。请确认后端已启动：在项目目录执行 cd server && npm run dev');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-md p-8 rounded-lg" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>AI 管理后台</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              placeholder="请输入用户名"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              placeholder="请输入密码"
            />
          </div>
          {error && (
            <p className="mb-4 text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded text-sm font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};
