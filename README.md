# Beauty OS — MVP web/PWA

MVP de gestão multiestabelecimento para negócios de beleza, com experiência personalizada por segmento.

## Estado atual

A aplicação já está conectada ao projeto Supabase **Dalton Pessoal**, usando o schema dedicado `beleza`. A chave usada no frontend é somente a **publishable key**; o isolamento dos dados é garantido por RLS.

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

O banco também mantém subdivisões futuras de estética facial e corporal.

## Personalização por estabelecimento

Cada estabelecimento possui seus próprios clientes, profissionais, serviços, produtos, estoque e agenda. Um Studio pode ativar múltiplos segmentos. Quando um segmento é desativado, seus cadastros não são apagados: ficam fora da operação e reaparecem quando o segmento é reativado.

## Banco

Projeto: `Dalton Pessoal`  
Schema: `beleza`

O schema contém tabelas para estabelecimentos, segmentos, membros, profissionais, serviços, clientes, produtos, consumo por serviço, agenda, estoque e notificações. As relações usam `establishment_id` e chaves compostas para bloquear vínculos cruzados entre empresas.

## Rodar localmente

```bash
python3 -m http.server 4173
```

Abra `http://localhost:4173`.

## Publicar na Vercel

O projeto é estático e já contém `vercel.json`; não há etapa de build. Publique a pasta raiz do projeto.

## PWA / Play Store

O projeto já possui manifest e service worker. Depois da validação comercial, a mesma aplicação poderá ser empacotada com Capacitor ou TWA para Android, mantendo o backend atual.

## Próximas camadas

- Gestão completa de profissionais e disponibilidade.
- Profissional ↔ serviços.
- Comissão e fechamento.
- Consumo automático de estoque por serviço.
- Caixa/financeiro.
- Push real com subscriptions e servidor de envio.
- Link público de agendamento.
- Fichas específicas por vertical (ficha capilar, mapping de cílios, protocolos de estética etc.).
