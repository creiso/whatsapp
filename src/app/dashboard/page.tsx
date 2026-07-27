import styles from './page.module.css';

export default function DashboardOverview() {
  return (
    <div className={styles.container}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Visão Geral</h1>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Bem-vindo ao painel administrativo do WhatsApp CRM.</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Total de Contatos</div>
          <div className={styles.statValue}>0</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Campanhas Ativas</div>
          <div className={styles.statValue}>0</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Vendedores Online</div>
          <div className={styles.statValue}>0</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Mensagens Hoje</div>
          <div className={styles.statValue}>0</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Atividade Recente</h2>
        <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
          Nenhuma atividade registrada ainda.
        </div>
      </div>
    </div>
  );
}
