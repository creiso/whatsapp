"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Carregando...</div>;
  }

  const navItems = [
    { label: 'Visão Geral', path: '/dashboard' },
    { label: 'Feed de Mensagens', path: '/dashboard/chat' },
    { label: 'Campanhas', path: '/dashboard/campaigns' },
    { label: 'Contatos', path: '/dashboard/contacts' },
    { label: 'Equipes & Vendedores', path: '/dashboard/teams' },
    { label: 'Configurações (Meta API)', path: '/dashboard/settings' },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          WCRM
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
