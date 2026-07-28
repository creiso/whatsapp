"use client";

import { useState, useEffect } from 'react';
import styles from './campaigns.module.css';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', template: '', teamId: '' });
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns', error);
      showToast('Erro ao carregar campanhas', 'error');
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/meta/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchCampaigns(), fetchTeams(), fetchTemplates()]).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      });
      if (res.ok) {
        showToast('Campanha criada com sucesso!', 'success');
        setIsModalOpen(false);
        setNewCampaign({ name: '', template: '', teamId: '' });
        fetchCampaigns();
      } else {
        showToast('Erro ao criar campanha', 'error');
      }
    } catch (error) {
      showToast('Erro ao criar campanha', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        showToast('Campanha excluída com sucesso!', 'success');
        fetchCampaigns();
      } else {
        showToast('Erro ao excluir campanha', 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir campanha', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className={`${styles.statusBadge} ${styles.statusRunning}`}>EM ANDAMENTO</span>;
      case 'DRAFT':
        return <span className={`${styles.statusBadge} ${styles.statusDraft}`}>RASCUNHO</span>;
      case 'COMPLETED':
        return <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>CONCLUÍDO</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.statusDraft}`}>{status}</span>;
    }
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${styles[`toast-${toast.type}`]}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Disparos e Campanhas</h1>
        <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>
          + Nova Campanha
        </button>
      </div>

      {loading ? (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
        </div>
      ) : (
        <div className={styles.grid}>
          {campaigns.map(campaign => (
            <div key={campaign.id} className={styles.card}>
              <button 
                className={styles.deleteButton} 
                onClick={() => handleDelete(campaign.id)}
                title="Excluir campanha"
              >
                🗑️
              </button>
              
              <div className={styles.cardHeader}>
                <div className={styles.campaignName}>{campaign.name}</div>
                {getStatusBadge(campaign.status)}
              </div>

              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>ENVIADOS</span>
                  <span className={styles.statValue}>{campaign.sent || 0} / {campaign.total || 0}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>ENTREGUES</span>
                  <span className={styles.statValue}>{campaign.delivered || 0}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>EXCEÇÕES</span>
                  <span className={`${styles.statValue} ${styles.statError}`}>{campaign.errors || 0}</span>
                </div>
              </div>

              <div className={styles.details}>
                <div><strong>Template:</strong> {campaign.template}</div>
                <div><strong>Equipe Responsável:</strong> {campaign.team?.name || 'Sem Equipe'}</div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className={styles.emptyState}>Nenhuma campanha encontrada.</div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Nova Campanha</h2>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nome da Campanha</label>
                <input 
                  type="text" 
                  value={newCampaign.name} 
                  onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  required 
                  className={styles.input}
                  placeholder="Ex: Black Friday"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Template</label>
                <select 
                  value={newCampaign.template} 
                  onChange={e => setNewCampaign({...newCampaign, template: e.target.value})}
                  required 
                  className={styles.select}
                >
                  <option value="">Selecione um template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.name}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Equipe</label>
                <select 
                  value={newCampaign.teamId} 
                  onChange={e => setNewCampaign({...newCampaign, teamId: e.target.value})}
                  required
                  className={styles.select}
                >
                  <option value="">Selecione uma equipe</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.buttonSecondary} onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.buttonPrimary}>
                  Criar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
