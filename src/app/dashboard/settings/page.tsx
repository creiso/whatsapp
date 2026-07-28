"use client";

import { useState, useEffect, useRef } from 'react';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [accessToken, setAccessToken] = useState('');
  const [rawAccessToken, setRawAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [whatsappBusinessId, setWhatsappBusinessId] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          
          if (data.meta_access_token) {
            setRawAccessToken(data.meta_access_token);
            // Mask token: show only last 4 chars
            const tokenLength = data.meta_access_token.length;
            if (tokenLength > 4) {
              setAccessToken('•'.repeat(20) + data.meta_access_token.slice(-4));
            } else {
              setAccessToken(data.meta_access_token);
            }
          }
          
          if (data.meta_phone_number_id) setPhoneNumberId(data.meta_phone_number_id);
          if (data.meta_business_id) setWhatsappBusinessId(data.meta_business_id);
          if (data.meta_webhook_verify_token) setWebhookVerifyToken(data.meta_webhook_verify_token);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        showToast("Erro ao carregar configurações", "error");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload: any = {
        meta_phone_number_id: phoneNumberId,
        meta_business_id: whatsappBusinessId,
        meta_webhook_verify_token: webhookVerifyToken,
      };
      
      // Only include access token if it was changed (doesn't contain our mask character)
      if (!accessToken.includes('•')) {
        payload.meta_access_token = accessToken;
        setRawAccessToken(accessToken);
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast("Configurações salvas com sucesso!", "success");
        // Re-mask if it was newly typed
        if (!accessToken.includes('•') && accessToken.length > 4) {
          setAccessToken('•'.repeat(20) + accessToken.slice(-4));
        }
      } else {
        throw new Error("Falha ao salvar");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao salvar configurações", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);
    
    const tokenToUse = accessToken.includes('•') ? rawAccessToken : accessToken;
    
    if (!tokenToUse || !phoneNumberId) {
      showToast("Preencha o Token e o ID do Telefone primeiro", "error");
      setIsTesting(false);
      return;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?access_token=${tokenToUse}`);
      
      if (response.ok) {
        setConnectionStatus('connected');
        showToast("Conexão estabelecida com sucesso!", "success");
      } else {
        const errorData = await response.json();
        console.error("Meta API Error:", errorData);
        setConnectionStatus('error');
        showToast("Falha na conexão com a Meta API", "error");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus('error');
      showToast("Erro ao testar conexão", "error");
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.loadingState}>
            <div className={styles.loader}></div>
            Carregando configurações...
          </div>
        </div>
      </div>
    );
  }

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
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Webhook Verify Token</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="seu_token_secreto_aqui"
              value={webhookVerifyToken}
              onChange={(e) => setWebhookVerifyToken(e.target.value)}
              required
            />
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.button} disabled={isSaving}>
              {isSaving && <div className={styles.loader}></div>}
              Salvar Credenciais
              {toast?.type === 'success' && !isSaving && (
                <span style={{ color: '#10b981', marginLeft: '4px' }}>✓</span>
              )}
            </button>
            
            <button 
              type="button" 
              className={styles.buttonSecondary} 
              onClick={testConnection}
              disabled={isTesting || (!accessToken && !rawAccessToken) || !phoneNumberId}
            >
              {isTesting && <div className={styles.loader}></div>}
              {connectionStatus === 'connected' && <span className={styles.statusConnected + ' ' + styles.statusIndicator}></span>}
              {connectionStatus === 'error' && <span className={styles.statusError + ' ' + styles.statusIndicator}></span>}
              Testar Conexão
            </button>
          </div>
        </form>

        <div className={styles.webhookInfo}>
          <div className={styles.webhookTitle}>URL do Webhook para configuração no Painel da Meta:</div>
          <div className={styles.webhookCode}>
            {origin ? `${origin}/api/webhooks/meta` : 'https://seu-dominio.com/api/webhooks/meta'}
          </div>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#9ca3af' }}>
            Copie esta URL e o Verify Token definido acima para configurar o webhook no painel de desenvolvedores da Meta.
          </p>
        </div>
      </div>
      
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  );
}
