"use client";

import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>WhatsApp CRM</div>
        <div className={styles.navLinks}>
          <Link href="/login" className={styles.loginButton}>
            Já tenho acesso
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Escale suas vendas no WhatsApp de forma <span className={styles.highlight}>Oficial</span>.
          </h1>
          <p className={styles.subtitle}>
            CRM completo integrado com a API Oficial da Meta. 
            Gerencie equipes, dispare campanhas aprovadas e organize seus leads em tempo real.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/login" className={styles.primaryButton}>
              Começar Agora
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <a href="#recursos" className={styles.secondaryButton}>
              Ver Recursos
            </a>
          </div>
        </div>

        {/* Mockup Preview */}
        <div className={styles.mockupContainer}>
          <div className={styles.mockup}>
            <div className={styles.mockupHeader}>
              <div className={styles.dots}>
                <span></span><span></span><span></span>
              </div>
              <div className={styles.mockupTitle}>crm.whatsapp.com</div>
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupSidebar}></div>
              <div className={styles.mockupMain}>
                <div className={styles.mockupCard}></div>
                <div className={styles.mockupCard}></div>
                <div className={styles.mockupCard}></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="recursos" className={styles.features}>
        <h2 className={styles.sectionTitle}>Tudo que sua equipe precisa</h2>
        <div className={styles.grid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>✅</div>
            <h3>Templates Oficiais</h3>
            <p>Sincronize e dispare templates aprovados diretamente da sua conta Meta Business.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Múltiplas Equipes</h3>
            <p>Organize seus atendentes em times e distribua os leads automaticamente (Sequência Inicial).</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Importação Avançada</h3>
            <p>Suba planilhas CSV complexas com nosso mapeador visual inteligente de colunas.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Chat em Tempo Real</h3>
            <p>Comunicação instantânea com WebSockets. Saiba quem está atendendo quem.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3>WhatsApp CRM</h3>
            <p>Transformando conversas em conversões.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Política de Privacidade</Link>
          </div>
        </div>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} WhatsApp CRM. Desenvolvido para Vendas.
        </div>
      </footer>
    </div>
  );
}
