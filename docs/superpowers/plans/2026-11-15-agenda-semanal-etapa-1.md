# Agenda semanal, etapa 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba Agenda: ver a semana, criar, editar, remover e duplicar compromissos por período, com dados salvos no aparelho.

**Architecture:** Domínio puro em `src/domain/agenda.ts` (tipos, validação, consultas, duplicar, dividir), persistência versionada em `AgendaRepository` (mesmo padrão de `AcoesRepository`), estado em `AgendaProvider`/`useAgenda`, telas novas numa pilha raiz (`Raiz.tsx`) que envolve as abas. Nada de Supabase nesta etapa.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript estrito, React Navigation 7 (bottom-tabs + native-stack), AsyncStorage, Jest + Testing Library (`await render`, como nos testes atuais).

**Spec:** `docs/superpowers/specs/2026-11-15-agenda-semanal-design.md` (seções 5, 7 e 8). Leia também `CLAUDE.md` do repositório.

## Global Constraints

- Branch `feat/agenda-etapa-1-semana`. **Não fazer commit nem push**: o dono aprova depois do teste manual (CLAUDE.md). Cada tarefa termina em "Checkpoint" (testes, typecheck, lint), não em commit.
- TypeScript estrito, sem `TODO`, sem hex solto (cores, espaços e raios vêm de `src/styles/theme.ts` via `useTheme()`, `SPACING`, `RADIUS`, `SIZES`). Alvos de toque de pelo menos 44 (`SIZES.touchMin`). Botões só de ícone têm `accessibilityLabel`.
- Textos de interface em português do Brasil, sem travessões.
- Datas: relógio do aparelho. Funções de `agenda.ts` recebem `Date` e usam `chaveDoDia`, `inicioDaSemana`, `diasDaSemana`, `somarDias`, `formatarIntervalo` de `src/domain/datas.ts`. Strings de data são `AAAA-MM-DD`; horas são `HH:MM` de `00:00` a `23:59`.
- Limites: nome da atividade 1 a 40 caracteres; detalhe até 60; `antecedenciaMin` 0 a 120; `fim` sempre depois de `inicio` quando existe.
- Chave de armazenamento `blueprint:agenda`, formato `{ versao: 1, atividades, agendas, avulsos }`.
- Ids vêm de `novoId: () => string` injetado (domínio) e o provider garante unicidade mesmo dentro do mesmo milissegundo (contador). Não usar `Math.random` nos testes.
- Dados da agenda de novembro do caderno só existem em `src/dev/` e atrás de `__DEV__`.

## Review Focus

1. Horários limítrofes: `fim` igual a `inicio`, `"24:00"`, `"7:30"` sem zero à esquerda, `"23:59"` (T1).
2. Virada de ano e meses curtos ao duplicar: dezembro de 2026 gera "Janeiro de 2027"; janeiro de 2027 gera "Fevereiro de 2027" até 28/02 (T2).
3. Dividir agenda no último dia do período: a nova agenda tem 1 dia, a anterior termina ontem (T2).
4. Disco com lixo: compromisso de atividade inexistente, agendas sobrepostas e JSON ilegível não derrubam o app (T3).
5. Dia fora de qualquer agenda e semana que cruza duas agendas: convite em vez de erro, avulso ainda aparece, nome da agenda por dia (T2 e T6).

---

## File Structure

| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `src/domain/agenda.ts` | criar | Tipos, validação, consultas e operações puras |
| `src/data/AgendaRepository.ts` | criar | Persistência versionada e validação ao carregar |
| `src/data/index.ts` | alterar | Expor `repositorios.agenda` |
| `src/hooks/useAgenda.tsx` | criar | `AgendaProvider` e `useAgenda` |
| `src/ui/Icon.tsx` | alterar | Novo ícone `agenda` |
| `src/components/SeletorDeDias.tsx`, `SeletorDeHorario.tsx`, `LinhaCompromisso.tsx`, `DiaDaAgenda.tsx` | criar | Componentes da agenda |
| `src/components/BarraDeAbas.tsx`, `src/navigation/Abas.tsx` | alterar | 5 abas, com `Agenda` entre `Hoje` e `Calendario` |
| `src/navigation/Raiz.tsx` | criar | Pilha raiz: `Abas`, `Compromisso`, `Agendas` |
| `src/screens/AgendaScreen.tsx`, `CompromissoScreen.tsx`, `AgendasScreen.tsx` | criar | Telas |
| `src/dev/agendaDeExemplo.ts` | criar | Agenda de novembro do caderno (só `__DEV__`) |
| `App.tsx`, `src/__tests__/utils.tsx`, `jest.setup.ts` | alterar | Carregar agenda, provider nos testes, mock do seletor de horário |
| `docs/05-funcionalidades-e-fluxos.md`, `docs/03-guia-telas-figma.md` | alterar | Funções e telas novas |

---

### Task 1: Domínio, tipos e validação

**Files:**
- Create: `src/domain/agenda.ts`
- Test: `src/__tests__/agendaValidacao.test.ts`

