import Link from 'next/link';

export default function Privacidade() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px', color: '#e5e7eb', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <div style={{ marginBottom: '40px' }}>
        <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>← Voltar para a página inicial</Link>
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>Política de Privacidade</h1>
      <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>1. Informações que coletamos</h2>
        <p>Ao utilizar o WhatsApp CRM, podemos coletar informações fornecidas diretamente por você, como dados de contato da sua equipe e dados de clientes (leads) inseridos na plataforma. Também podemos coletar informações automaticamente, como endereço IP e dados de uso.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>2. Como usamos suas informações</h2>
        <p>As informações são utilizadas exclusivamente para o funcionamento do CRM, envio de mensagens autorizadas via API Oficial do WhatsApp (Meta) e para melhorar a experiência do usuário. Não vendemos nem compartilhamos seus dados com terceiros não autorizados.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>3. API Oficial da Meta (WhatsApp)</h2>
        <p>Nosso sistema integra-se à API Oficial do WhatsApp fornecida pela Meta. Ao utilizar nossos serviços, você também concorda com as Políticas de Privacidade da Meta e com os Termos de Serviço do WhatsApp Business.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>4. Segurança dos Dados</h2>
        <p>Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso, alteração, divulgação ou destruição não autorizada.</p>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', color: '#fff', marginBottom: '16px' }}>5. Contato</h2>
        <p>Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco através dos canais oficiais de suporte.</p>
      </section>
    </div>
  );
}
