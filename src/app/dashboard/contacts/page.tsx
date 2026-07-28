"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
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

type ContactList = {
  id: string;
  name: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
  _count: { contacts: number };
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [bulkMoveTeamId, setBulkMoveTeamId] = useState('');  
  // Layout State
  const [selectedListId, setSelectedListId] = useState<string>('ALL');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const fetchContacts = async (listId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?listId=${listId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContacts(data);
      setCurrentPage(1);
    } catch (err) {
      showToast('Erro ao carregar contatos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (err) {
      console.error('Failed to fetch lists', err);
    }
  };

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

  useEffect(() => {
    fetchTeams();
    fetchLists();
  }, []);

  useEffect(() => {
    fetchContacts(selectedListId);
    setSelectedIds([]);
  }, [selectedListId]);

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
      fetchLists(); // Update counts
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
      if (selectedListId === 'ALL') {
        setContacts([newContact, ...contacts]);
      }
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
    }).filter(c => c.phone);

    try {
      const res = await fetch('/api/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listName, contacts: payload, teamId: importTeamId }),
      });

      if (!res.ok) throw new Error();
      const result = await res.json();
      showToast(`${result.imported} contatos importados/atualizados com sucesso.`, 'success');
      fetchContacts(selectedListId);
      fetchLists();
    } catch {
      showToast('Erro ao importar contatos', 'error');
      setLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (selectedListId === 'ALL') return;
    if (!window.confirm('Tem certeza que deseja excluir esta lista E TODOS os contatos contidos nela?')) return;
    
    setIsBulkActionLoading(true);
    try {
      const res = await fetch('/api/lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedListId }),
      });
      if (!res.ok) throw new Error();
      setSelectedListId('ALL');
      fetchLists();
      showToast('Lista e contatos excluídos com sucesso', 'success');
    } catch {
      showToast('Erro ao excluir lista', 'error');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchesSearch = 
        (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        c.phone.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [contacts, filterStatus, searchQuery]);

  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, currentPage]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const visibleIds = paginatedContacts.map(c => c.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleIds = paginatedContacts.map(c => c.id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const isAllVisibleSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.includes(c.id));

  const handleBulkDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} contatos?`)) return;
    setIsBulkActionLoading(true);
    try {
      const res = await fetch('/api/contacts/bulk/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', ids: selectedIds }),
      });
      if (!res.ok) throw new Error();
      setSelectedIds([]);
      fetchContacts(selectedListId);
      fetchLists();
      showToast('Contatos excluídos com sucesso', 'success');
    } catch {
      showToast('Erro ao excluir contatos', 'error');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkMove = async () => {
    if (!bulkMoveTeamId) {
      showToast('Selecione uma equipe', 'error');
      return;
    }
    setIsBulkActionLoading(true);
    try {
      const res = await fetch('/api/contacts/bulk/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MOVE', ids: selectedIds, teamId: bulkMoveTeamId }),
      });
      if (!res.ok) throw new Error();
      setSelectedIds([]);
      setIsMoveModalOpen(false);
      fetchContacts(selectedListId);
      fetchLists();
      showToast('Contatos movidos com sucesso', 'success');
    } catch {
      showToast('Erro ao mover contatos', 'error');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDownload = () => {
    const dataToDownload = filteredContacts
      .filter(c => selectedIds.includes(c.id))
      .map(c => {
        let attrs = {};
        try { attrs = c.attributes ? JSON.parse(c.attributes) : {}; } catch(e) {}
        return {
          Nome: c.name || '',
          Telefone: c.phone,
          ...attrs
        };
      });
    
    if (dataToDownload.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(dataToDownload);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contatos_selecionados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedLists = useMemo(() => {
    const groups: { [key: string]: { name: string; lists: ContactList[] } } = {
      UNASSIGNED: { name: 'Importações Avulsas', lists: [] }
    };

    lists.forEach(list => {
      if (!list.name.toLowerCase().includes(sidebarSearch.toLowerCase())) return;

      if (list.teamId && list.team) {
        if (!groups[list.teamId]) {
          groups[list.teamId] = { name: list.team.name, lists: [] };
        }
        groups[list.teamId].lists.push(list);
      } else {
        groups.UNASSIGNED.lists.push(list);
      }
    });

    return groups;
  }, [lists, sidebarSearch]);

  const totalContacts = lists.reduce((acc, l) => acc + (l._count?.contacts || 0), 0);

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      {isBulkActionLoading && (
        <div className={styles.bulkLoadingOverlay}>
          <div className={styles.spinner}></div>
          <p style={{ marginTop: '16px' }}>Processando...</p>
        </div>
      )}

      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className={styles.title}>
            Base de Contatos {selectedListId !== 'ALL' && lists.find(l => l.id === selectedListId) && `> ${lists.find(l => l.id === selectedListId)?.name}`}
          </h1>
          {selectedListId !== 'ALL' && (
            <button className={styles.iconButton} onClick={handleDeleteList} title="Excluir Lista">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          )}
        </div>
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
            Importar Planilha
          </button>
          <button className={styles.buttonPrimary} onClick={() => setIsModalOpen(true)}>+ Novo Contato</button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <input 
            type="text" 
            placeholder="Buscar listas..." 
            className={styles.sidebarSearch}
            value={sidebarSearch}
            onChange={e => setSidebarSearch(e.target.value)}
          />
          
          <div 
            className={`${styles.listItem} ${selectedListId === 'ALL' ? styles.listItemSelected : ''}`}
            onClick={() => setSelectedListId('ALL')}
          >
            <span>Todos os Contatos</span>
            <span className={styles.listCount}>{totalContacts}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: 12 }}>
            {Object.entries(groupedLists).map(([id, group]) => {
              if (group.lists.length === 0) return null;
              return (
                <div key={id} className={styles.teamGroup}>
                  <div className={styles.teamName}>{group.name}</div>
                  {group.lists.map(list => (
                    <div 
                      key={list.id} 
                      className={`${styles.listItem} ${selectedListId === list.id ? styles.listItemSelected : ''}`}
                      onClick={() => setSelectedListId(list.id)}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={list.name}>
                        {list.name}
                      </span>
                      <span className={styles.listCount}>{list._count?.contacts || 0}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.mainContent}>
          {selectedIds.length > 0 ? (
            <div className={styles.bulkToolbar}>
              <span>{selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}</span>
              <div className={styles.bulkToolbarActions}>
                <button className={styles.buttonSecondary} onClick={() => setIsMoveModalOpen(true)}>Mover</button>
                <button className={styles.buttonSecondary} onClick={handleBulkDelete}>Excluir</button>
                <button className={styles.buttonSecondary} onClick={handleBulkDownload}>Baixar CSV</button>
              </div>
            </div>
          ) : (
            <div className={styles.filters}>
              <input 
                type="text" 
                placeholder="Buscar por nome ou telefone..." 
                className={styles.filterInput} 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <select 
                className={styles.filterSelect}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="EXCEPTION">Exceções (Inválidos)</option>
              </select>
            </div>
          )}
          
          {selectedIds.length === paginatedContacts.length && filteredContacts.length > paginatedContacts.length && paginatedContacts.length > 0 && (
            <div className={styles.bulkBanner}>
              Todos os {paginatedContacts.length} contatos desta página estão selecionados.
              <span 
                className={styles.bulkBannerLink} 
                onClick={() => setSelectedIds(filteredContacts.map(c => c.id))}
              >
                Selecionar todos os {filteredContacts.length} contatos da lista
              </span>
            </div>
          )}

          <div className={styles.tableContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Carregando...</p>
              </div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th} style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          className={styles.checkbox} 
                          checked={isAllVisibleSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className={styles.th}>Nome</th>
                      <th className={styles.th}>Telefone</th>
                      <th className={styles.th}>Campos Dinâmicos</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyState}>Nenhum contato encontrado.</td>
                      </tr>
                    ) : (
                      paginatedContacts.map(contact => {
                        let attributesObj = {};
                        try {
                          attributesObj = contact.attributes ? JSON.parse(contact.attributes) : {};
                        } catch (e) {}

                        return (
                          <tr key={contact.id} className={styles.tr}>
                            <td className={styles.td}>
                              <input 
                                type="checkbox" 
                                className={styles.checkbox} 
                                checked={selectedIds.includes(contact.id)}
                                onChange={() => toggleSelect(contact.id)}
                              />
                            </td>
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
                <div className={styles.pagination}>
                  <span>Mostrando {paginatedContacts.length} de {filteredContacts.length} contatos</span>
                  <div className={styles.paginationControls}>
                    <button 
                      className={styles.pageButton} 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <span>{currentPage} / {Math.max(1, totalPages)}</span>
                    <button 
                      className={styles.pageButton} 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
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

      {/* MAPPING MODAL */}
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

      {/* MOVE MODAL */}
      {isMoveModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Mover Contatos</h2>
              <button className={styles.closeButton} onClick={() => setIsMoveModalOpen(false)}>×</button>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Equipe de Destino</label>
              <select 
                className={styles.input} 
                value={bulkMoveTeamId}
                onChange={(e) => setBulkMoveTeamId(e.target.value)}
              >
                <option value="">Selecione a Equipe</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.buttonSecondary} onClick={() => setIsMoveModalOpen(false)}>Cancelar</button>
              <button className={styles.buttonPrimary} onClick={handleBulkMove}>Mover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