**Interfaces:**
- Produces (exports de `agenda.ts`):
  - tipos `DiaDaSemana` (0 a 6, 0 = domingo), `IconeAtividade` (de `ICONES_ATIVIDADE = ["exercicio","estudo","hidratacao","descanso","outro","sol","lua"] as const`), `Atividade { id; nome; icone; categoria: CategoriaId | null; criadaEm }`, `Compromisso { id; atividadeId; dias; inicio; fim: string | null; detalhe?; antecedenciaMin? }`, `Agenda { id; nome; inicio; fim; compromissos }`, `Avulso { id; atividadeId; data; inicio; fim: string | null; detalhe? }`, `DadosAgenda { atividades; agendas; avulsos }`, `Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }`
  - `DADOS_AGENDA_VAZIOS: DadosAgenda`
  - `horaValida(hora: string): boolean`, `minutosDoDia(hora: string): number`
  - `validarAtividade(a: Pick<Atividade,"nome"|"icone"|"categoria"> & { id?: string }, existentes: readonly Atividade[]): string | null`
  - `validarCompromisso(c: Omit<Compromisso,"id">): string | null`
  - `validarAvulso(a: Omit<Avulso,"id">): string | null`
  - `periodosSeSobrepoem(a: {inicio: string; fim: string}, b: {inicio: string; fim: string}): boolean`
  - `validarAgenda(a: {id?: string; nome: string; inicio: string; fim: string}, outras: readonly Agenda[]): string | null`
  - Todas as `validar*` devolvem a mensagem do primeiro erro ou `null`.

- [ ] **Step 1: Instalar e medir a linha de base.** Run: `npm install`, depois `npm run typecheck && npm run lint && npm test`. Expected: tudo passa (anote o número de testes). Se algo falhar já na linha de base, pare e avise o dono.
- [ ] **Step 2: Escrever os testes que falham** em `agendaValidacao.test.ts`, com estas asserções:
  - `horaValida`: `"00:00"`, `"05:00"`, `"23:59"` verdadeiros; `"24:00"`, `"7:30"`, `"07:60"`, `""`, `"ab:cd"` falsos. `minutosDoDia("05:30") === 330`.
  - `validarCompromisso`: com `dias: []` devolve `"Escolha pelo menos um dia"`; com `dias` repetidos devolve erro; `inicio: "7:30"` devolve `"Informe um horário no formato HH:MM"`; `fim` igual a `inicio` e `fim` anterior a `inicio` devolvem `"O término deve ser depois do início"`; `fim: null` com dados válidos devolve `null`; `detalhe` com 61 caracteres e `antecedenciaMin` 121, -1 ou 1,5 devolvem erro; `antecedenciaMin: 0` e `120` passam.
  - `validarAtividade`: nome vazio (só espaços) e de 41 caracteres dão erro; `" academia "` quando já existe `Academia` (outro id) devolve `"Já existe uma atividade com este nome"`; o mesmo nome com o mesmo `id` (edição) passa; ícone fora de `ICONES_ATIVIDADE` dá erro.
  - `validarAvulso`: `data: "2026-02-30"` dá erro; data válida e horários válidos passam.
  - `periodosSeSobrepoem`: `2026-11-01..2026-11-30` contra `2026-11-30..2026-12-31` é verdadeiro (compartilham o dia 30); contra `2026-12-01..2026-12-31` é falso.
  - `validarAgenda`: `fim` antes de `inicio` e data inexistente dão erro; sobreposição devolve `"Já existe agenda neste período"`; `fim` igual a `inicio` (1 dia) passa; ignora a própria agenda (mesmo `id`) ao checar sobreposição.
- [ ] **Step 3: Rodar e ver falhar.** Run: `npx jest src/__tests__/agendaValidacao.test.ts`. Expected: FAIL (módulo inexistente).
- [ ] **Step 4: Implementar** `src/domain/agenda.ts` com as assinaturas acima. Valide datas por construção de `Date` e comparação de volta (rejeita 30 de fevereiro). Compare datas `AAAA-MM-DD` como texto.
- [ ] **Step 5: Checkpoint.** Run: `npx jest src/__tests__/agendaValidacao.test.ts && npm run typecheck && npm run lint`. Expected: PASS e sem erros.

---

### Task 2: Domínio, consultas e operações

**Files:**
- Modify: `src/domain/agenda.ts`
- Test: `src/__tests__/agendaOperacoes.test.ts`

