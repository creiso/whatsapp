"use client";

import { useState } from 'react';
import styles from './campaigns.module.css';

const MOCK_CAMPAIGNS = [
  {
    id: '1',
    name: 'Black Friday 2026',
    status: 'RUNNING',
    template: 'promocao_bf_v1',
    team: 'Equipe de Vendas 1',
    sent: 1450,
    delivered: 1420,
    errors: 30, // User is not on WhatsApp / Exceções
    total: 5000
  },
  {
    id: '2',
    name: 'Reativação de Clientes Antigos',
    status: 'COMPLETED',
    template: 'reativacao_saudades',
    team: 'Retenção',
    sent: 500,
    delivered: 480,
    errors: 20,
    total: 500
  },
  {
    id: '3',
    name: 'Lançamento Novo Produto',
    status: 'DRAFT',
    template: 'lancamento_oficial',
    team: 'Lançamentos',
    sent: 0,
    delivered: 0,
    errors: 0,
    total: 12000
  }
];

export default function CampaignsPage() {
  const [campaigns] = useState(MOCK_CAMPAIGNS);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className={`${styles.statusBadge} ${styles.statusRunning}`}>EM ANDAMENTO</span>;
      case 'DRAFT':
        return <span className={`${styles.statusBadge} ${styles.statusDraft}`}>RASCUNHO</span>;
      case 'COMPLETED':
        return <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>CONCLUÍDO</span>;
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Disparos e Campanhas</h1>
        <button className={styles.buttonPrimary}>+ Nova Campanha</button>
      </div>

      <div className={styles.grid}>
        {campaigns.map(campaign => (
          <div key={campaign.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.campaignName}>{campaign.name}</div>
              {getStatusBadge(campaign.status)}
            </div>

            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>ENVIADOS</span>
                <span className={styles.statValue}>{campaign.sent} / {campaign.total}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>ENTREGUES</span>
                <span className={styles.statValue}>{campaign.delivered}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>EXCEÇÕES</span>
                <span className={`${styles.statValue} ${styles.statError}`}>{campaign.errors}</span>
              </div>
            </div>

            <div className={styles.details}>
              <div><strong>Template:</strong> {campaign.template}</div>
              <div><strong>Equipe Responsável:</strong> {campaign.team}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
