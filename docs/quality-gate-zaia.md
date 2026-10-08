# ZAIA — Gate de qualidade (08/10/2026)

## Ambientes
- Produção: https://zaia.nethanel.com.br (Vercel/main), NÃO alterar sem homologar.
- Homologação visual: https://zaia-estabelecimento-preview.onrender.com (Render/zaia-visual-pages).
- Atenção: o Render ainda consulta o banco de produção, por isso **toda escrita via fetch na API principal é bloqueada** neste ambiente. Não é homologação funcional completa.
- Critério para testes com mutação: base Supabase independente, sem dados reais (exige decisão sobre custo/provisionamento). Após configurar a base, verificar CORS e URLs de retorno OAuth no painel Auth.

## Etapa 1 — Estabilidade e segurança
- [x] Redirecionamento OAuth da loja e do cliente respeita origem atual.
- [x] Agendamento público guarda IDs da seleção durante login Google e restaura após retorno, consultando disponibilidade novamente.
- [x] Falha de rede na loja não vira onboarding acidental; agora permite retry.
- [x] Consentimento para promoções passa a ser explícito em novo perfil.
- [x] Data do app cliente e da tela inicial da loja respeita São Paulo.
- [x] Render com guarda de escrita e banner somente leitura enquanto usar banco real.
- [ ] Criar infraestrutura de banco exclusiva para testes com dados fictícios.
- [ ] Adicionar URLs do Render em Authentication > URL Configuration > Redirect URLs no Supabase, caso Google não aceite retornar ao domínio de homologação.
- [ ] Validar no navegador de teste sessão OAuth completa e expiração/refresh.
- [ ] Investigar reincidência de FCM/Web Push UNREGISTERED; a rotina nativa atual já desativa tokens inválidos.

## Etapa 2 — Operação e testes
- [x] Testes de domínio sem rede: 5 casos (retorno, agendamento, fusos e proteção de escrita).
- [x] Testes smoke da build: 4 casos (arquivos da loja, cliente, funcionário e config pública).
- [x] Build de homologação interrompe publicação se teste automatizado falhar.
- [x] Banco auditado em leitura: 0 pares de horários conflitantes; 13 atendimentos concluídos e 13 registros financeiros.
- [ ] Com base isolada, testar cadastro, serviço, seleção profissional, slots simultâneos, novo agendamento, cancelamento, reagendamento, ausência, conclusão, estoque, comissão, cobrança, notificações e avaliação.
- [ ] Corrigir permissões de usuário FINANCE depois de confirmar escopo do papel (RLS atual contempla OWNER/ADMIN nas tabelas financeiras).
- [ ] Paginar agenda/histórico em vez de carregar todos os agendamentos numa única consulta.
- [ ] Testar volume (>1000 agendamentos), latência e comportamento offline.
- [ ] Verificar regras de assinatura PRO e Mercado Pago com dados e conta sandbox.

## Etapa 3 — Conversão e crescimento
- [x] Motor de reativação prioriza clientes no momento de retorno e não recomenda quem já agendou futuro.
- [x] Início sugere criação de promoções para dias futuros com poucos agendamentos.
- [ ] Medir funil: busca > loja > serviço > horário > login > confirmação.
- [ ] Testar lembretes de retorno somente com opt-in de marketing e perfil adequado.
- [ ] Analisar taxa de retorno, ocupação e ticket por segmento com dados suficientes.
- [ ] Experimentos de funil e promoções sem disparo massivo.

## Regras para promover para produção
1. Testes automáticos e build devem passar.
2. Testes manuais completos devem rodar numa base isolada.
3. Conferir políticas RLS e proteção entre estabelecimentos.
4. Manter revisão de deploy e rollback.
5. Migrar branch validada para main somente após revisão; deploy Vercel único.
