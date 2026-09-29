# Nethanel Beauty — MVP web/PWA

MVP multiestabelecimento para negócios de beleza, com experiência personalizada por segmento.

## Estado atual

A aplicação usa o projeto Supabase **Dalton Pessoal**, no schema dedicado `beleza`.

As credenciais públicas de conexão não ficam versionadas no GitHub. O Vercel gera `dist/config.js` durante o build usando variáveis de ambiente.

### Fluxo implementado

1. Criar conta ou entrar por e-mail e senha.
2. Usuário sem estabelecimento entra no onboarding.
3. Escolha do segmento ou Studio multidisciplinar.
4. Criação do estabelecimento, vínculo OWNER e profissional principal.
5. Criação dos segmentos e serviços iniciais sugeridos.
6. Dashboard contextual ao estabelecimento.
7. Cadastro de clientes, serviços e produtos/estoque.
8. Agenda com persistência real no Supabase.
9. Conclusão do atendimento atualiza a data de retorno do cliente.
10. Botão de WhatsApp usa mensagem pronta, sem API paga.

## Segmentos iniciais

- Cabeleireiro
- Barbearia
- Design de sobrancelhas
- Extensão de cílios
- Unhas
- Estética
- Depilação
- Maquiagem

## Banco

Projeto: `Dalton Pessoal`  
Schema: `beleza`

Cada estabelecimento possui seus próprios clientes, profissionais, serviços, produtos, estoque e agenda, isolados por RLS e `establishment_id`.

## Importar no Vercel

Importe este repositório e configure estas variáveis em **Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SCHEMA=beleza`

O `vercel.json` já define:

- Build Command: `npm run build`
- Output Directory: `dist`

O build reconstrói os arquivos web, injeta a configuração pública e publica a PWA.

## Segurança do repositório

Nenhuma chave administrativa ou `service_role` é armazenada aqui. A publishable key deve ser configurada no Vercel.

## PWA / Play Store

O projeto já possui manifest e service worker. Depois da validação comercial, a mesma aplicação poderá ser empacotada com Capacitor ou TWA para Android mantendo o backend atual.

## Próximas camadas

- Gestão completa de profissionais e disponibilidade
- Profissional ↔ serviços
- Comissão e fechamento
- Consumo automático de estoque por serviço
- Caixa/financeiro
- Push real
- Link público de agendamento
- Fichas específicas por vertical