**Interfaces:**
- Consumes: tipos da Task 1; `chaveDoDia`, `somarDias`, `MESES` de `src/domain/datas.ts`.
- Produces (em `agenda.ts`):
  - `Ocorrencia { chave: string /* "agenda:<id>" ou "avulso:<id>" */; origem: "agenda" | "avulso"; id: string; agendaId: string | null; atividade: Atividade; inicio: string; fim: string | null; detalhe?: string; antecedenciaMin?: number }`
  - `agendaDaData(agendas: readonly Agenda[], data: Date): Agenda | undefined`
  - `ocorrenciasDoDia(dados: DadosAgenda, data: Date): Ocorrencia[]` (compromissos da agenda do dia que repetem naquele dia da semana, mais os avulsos da data; ordenadas por `inicio`, depois `fim` com `null` primeiro, depois nome da atividade; ignora itens cuja atividade não existe)
  - `chavesEmConflito(ocorrencias: readonly Ocorrencia[]): Set<string>` (sobreposição de intervalos; `fim: null` conta como o instante `inicio`; encostar não conflita)
  - `nomeDeAgendaDoMes(ano: number, mes: number): string` (`"Novembro de 2026"`, com maiúscula)
  - `duplicarParaProximoMes(dados: DadosAgenda, agendaId: string, novoId: () => string): Resultado<Agenda>`
  - `agendaEmCurso(agenda: Agenda, hoje: Date): boolean` (`inicio` antes de hoje e hoje até `fim`)
  - `dividirAPartirDe(agenda: Agenda, hoje: Date, novoId: () => string): { anterior: Agenda; nova: Agenda; idsNovos: Record<string, string> /* id antigo -> id novo do compromisso */ }`
  - `atividadeEmUso(dados: DadosAgenda, atividadeId: string): boolean`

- [ ] **Step 1: Escrever os testes que falham** em `agendaOperacoes.test.ts`, com estas asserções (use `novoId` determinístico: `let n = 0; () => "id" + ++n`):
  - `agendaDaData`: dia dentro, no primeiro dia, no último dia e fora do período; fora devolve `undefined`.
  - `ocorrenciasDoDia`: terça com compromissos de segunda e terça devolve só os de terça; ordem por horário; avulso da data aparece junto e com `origem: "avulso"`; **data fora de qualquer agenda ainda devolve os avulsos** e nenhum compromisso (Review Focus 5); compromisso cuja atividade não existe é ignorado.
  - `chavesEmConflito`: `15:30-19:00` e `18:00-20:00` conflitam; `15:30-19:00` e `19:00-20:00` não; `15:30-19:00` e `20:00` (sem fim) não; `15:30-19:00` e `16:00` (sem fim) sim.
  - `duplicarParaProximoMes`: agenda `2026-11-01..2026-11-30` gera `"Dezembro de 2026"`, `2026-12-01..2026-12-31`, compromissos com ids novos e **mesmos `atividadeId`**; `2026-12-01..2026-12-31` gera `"Janeiro de 2027"` (virada de ano); `2027-01-01..2027-01-31` gera `2027-02-01..2027-02-28`; origem de 10 dias (`2026-11-10..2026-11-19`) gera o mês inteiro de dezembro; com agenda já existente em dezembro devolve `{ ok: false, erro: "Já existe agenda neste período" }`; `agendaId` inexistente devolve erro.
  - `agendaEmCurso`: `inicio` igual a hoje é falso (nada passou ainda); hoje no meio é verdadeiro; hoje igual a `fim` é verdadeiro; hoje depois de `fim` é falso.
  - `dividirAPartirDe`: agenda `2026-11-01..2026-11-30` com hoje `2026-11-15`: `anterior.fim === "2026-11-14"`, `nova.inicio === "2026-11-15"`, `nova.fim === "2026-11-30"`, `nova.nome` contém `"a partir de 15/11"`, compromissos copiados com ids novos, `idsNovos` mapeia cada id antigo ao novo; com hoje igual a `fim` (30/11) a nova tem 1 dia e `anterior.fim === "2026-11-29"` (Review Focus 3); o resultado das duas agendas passa em `validarAgenda` uma contra a outra.
  - `atividadeEmUso`: verdadeiro se usada por compromisso de qualquer agenda ou por avulso; falso caso contrário.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/agendaOperacoes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** as funções acima em `agenda.ts`. Soma de meses por `new Date(ano, mes + 1, 1)`; último dia por `new Date(ano, mes + 2, 0)`.
