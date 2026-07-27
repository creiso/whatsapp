"use client";

import { useState } from 'react';
import styles from './contacts.module.css';

const MOCK_CONTACTS = [
  {
    id: '1',
    name: 'João Silva',
    phone: '+55 11 99999-1111',
    status: 'ACTIVE',
    team: 'Equipe de Vendas 1',
    fields: { origem: 'facebook_ads', interesse: 'plano_anual' }
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    phone: '+55 21 98888-2222',
    status: 'ACTIVE',
    team: 'Retenção',
    fields: { origem: 'planilha_antiga' }
  },
  {
    id: '3',
    name: 'Número Inválido (Teste)',
    phone: '+55 31 1234-5678',
    status: 'EXCEPTION',
    team: 'Nenhuma',
    fields: { erro: 'User is not on WhatsApp' }
  }
];

export default function ContactsPage() {
  const [contacts] = useState(MOCK_CONTACTS);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredContacts = filterStatus === 'ALL' 
    ? contacts 
    : contacts.filter(c => c.status === filterStatus);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Base de Contatos</h1>
        <div className={styles.headerActions}>
          <button className={styles.buttonSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Importar Planilha (CSV)
          </button>
          <button className={styles.buttonPrimary}>+ Novo Contato</button>
        </div>
      </div>

      <div className={styles.filters}>
        <input type="text" placeholder="Buscar por nome ou telefone..." className={styles.filterInput} />
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Nome</th>
              <th className={styles.th}>Telefone</th>
              <th className={styles.th}>Equipe</th>
              <th className={styles.th}>Campos Dinâmicos</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map(contact => (
              <tr key={contact.id} className={styles.tr}>
                <td className={styles.td} style={{ fontWeight: 500, color: '#fff' }}>{contact.name}</td>
                <td className={styles.td}>{contact.phone}</td>
                <td className={styles.td}>{contact.team}</td>
                <td className={styles.td}>
                  {Object.entries(contact.fields).map(([key, value]) => (
                    <span key={key} className={styles.dynamicField}>
                      {key}: {value}
                    </span>
                  ))}
                </td>
                <td className={styles.td}>
                  {contact.status === 'ACTIVE' 
                    ? <span className={`${styles.statusBadge} ${styles.statusActive}`}>ATIVO</span>
                    : <span className={`${styles.statusBadge} ${styles.statusException}`}>EXCEÇÃO</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
