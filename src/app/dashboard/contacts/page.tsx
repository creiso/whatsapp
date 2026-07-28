"use client";

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import styles from './contacts.module.css';

type Contact = {
  id: string;
  name: string | null;
  phone: string;
  attributes: string | null;
  createdAt: string;
  status: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mapping Modal State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSampleData, setCsvSampleData] = useState<string[]>([]);
  const [mappedPhone, setMappedPhone] = useState<string>('');
  const [mappedName, setMappedName] = useState<string>('');
  const [mappedCustom, setMappedCustom] = useState<{key: string, index: string}[]>([]);
  const [listName, setListName] = useState<string>('');
  const [importTeamId, setImportTeamId] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);

  // Modal Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      showToast('Erro ao carregar contatos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este contato?')) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setContacts(contacts.filter(c => c.id !== id));
      showToast('Contato excluído com sucesso', 'success');
    } catch {
      showToast('Erro ao excluir contato', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) {
      showToast('Telefone é obrigatório', 'error');
      return;
    }
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });
      if (!res.ok) throw new Error();
      const newContact = await res.json();
      setContacts([newContact, ...contacts]);
      setIsModalOpen(false);
      setNewName('');
      setNewPhone('');
      showToast('Contato criado com sucesso', 'success');
    } catch {
      showToast('Erro ao criar contato. Verifique se o telefone já existe.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      
      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays, defalval: '' ensures empty cells aren't skipped
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (rows.length < 2) {
          showToast('A planilha deve conter pelo menos um cabeçalho e uma linha de dados', 'error');
          return;
        }
        
        const headers = rows[0].map(String);
        const sample = rows[1] ? rows[1].map(String) : [];
        
        let phoneIdx = '';
        let nameIdx = '';
        const custom: {key: string, index: string}[] = [];
        
        headers.forEach((header, index) => {
          if (/(telefone|phone|cel|whatsapp)/i.test(header) && !phoneIdx) {
            phoneIdx = index.toString();
          } else if (/(nome|name)/i.test(header) && !nameIdx) {
            nameIdx = index.toString();
          } else {
            custom.push({ key: header, index: index.toString() });
          }
        });

        setCsvHeaders(headers);
        setCsvSampleData(sample);
        // Save the rest of the rows, converting all cells to string
        const dataRows = rows.slice(1).filter(r => r.some(c => c !== '')).map(r => r.map(String));
        setCsvData(dataRows);
        setMappedPhone(phoneIdx);
        setMappedName(nameIdx);
        setMappedCustom(custom);
        setIsMappingModalOpen(true);
      } catch (err) {
        showToast('Erro ao ler a planilha. Tente novamente.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    setIsMappingModalOpen(false);

    if (!mappedPhone) {
      showToast('O campo Telefone é obrigatório', 'error');
      setLoading(false);
      return;
    }

    const payload = csvData.map(row => {
      const phone = row[parseInt(mappedPhone)] || '';
      const name = mappedName ? (row[parseInt(mappedName)] || '') : '';
      const attributes: Record<string, string> = {};

      mappedCustom.forEach(custom => {
        if (custom.index !== '') {
          const value = row[parseInt(custom.index)] || '';
          if (value) attributes[custom.key] = value;
        }
      });

      return { phone, name, attributes };
    }).filter(c => c.phone); // Require phone

    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName, contacts: payload, teamId: importTeamId }),
      });

      if (!res.ok) throw new Error();
      const result = await res.json();
      showToast(`${result.imported} contatos importados/atualizados com sucesso.`, 'success');
      fetchContacts();
    } catch {
      showToast('Erro ao importar contatos', 'error');
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesSearch = 
      (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
      c.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Base de Contatos</h1>
        <div className={styles.headerActions}>
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button 
            className={styles.buttonSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Importar Planilha (XLSX/CSV)
          </button>
          <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>+ Novo Contato</button>
        </div>
      </div>

      <div className={styles.filters}>
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..." 
          className={styles.filterInput} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select 
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Todos os Status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="EXCEPTION">Exceções (Números Inválidos)</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Carregando...</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nome</th>
                <th className={styles.th}>Telefone</th>
                <th className={styles.th}>Campos Dinâmicos</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>Nenhum contato encontrado.</td>
                </tr>
              ) : (
                filteredContacts.map(contact => {
                  let attributesObj = {};
                  try {
                    attributesObj = contact.attributes ? JSON.parse(contact.attributes) : {};
                  } catch (e) {}

                  return (
                    <tr key={contact.id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: 500, color: '#fff' }}>{contact.name || '-'}</td>
                      <td className={styles.td}>{contact.phone}</td>
                      <td className={styles.td}>
                        {Object.entries(attributesObj).map(([key, value]) => (
                          <span key={key} className={styles.dynamicField}>
                            {key}: {String(value)}
                          </span>
                        ))}
                      </td>
                      <td className={styles.td}>
                        {contact.status === 'ACTIVE' 
                          ? <span className={`${styles.statusBadge} ${styles.statusActive}`}>ATIVO</span>
                          : <span className={`${styles.statusBadge} ${styles.statusException}`}>EXCEÇÃO</span>
                        }
                      </td>
                      <td className={styles.td}>
                        <button className={styles.iconButton} onClick={() => handleDelete(contact.id)} title="Excluir">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Novo Contato</h2>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do contato"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Telefone *</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  required
                />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.buttonSecondary} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.buttonPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMappingModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.mappingModal}`}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Mapeamento de Colunas</h2>
              <button className={styles.closeButton} onClick={() => setIsMappingModalOpen(false)}>×</button>
            </div>
            <div className={styles.formGroup} style={{ padding: '0 24px', marginTop: '16px' }}>
              <label className={styles.label}>Nome da Lista (Opcional)</label>
              <input 
                type="text" 
                className={styles.input} 
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Ex: Leads Campanha X"
              />
            </div>
            <div className={styles.formGroup} style={{ padding: '0 24px', marginTop: '8px' }}>
              <label className={styles.label}>Equipe (Opcional)</label>
              <select 
                className={styles.input} 
                value={importTeamId}
                onChange={(e) => setImportTeamId(e.target.value)}
              >
                <option value="">Sem Equipe</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.tableContainer} style={{ marginBottom: '24px' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Campo do CRM</th>
                    <th className={styles.th}>Coluna do CSV</th>
                    <th className={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: '#fff' }}>Telefone *</td>
                    <td className={styles.td}>
                      <select 
                        className={styles.filterSelect}
                        style={{ width: '100%' }}
                        value={mappedPhone}
                        onChange={(e) => setMappedPhone(e.target.value)}
                      >
                        <option value="">-- Selecione uma coluna --</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}></td>
                  </tr>
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: '#fff' }}>Nome</td>
                    <td className={styles.td}>
                      <select 
                        className={styles.filterSelect}
                        style={{ width: '100%' }}
                        value={mappedName}
                        onChange={(e) => setMappedName(e.target.value)}
                      >
                        <option value="">-- Ignorar --</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </td>
                    <td className={styles.td}></td>
                  </tr>
                  
                  {mappedCustom.map((custom, idx) => (
                    <tr key={idx} className={styles.tr}>
                      <td className={styles.td}>
                        <input 
                          type="text" 
                          className={styles.input} 
                          style={{ padding: '6px 12px' }}
                          value={custom.key} 
                          onChange={(e) => {
                            const newCustom = [...mappedCustom];
                            newCustom[idx].key = e.target.value;
                            setMappedCustom(newCustom);
                          }}
                          placeholder="Nome do Campo"
                        />
                      </td>
                      <td className={styles.td}>
                        <select 
                          className={styles.filterSelect}
                          style={{ width: '100%' }}
                          value={custom.index}
                          onChange={(e) => {
                            const newCustom = [...mappedCustom];
                            newCustom[idx].index = e.target.value;
                            setMappedCustom(newCustom);
                          }}
                        >
                          <option value="">-- Ignorar --</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </td>
                      <td className={styles.td}>
                        <button 
                          className={styles.iconButton}
                          onClick={() => {
                            const newCustom = [...mappedCustom];
                            newCustom.splice(idx, 1);
                            setMappedCustom(newCustom);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
               <button 
                  className={styles.buttonSecondary} 
                  onClick={() => setMappedCustom([...mappedCustom, { key: 'Novo Campo', index: '' }])}
               >
                 + Adicionar Campo Personalizado
               </button>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.buttonSecondary} onClick={() => setIsMappingModalOpen(false)}>Cancelar</button>
              <button className={styles.buttonPrimary} onClick={handleConfirmImport}>Confirmar Importação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