- [ ] **Step 4: Checkpoint.** Run: `npx jest src/__tests__/agendaValidacao.test.ts src/__tests__/agendaOperacoes.test.ts && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 3: AgendaRepository

**Files:**
- Create: `src/data/AgendaRepository.ts`
- Modify: `src/data/index.ts` (adicionar `agenda: criarAgendaRepositoryLocal(AsyncStorage)` e exportar o tipo `AgendaRepository`)
- Test: `src/__tests__/agendaPersistencia.test.ts`

**Interfaces:**
- Consumes: `DadosAgenda`, `DADOS_AGENDA_VAZIOS`, validadores da Task 1, `ArmazenamentoChaveValor`, `criarFilaDeGravacao`, `lerJson` de `src/data/armazenamento.ts`.
- Produces:
  - `interface AgendaRepository { carregar(): Promise<DadosAgenda>; salvar(dados: DadosAgenda): Promise<void> }`
  - `CHAVE_AGENDA = "blueprint:agenda"`, `VERSAO_AGENDA = 1`
  - `migrarAgenda(bruto: unknown): { dados: DadosAgenda; descartados: number } | null` (`null` quando o formato não é reconhecido)
  - `criarAgendaRepositoryLocal(armazenamento, opcoes?: { aoAvisar?: (m: string) => void; agora?: () => Date }): AgendaRepository & { ler(): Promise<{ dados: DadosAgenda; descartados: number; corrompido: boolean }> }`

- [ ] **Step 1: Escrever os testes que falham** (use `criarArmazenamentoEmMemoria`):
  - sem nada salvo, `carregar()` devolve `DADOS_AGENDA_VAZIOS`; `salvar` seguido de `carregar` devolve dados iguais; o texto gravado em `blueprint:agenda` tem `versao: 1`.
  - texto ilegível (`"{{"`): `carregar()` devolve vazio, a chave original some e existe uma chave `blueprint:agenda:corrompido:<timestamp>` com o texto, e `aoAvisar` foi chamado (Review Focus 4).
  - `versao: 2` (desconhecida) e array solto são tratados como não reconhecidos (copiados à parte, não apagados).
  - compromisso de atividade inexistente é descartado e conta em `descartados`; atividade sem nome, agenda com `fim` antes de `inicio`, avulso com data inválida e ids repetidos são descartados.
  - duas agendas sobrepostas: fica a de `inicio` mais antigo, a outra é descartada.
  - duas gravações seguidas sem esperar terminam com a segunda no disco.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/agendaPersistencia.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** seguindo `AcoesRepository.ts` (mesma estrutura: `ler`, cópia `corrompido:<agora().getTime()>`, fila de gravação). Cada entidade é validada com os validadores da Task 1; aproveite o que for válido.
- [ ] **Step 4: Checkpoint.** Run: `npx jest src/__tests__/agendaPersistencia.test.ts && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 4: AgendaProvider e useAgenda

