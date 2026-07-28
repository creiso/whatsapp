import Link from 'next/link';

export default function Termos() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', color: '#e5e7eb', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>← Voltar para a página inicial</Link>
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>Termos de Uso</h1>
      <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>1. Aceitação dos Termos</h2>
        <p>Ao acessar e usar o WhatsApp CRM, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nossa plataforma.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>2. Descrição do Serviço</h2>
        <p>O WhatsApp CRM é uma plataforma SaaS (Software as a Service) projetada para facilitar o gerenciamento de leads e campanhas através da integração oficial com a API do WhatsApp Business, oferecida pela Meta.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>3. Responsabilidades do Usuário</h2>
        <ul style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>Você é responsável por manter a confidencialidade de sua conta e senha.</li>
          <li style={{ marginBottom: '8px' }}>Você concorda em não usar o serviço para qualquer finalidade ilegal, como envio de SPAM ou mensagens não solicitadas.</li>
          <li style={{ marginBottom: '8px' }}>Você deve seguir integralmente as Políticas de Comércio e Mensagens do WhatsApp estabelecidas pela Meta.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>4. Integração com a Meta</h2>
        <p>O funcionamento correto das mensagens depende da disponibilidade e estabilidade da API Oficial da Meta. O WhatsApp CRM não se responsabiliza por indisponibilidades causadas pela infraestrutura do Facebook/Meta.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>5. Modificações dos Termos</h2>
        <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. O uso contínuo da plataforma após tais alterações constitui sua aceitação dos novos Termos.</p>
      </section>
    </div>
  );
}
