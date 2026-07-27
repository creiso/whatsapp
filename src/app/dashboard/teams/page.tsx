export default function TeamsPage() {
  return (
    <div style={{ color: '#fff' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Equipes & Vendedores</h1>
      
      <div style={{ background: 'rgba(26, 29, 36, 0.7)', border: '1px solid var(--surface-border)', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Lista de Equipes</h2>
          <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
            + Nova Equipe
          </button>
        </div>
        
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
          Funcionalidade de CRUD em desenvolvimento (conectará com as tabelas `teams` e `profiles` do Supabase).
        </div>
      </div>
    </div>
  );
}