**Files:**
- Create: `src/hooks/useAgenda.tsx`
- Modify: `App.tsx` (carregar `repositorios.agenda` em `useDadosIniciais` com fallback `DADOS_AGENDA_VAZIOS` e `console.warn`; envolver `<Root />` em `<AgendaProvider>` dentro de `<AcoesProvider>`), `src/__tests__/utils.tsx` (opção `agenda?: DadosAgenda` e `AgendaProvider` dentro de `AcoesProvider`)
- Test: `src/__tests__/useAgenda.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 a 3; `useAcoes().relogio`; `Relogio` de `useAcoes.tsx`.
- Produces:
  - `type EscopoDaEdicao = "periodo" | "a-partir-de-hoje"`; `type CompromissoRascunho = Omit<Compromisso,"id"> & { id?: string }`; `type AvulsoRascunho = Omit<Avulso,"id"> & { id?: string }`
  - `AgendaProvider({ children, agendaInicial?: DadosAgenda, repositorio?: AgendaRepository, gerarId?: () => string })`
  - `useAgenda(): UseAgenda` (lança `"useAgenda precisa estar dentro de um AgendaProvider."` fora do provider) com:
    - `dados: DadosAgenda`, `relogio: Relogio`
    - `ocorrenciasDe(data: Date): Ocorrencia[]`, `agendaDe(data: Date): Agenda | undefined`
    - `criarAtividade(e: { nome: string; icone: IconeAtividade; categoria: CategoriaId | null }): Resultado<Atividade>`; `removerAtividade(id: string): Resultado<void>` (erro `"Esta atividade está em uso por compromissos"` se em uso)
    - `salvarCompromisso(agendaId: string, c: CompromissoRascunho, escopo?: EscopoDaEdicao): Resultado<void>` (sem `id` cria; com `id` edita); `removerCompromisso(agendaId: string, compromissoId: string, escopo?: EscopoDaEdicao): Resultado<void>`
    - `salvarAvulso(a: AvulsoRascunho): Resultado<void>`; `removerAvulso(id: string): Resultado<void>`
    - `criarAgenda(e: { nome: string; inicio: string; fim: string }): Resultado<Agenda>`; `editarAgenda(id: string, e: { nome: string; inicio: string; fim: string }): Resultado<void>`; `removerAgenda(id: string): Resultado<void>`; `duplicarAgenda(id: string): Resultado<Agenda>`
    - `substituir(dados: DadosAgenda): void` (só para a ferramenta de desenvolvimento)
  - Regra do escopo `"a-partir-de-hoje"`: só vale quando `agendaEmCurso(agenda, relogio())`; nesse caso usa `dividirAPartirDe` e aplica a mudança na agenda nova (o compromisso editado é achado por `idsNovos`). Fora disso trata como `"periodo"`.
  - Toda mutação valida com os validadores e devolve `{ ok: false, erro }` sem alterar o estado; sucesso grava no repositório (falha só gera `console.warn`, estado mantido), como em `AcoesProvider` (não grava na primeira renderização).

- [ ] **Step 1: Escrever os testes que falham**, renderizando um componente de teste com `renderComTema` (AGORA = sábado 17/10/2026) que chama o hook:
  - criar atividade, depois um compromisso na agenda de outubro; `ocorrenciasDe(AGORA)` o devolve (sábado).
  - atividade duplicada devolve `{ ok: false }` e o catálogo não muda; `removerAtividade` de atividade em uso devolve o erro; de atividade livre remove.
  - editar compromisso com escopo `"periodo"` muda a agenda inteira, sem criar agenda nova.
  - com `AGORA` no meio de outubro, editar com `"a-partir-de-hoje"` cria 2 agendas: a original termina 16/10 e mantém o compromisso antigo; a nova começa 17/10 com a alteração; `ocorrenciasDe` de 16/10 mostra o horário antigo e de 17/10 o novo.
  - com agenda que ainda não começou, `"a-partir-de-hoje"` edita direto, sem dividir.
  - `removerCompromisso` com `"a-partir-de-hoje"` remove só da agenda nova.
  - `criarAgenda` sobreposta devolve `"Já existe agenda neste período"`; `duplicarAgenda` cria o mês seguinte; `removerAgenda` remove a agenda e mantém atividades e avulsos.
  - mutação válida chama `repositorio.salvar` com os dados novos; mutação inválida não chama.
  - ids de uma duplicação grande são todos distintos (provider usa contador, não só relógio).
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/useAgenda.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar** com `useReducer` ou `useState` sobre `DadosAgenda`; mutações calculam o próximo estado com as funções puras e só então definem o estado. `gerarId` padrão: `gerarIdLocal(new Date())` de `src/domain/acoes.ts` com sufixo de contador do provider (confira em `acoes.ts` como o id é formado).
- [ ] **Step 4: Checkpoint.** Run: `npx jest src/__tests__/useAgenda.test.tsx && npm test && npm run typecheck && npm run lint`. Expected: toda a suíte passa (os testes antigos seguem verdes com o provider extra).

---

### Task 5: Componentes base da agenda

**Files:**
- Modify: `src/ui/Icon.tsx` (novo `IconName` `"agenda"`: lista com marcadores, traço 24x24), `jest.setup.ts` (mock de `@react-native-community/datetimepicker`)
- Create: `src/components/SeletorDeDias.tsx`, `SeletorDeHorario.tsx`, `LinhaCompromisso.tsx`, `DiaDaAgenda.tsx`
- Test: `src/__tests__/componentesAgenda.test.tsx`

**Interfaces:**
- Consumes: `Ocorrencia`, `DiaDaSemana`, `chavesEmConflito`; `Text`, `Card`, `Icon`, `useTheme`; `DIAS_ABREVIADOS` de `datas.ts`.
- Produces:
  - `SeletorDeDias({ valor: readonly DiaDaSemana[]; aoMudar: (dias: DiaDaSemana[]) => void })`: 7 botões (`dom` a `sáb`) com `accessibilityRole="checkbox"`, `accessibilityLabel` com o nome completo ("Segunda-feira"), `accessibilityState.checked`, devolve os dias em ordem crescente.
  - `SeletorDeHorario({ valor: string | null; aoMudar: (hora: string) => void; rotulo: string })`: no Android/iOS abre o seletor nativo (`@react-native-community/datetimepicker`); na web (`Platform.OS === "web"`) é um `TextInput` com máscara `HH:MM`. Mostra o valor como texto e tem `accessibilityLabel={rotulo}`.
  - `LinhaCompromisso({ ocorrencia: Ocorrencia; emConflito: boolean; aoPressionar: () => void })`: ícone da atividade, nome, horário (`"05:00 a 06:00"` ou `"20:00"` sem fim), detalhe, marca "só neste dia" para avulso e aviso visual de conflito. `accessibilityLabel` descreve tudo ("Academia, 05:00 a 06:00").
  - `DiaDaAgenda({ data: Date; hoje: Date; ocorrencias: readonly Ocorrencia[]; nomeDaAgenda?: string; aoAdicionar: () => void; aoAbrir: (o: Ocorrencia) => void })`: cartão do dia com título (`"Seg 9"`), destaque se for hoje, o nome da agenda quando informado, as linhas, `"Nada marcado"` quando vazio e o botão `"+ Adicionar"`.

- [ ] **Step 1: Escrever os testes que falham:**
  - `SeletorDeDias`: tocar em "Terça-feira" com `[1]` chama `aoMudar([1, 2])`; tocar de novo em "Segunda-feira" chama `aoMudar([2])`; estado `checked` correto.
  - `LinhaCompromisso`: com `fim`, mostra `"05:00 a 06:00"`; sem `fim`, mostra só `"20:00"`; `origem: "avulso"` mostra `"só neste dia"`; `emConflito` mostra o aviso; pressionar chama `aoPressionar`.
  - `DiaDaAgenda`: sem ocorrências mostra `"Nada marcado"` e o botão `"+ Adicionar"` chama `aoAdicionar`; com ocorrências mostra na ordem recebida; `nomeDaAgenda` aparece quando passado; pressionar uma linha chama `aoAbrir` com a ocorrência.
  - `SeletorDeHorario` (com o mock do seletor): escolher `"05:30"` chama `aoMudar("05:30")`; na web a máscara aceita `"0530"` e entrega `"05:30"`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/componentesAgenda.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Instalar a dependência e implementar.** Run: `npx expo install @react-native-community/datetimepicker`. Implemente os 4 componentes e o ícone. No `SeletorDeHorario` nativo, no Android use `DateTimePickerAndroid.open` e no iOS o componente embutido, como documenta o pacote da versão instalada (confira o README instalado em `node_modules`).
- [ ] **Step 4: Checkpoint.** Run: `npx jest src/__tests__/componentesAgenda.test.tsx && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 6: Navegação e aba Agenda

