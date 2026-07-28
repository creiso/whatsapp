"use client";

import { useState, useEffect } from 'react';
import styles from './campaigns.module.css';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
  const [selectedExceptions, setSelectedExceptions] = useState<any[]>([]);
  const [newCampaign, setNewCampaign] = useState({ name: '', template: '', listId: '', teamId: '' });
  const [variablesMapping, setVariablesMapping] = useState<Record<string, { type: string, value: string }>>({});
  const [requiredVariables, setRequiredVariables] = useState<{ key: string, componentType: string, varNum: string }[]>([]);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showExceptions = (exceptionsRecord: string | null) => {
    if (!exceptionsRecord) return;
    try {
      const parsed = JSON.parse(exceptionsRecord);
      setSelectedExceptions(parsed);
      setIsExceptionsModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

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

  useEffect(() => {
    Promise.all([fetchCampaigns(), fetchLists(), fetchTemplates(), fetchTeams()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (newCampaign.template) {
      const template = templates.find((t: any) => t.name === newCampaign.template);
      if (template && template.components) {
        let parsedComponents = [];
        try {
          parsedComponents = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
        } catch (e) {}

        const vars: { key: string, componentType: string, varNum: string }[] = [];
        const mapping: Record<string, { type: string, value: string }> = {};
        parsedComponents.forEach((comp: any) => {
          if (comp.text) {
            const matches = comp.text.matchAll(/\{\{(\d+)\}\}/g);
            for (const match of matches) {
              const varNum = match[1];
              const key = `${comp.type.toLowerCase()}_${varNum}`;
              vars.push({ key, componentType: comp.type.toLowerCase(), varNum });
              if (!variablesMapping[key]) {
                mapping[key] = { type: 'name', value: '' };
              } else {
                mapping[key] = variablesMapping[key];
              }
            }
          }
        });
        setRequiredVariables(vars);
        setVariablesMapping(mapping);
      } else {
        setRequiredVariables([]);
      }
    } else {
      setRequiredVariables([]);
    }
  }, [newCampaign.template, templates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCampaign,
        variablesRecord: Object.keys(variablesMapping).length > 0 ? JSON.stringify(variablesMapping) : null
      };
      
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast('Campanha criada com sucesso!', 'success');
        setIsModalOpen(false);
        setNewCampaign({ name: '', template: '', listId: '', teamId: '' });
        setVariablesMapping({});
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
                <div className={styles.stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span className={styles.statLabel}>EXCEÇÕES</span>
                  <span className={`${styles.statValue} ${styles.statError}`}>{campaign.errors || 0}</span>
                  {(campaign.errors > 0 && campaign.exceptionsRecord) && (
                    <button 
                      onClick={() => showExceptions(campaign.exceptionsRecord)}
                      style={{ marginTop: '4px', fontSize: '11px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                      Ver Motivos
                    </button>
                  )}
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

      {isExceptionsModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h2>Lista de Exceções</h2>
              <button className={styles.closeButton} onClick={() => setIsExceptionsModalOpen(false)}>×</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
              {selectedExceptions.length === 0 ? (
                <p>Nenhuma exceção registrada.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedExceptions.map((exc, idx) => (
                    <li key={idx} style={{ background: 'rgba(255,0,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,0,0,0.1)' }}>
                      <div style={{ marginBottom: '8px' }}><strong>Contato:</strong> {exc.name || 'Desconhecido'} ({exc.phone})</div>
                      <div style={{ fontSize: '13px', color: '#ef4444', background: '#fff', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', overflowX: 'auto' }}>
                        {typeof exc.error === 'object' ? JSON.stringify(exc.error, null, 2) : exc.error}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.buttonPrimary} onClick={() => setIsExceptionsModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
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
              {requiredVariables.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Mapeamento de Variáveis</label>
                  {requiredVariables.map((v, i) => (
                    <div key={`${v.key}-${i}`} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <span style={{ minWidth: '80px', fontSize: '0.875rem' }}>{v.key}</span>
                      <select 
                        className={styles.select}
                        value={variablesMapping[v.key]?.type || 'name'}
                        onChange={(e) => setVariablesMapping({
                          ...variablesMapping,
                          [v.key]: { type: e.target.value, value: variablesMapping[v.key]?.value || '' }
                        })}
                        style={{ flex: 1 }}
                      >
                        <option value="name">Nome do Contato</option>
                        <option value="phone">Telefone</option>
                        <option value="custom">Campo Personalizado da Planilha</option>
                        <option value="manual">Texto Fixo</option>
                      </select>
                      {(variablesMapping[v.key]?.type === 'custom' || variablesMapping[v.key]?.type === 'manual') && (
                        <input
                          type="text"
                          className={styles.input}
                          placeholder={variablesMapping[v.key]?.type === 'custom' ? 'Nome da Coluna' : 'Texto'}
                          value={variablesMapping[v.key]?.value || ''}
                          onChange={(e) => setVariablesMapping({
                            ...variablesMapping,
                            [v.key]: { ...variablesMapping[v.key], value: e.target.value }
                          })}
                          style={{ flex: 1 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
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
