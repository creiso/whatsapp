"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/users/me')
        .then((res) => res.json())
        .then((data) => setCurrentUser(data))
        .catch(console.error);
    }
  }, [status]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Carregando...</div>;
  }

  let navItems = [
    { label: 'Visão Geral', path: '/dashboard' },
    { label: 'Feed de Mensagens', path: '/dashboard/chat' },
    { label: 'Campanhas', path: '/dashboard/campaigns' },
    { label: 'Contatos', path: '/dashboard/contacts' },
    { label: 'Equipes & Vendedores', path: '/dashboard/teams' },
    { label: 'Configurações (Meta API)', path: '/dashboard/settings' },
  ];

  if (currentUser?.role === 'AGENT') {
    navItems = navItems.filter(item => item.path === '/dashboard' || item.path === '/dashboard/chat');
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 'bold' }}>
          <img src="/logo.png" alt="LeadMoon Logo" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          LeadMoon
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path ? styles.navItemActive : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={toggleTheme} 
            className={styles.navItem}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className={styles.navItem}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>Dashboard</div>
          <div className={styles.userProfile}>
            {session?.user?.email}
          </div>
        </header>
        
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