**Files:**
- Create: `src/navigation/Raiz.tsx`, `src/screens/AgendaScreen.tsx`
- Modify: `src/navigation/Abas.tsx` (tela `Agenda` entre `Hoje` e `Calendario`, tipo `AbasParamList`), `src/components/BarraDeAbas.tsx` (`RotaDaAba` e `ABAS` com `Agenda: { rotulo: "Agenda", icone: "agenda" }`; ajustar o comentário "4 abas"), `App.tsx` (renderizar `Raiz` no lugar de `Abas`), `src/__tests__/HistoricoEAbas.test.tsx` e demais testes que contem 4 abas
- Test: `src/__tests__/AgendaScreen.test.tsx`

**Interfaces:**
- Consumes: `useAgenda`, `DiaDaAgenda`, `inicioDaSemana`, `diasDaSemana`, `somarDias`, `formatarIntervalo`.
- Produces:
  - `RaizParamList = { Abas: undefined; Compromisso: { compromissoId?: string; agendaId?: string; avulsoId?: string; data?: string /* AAAA-MM-DD */ }; Agendas: undefined }`, componente padrão de `Raiz.tsx` (`createNativeStackNavigator`, `headerShown: false` nas abas; `Compromisso` e `Agendas` com título e botão de voltar com `accessibilityLabel`, cores do tema).
  - `AgendaScreen` (padrão): cabeçalho `"Agenda"`, intervalo da semana (`"9 a 15 de novembro"`) com botões `"Semana anterior"` e `"Próxima semana"`, nome da agenda do primeiro dia da semana que tiver agenda, botão `"Editar"` (abre `Agendas`), 7 `DiaDaAgenda` de domingo a sábado; mostra o nome da agenda no cartão do dia só quando muda em relação ao dia anterior; `"+ Adicionar"` abre `Compromisso` com `data`; tocar numa ocorrência abre `Compromisso` com `compromissoId` e `agendaId` (ou `avulsoId`). Sem nenhuma agenda cadastrada: cartão `"Montar a agenda de {mês atual}"` (abre `Agendas`) e `"Começar em branco"`.
- Antes: instale `npx expo install @react-navigation/native-stack`.

- [ ] **Step 1: Escrever os testes que falham** (render dentro de `NavigationContainer` e da `Raiz`, `AGORA` = sábado 17/10/2026, agenda de teste `2026-10-01..2026-10-31` com Academia seg a sex 05:00-06:00 e Culto dom 08:00-10:30):
  - mostra `"11 a 17 de outubro"`, 7 cartões, sábado destacado como hoje, `"Academia"` 5 vezes, `"Culto"` no domingo.
  - `"Semana anterior"` e `"Próxima semana"` navegam (`"4 a 10 de outubro"`, `"18 a 24 de outubro"`); a próxima semana (18 a 24) continua com agenda.
  - semana de `25 a 31 de outubro` mais `1 a 7 de novembro` com agenda de novembro: o nome da agenda aparece no cartão do dia 1/11 (Review Focus 5); dia sem agenda mostra `"Nada marcado"` e `"+ Adicionar"` e um avulso nesse dia aparece.
  - sem agenda alguma: mostra `"Montar a agenda de outubro"` e `"Começar em branco"`.
  - a barra de abas tem 5 itens na ordem Hoje, Agenda, Calendário, Histórico, Perfil.
  - tocar em `"+ Adicionar"` de sexta navega para `Compromisso` com `data: "2026-10-16"`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/AgendaScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar** as telas e a navegação. Em `AgendaScreen` mantenha o estado `semanasAtras` com setas como em `HistoricoScreen`, mas **sem limite** de navegação para frente.
- [ ] **Step 4: Checkpoint.** Run: `npm test && npm run typecheck && npm run lint`. Expected: toda a suíte passa, inclusive `HistoricoEAbas` ajustado para 5 abas.

---

### Task 7: Tela de compromisso (criar e editar)

**Files:**
- Create: `src/screens/CompromissoScreen.tsx`
- Test: `src/__tests__/CompromissoScreen.test.tsx`

