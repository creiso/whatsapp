"use client";

import { useState, useEffect } from 'react';
import styles from './campaigns.module.css';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', template: '', listId: '' });
  
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

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error('Error fetching lists', error);
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
    Promise.all([fetchCampaigns(), fetchLists(), fetchTemplates()]).finally(() => setLoading(false));
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
        setNewCampaign({ name: '', template: '', listId: '' });
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

  const handleStartCampaign = async (id: string) => {
    try {
      showToast('Iniciando disparo...', 'success');
      const res = await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('Disparo concluído!', 'success');
        fetchCampaigns();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao iniciar campanha', 'error');
        fetchCampaigns();
      }
    } catch (error) {
      showToast('Erro ao iniciar campanha', 'error');
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

              {campaign.status === 'DRAFT' && (
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <button 
                    className={styles.buttonPrimary} 
                    style={{ width: '100%', padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => handleStartCampaign(campaign.id)}
                  >
                    ▶ Iniciar Disparo
                  </button>
                </div>
              )}

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
                <div><strong>Público-Alvo (Lista):</strong> {campaign.list?.name || 'Sem Lista'}</div>
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
                <label>Lista (Público-Alvo)</label>
                <select 
                  value={newCampaign.listId} 
                  onChange={e => setNewCampaign({...newCampaign, listId: e.target.value})}
                  required
                  className={styles.select}
                >
                  <option value="">Selecione uma lista</option>
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
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
