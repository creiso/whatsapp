"use client";

import { useState } from 'react';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui conectaremos com o backend para salvar os tokens no Supabase de forma segura
    alert('Configurações salvas com sucesso! (Simulado)');
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h1 className={styles.title}>Integração Meta API</h1>
        <p className={styles.description}>
          Configure as credenciais do seu aplicativo Meta para habilitar o envio e recebimento de mensagens no WhatsApp.
        </p>

        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Access Token (Permanente)</label>
            <input 
              type="password" 
              className={styles.input} 
              placeholder="EAAL..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number ID</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>WhatsApp Business Account ID</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="123456789012345"
              value={whatsappBusinessId}
              onChange={(e) => setWhatsappBusinessId(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.button}>
            Salvar Credenciais
          </button>
        </form>

        <div className={styles.webhookInfo}>
          <div className={styles.webhookTitle}>URL do Webhook para configuração no Painel da Meta:</div>
          <div className={styles.webhookCode}>
            https://seu-dominio.com/api/webhooks/meta
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#9ca3af' }}>
            Lembre-se de configurar o Verify Token que definiremos no backend.
          </p>
        </div>
      </div>
    </div>
  );
}