**Interfaces:**
- Consumes: `useAgenda`, `SeletorDeDias`, `SeletorDeHorario`, `RaizParamList["Compromisso"]`, `CATEGORIAS`, `Card`, `Text`, `Screen`, `SegmentedControl`.
- Produces: `CompromissoScreen` (padrão), com estes comportamentos:
  - Atividade: lista do catálogo agrupada por categoria (e "Sem categoria"), com busca por nome, e "Nova atividade" (nome, ícone de `ICONES_ATIVIDADE`, categoria opcional entre as 5 de `CATEGORIAS`) que usa `criarAtividade` e seleciona a nova.
  - Dias (`SeletorDeDias`), início e fim (`SeletorDeHorario`; "Sem horário de término" desliga o fim), detalhe, antecedência em minutos (campo numérico 0 a 120, vazio = sem aviso).
  - Repetição por `SegmentedControl`: `"Toda semana"` (padrão) ou `"Só neste dia"`, com a data da rota; "Toda semana" pré-marca o dia da semana de `data`.
  - Salvar: sem agenda para a data mostra o erro `"Crie uma agenda para este período antes"` com atalho para `Agendas`. Em agenda em curso, ao editar ou remover um compromisso recorrente, pergunta `"A partir de hoje"` (padrão) ou `"O período todo"` (com aviso de que muda os dias já passados). Remover pede confirmação. Erros de `Resultado` aparecem sob o campo ou no topo, em texto, com `accessibilityRole="alert"`.
  - Rota com `compromissoId` ou `avulsoId` inexistente: mostra "Compromisso não encontrado" e volta, sem lançar erro.

- [ ] **Step 1: Escrever os testes que falham** (renderize a tela com `route.params` e um `navigation` de teste):
  - criar compromisso "Toda semana": escolher atividade existente, dias seg e qua, início 05:00, fim 06:00, salvar; `useAgenda().dados` passa a ter o compromisso e a tela volta.
  - criar "Só neste dia" a partir de `data: "2026-10-16"` vira um `Avulso` e não altera a agenda.
  - "Nova atividade" com nome repetido mostra `"Já existe uma atividade com este nome"` e não fecha.
  - fim antes do início mostra `"O término deve ser depois do início"` e não salva.
  - editar numa agenda em curso mostra a pergunta de escopo; escolher `"A partir de hoje"` divide a agenda; `"O período todo"` não divide.
  - em agenda que ainda não começou, editar não pergunta escopo.
  - remover pede confirmação; confirmar remove.
  - `compromissoId` inexistente mostra `"Compromisso não encontrado"`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/CompromissoScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar** a tela e registrá-la em `Raiz.tsx`. Mantenha o rascunho em `useState` local; só chama o hook ao salvar.
- [ ] **Step 4: Checkpoint.** Run: `npm test && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 8: Tela de gerenciar agendas

**Files:**
- Create: `src/screens/AgendasScreen.tsx`
- Test: `src/__tests__/AgendasScreen.test.tsx`

**Interfaces:**
- Consumes: `useAgenda`, `nomeDeAgendaDoMes`, `validarAgenda`, `Card`, `Text`, `Screen`.
- Produces: `AgendasScreen` (padrão): lista de agendas por `inicio` (nome, período `"01/11/2026 a 30/11/2026"`, quantidade de compromissos), com por agenda: `"Duplicar para o próximo mês"`, `"Editar período"` (nome, início e fim em campos `AAAA-MM-DD` com máscara) e `"Remover"` (confirmação: "remove só os compromissos desta agenda"). Botão `"Nova agenda"` com o mês atual pré-preenchido (`nomeDeAgendaDoMes`, primeiro e último dia). Erros de `Resultado` em texto (`"Já existe agenda neste período"` com atalho para abrir a existente). Após duplicar, mostra a agenda criada em destaque.

- [ ] **Step 1: Escrever os testes que falham:**
  - com a agenda de novembro de 2026, `"Duplicar para o próximo mês"` cria `"Dezembro de 2026"` e ela aparece na lista.
  - duplicar de novo mostra `"Já existe agenda neste período"`.
  - `"Nova agenda"` abre com `"Outubro de 2026"` e `2026-10-01` a `2026-10-31` (AGORA = 17/10/2026); salvar sobreposta mostra o erro; salvar válida cria.
  - editar o período para `fim` anterior ao `inicio` mostra erro e não salva.
  - remover pede confirmação e remove só a agenda (atividades e avulsos continuam).
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/AgendasScreen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar** e registrar em `Raiz.tsx` (já declarada na Task 6). Ligue também o cartão "Montar a agenda de {mês}" e "Começar em branco" da `AgendaScreen`: o primeiro abre `Agendas` já com o formulário de nova agenda do mês atual; o segundo cria a agenda do mês atual vazia.
- [ ] **Step 4: Checkpoint.** Run: `npm test && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 9: Dados de exemplo (só desenvolvimento)

**Files:**
- Create: `src/dev/agendaDeExemplo.ts`
- Modify: `src/screens/AgendaScreen.tsx` (bloco `DEV` com "Carregar agenda de exemplo" e "Limpar", renderizado só com `__DEV__`, no padrão de `FerramentasDeDesenvolvimento` de `HistoricoScreen.tsx`)
- Test: `src/__tests__/agendaDeExemplo.test.ts`

**Interfaces:**
- Produces: `gerarAgendaDeExemplo(novoId: () => string, agora: Date): DadosAgenda`. A agenda cobre o mês de `agora`. Atividades e categorias: Academia (exercicio), Aula (estudo), Estudar (estudo), Trabalho, Uber, Casa, Montese, Isabela, Culto, Acordar (sem categoria).
  - Compromissos (dia: horários), copiados do caderno: Acordar 04:30 todos os dias; Academia 05:00-06:00 seg a sex; Aula 07:30 seg e ter, 19:00-21:00 seg; Trabalho 12:00-18:00 seg, ter e qui, 09:00-15:00 qua e sex; Uber 15:30-19:00 qua, 15:30-20:00 sex; Casa 20:00 ter, qua e qui; Montese 20:00-23:00 sex; Estudar 14:00-17:00 sáb; Isabela 19:00 sáb; Culto 08:00-10:30 dom. A linha de sábado de manhã ("piscina, café, cortar cabelo") não tem horário e **não entra**.

- [ ] **Step 1: Escrever os testes que falham:** o resultado passa em todos os validadores; segunda-feira tem Acordar, Academia, Aula 07:30, Trabalho, Aula 19:00 nesta ordem; sexta tem Uber 15:30-20:00 e Montese 20:00-23:00 sem conflito entre si (encostam); domingo tem só Acordar e Culto; sábado tem Acordar, Estudar e Isabela; nenhum compromisso referencia atividade inexistente; a agenda cobre exatamente o mês de `agora`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `npx jest src/__tests__/agendaDeExemplo.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** o gerador e o bloco DEV (botões chamam `substituir`).
- [ ] **Step 4: Checkpoint.** Run: `npm test && npm run typecheck && npm run lint`. Expected: PASS.

---

### Task 10: Verificação visual, documentação e entrega

**Files:**
- Modify: `package.json` (dependências de desenvolvimento para a web), `docs/05-funcionalidades-e-fluxos.md`, `docs/03-guia-telas-figma.md`, `README.md` (marcar etapa 1 como pronta para teste)

- [ ] **Step 1: Verificação geral.** Run: `npm run typecheck && npm run lint && npm test`. Expected: tudo verde; mostre a saída real ao dono, incluindo o número de testes (linha de base mais os novos).
- [ ] **Step 2: Instalar a web para visualização.** Run: `npx expo install react-native-web react-dom @expo/metro-runtime`. Expected: instalado sem conflito com o SDK 57.
- [ ] **Step 3: Subir o app na web em segundo plano** (não trava o terminal): `npx expo start --web --port 8081` com `run_in_background`. Abra `http://localhost:8081` com Playwright em 390x844, toque em "Carregar agenda de exemplo" e tire capturas da aba Agenda (semana com compromissos, semana vazia), do formulário de compromisso (criar e editar) e da tela Agendas, nos temas claro e escuro. Anexe as capturas na resposta. Se a web falhar por módulo nativo, registre o erro, não esconda: o fallback do seletor de horário é só para esta verificação.
- [ ] **Step 4: Documentar.** Em `docs/05` acrescente as funções da agenda (ver Agenda, criar e editar compromisso, avulso, agendas por período, duplicar, dividir "a partir de hoje") com critérios de aceite em checkboxes; em `docs/03` descreva as 3 telas novas; no README troque a etapa 1 para "pronta para teste no aparelho".
- [ ] **Step 5: Checklist de teste manual no Expo Go** (entregue ao dono, numerado, com o que ver em cada passo): abrir o app, ir à aba Agenda, carregar a agenda de exemplo, conferir a semana contra o caderno, criar um compromisso "Toda semana", criar um avulso pelo "+ Adicionar", editar com "A partir de hoje" e conferir que o dia anterior não mudou, duplicar para dezembro, fechar o app por completo e reabrir conferindo que tudo ficou. Informar o que **não** foi testado: alertas (etapa 3), Android real, nuvem.
- [ ] **Step 6: Parar.** Mostrar `git status` e `git diff --stat` e **esperar a aprovação do dono** antes de qualquer commit. O commit, em Conventional Commits em português e sem menção a assistentes de IA, só acontece depois do "ok". Push só com confirmação.

---

## Self-review

- **Cobertura do design:** seção 5 (modelo e regras) nas Tasks 1 a 3; duplicar, dividir e fuso nas Tasks 2 e 4; 7.1 (telas) nas Tasks 5 a 8; 7.3 (exemplo e web) nas Tasks 9 e 10; 7.4 (erros e bordas) nas Tasks 3, 6 e 7; 7.5 (testes) em todas; seção 9 (documentação) na Task 10. "Primeiro acesso" na Task 6 e 8. A pergunta de escopo da edição na Task 7. A seção 8 (categoria agrupa, "Feito" gera ação) é da etapa 2 e não entra aqui, mas o campo `categoria` da atividade entra nesta etapa (Tasks 1, 7 e 9).
- **Desvio do design:** o item "turno" foi retirado da tabela de arquitetura (nenhuma tela o usa), e o design foi corrigido junto.
- **Consistência de tipos:** `Resultado<T>`, `Ocorrencia`, `EscopoDaEdicao`, `RaizParamList` e os nomes das funções são os mesmos entre as tarefas. `salvarCompromisso`/`removerCompromisso` recebem `agendaId` e `escopo` na Task 4 e são usados assim nas Tasks 6 e 7.
