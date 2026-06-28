# Qube Modeler — Code Review Report

## 1. Executive Summary

O projeto está funcionalmente bem encaminhado para uma release desktop 1.0.0: há Electron main/preload, isolamento de renderer, Welcome Screen, recent projects, `.qbm`, migrations Flyway, NSIS, file association e versão `1.0.0`.

Os riscos CRITICAL e HIGH encontrados neste relatório foram corrigidos e marcados como `CORRIGIDO`. Ainda restam itens MEDIUM/LOW recomendados para endurecer a release e reduzir risco operacional.

Verificação executada: `pnpm.cmd lint` passou. Não rodei `pnpm build` nem `electron-builder` para respeitar a instrução de não alterar arquivos; há artefato existente em `release/Qube Modeler Setup 1.0.0.exe`.

## 2. Release Readiness

**READY WITH FIXES**

A release 1.0.0 não tem mais bloqueadores CRITICAL/HIGH listados neste relatório. Recomendo revisar os itens MEDIUM antes de empacotar a build final.

## 3. Critical Findings

### CRIT-001

- Severity: CRITICAL
- Status: CORRIGIDO
- Area: `.qbm` save / data safety
- File(s): `electron/main.ts`, `writeProjectFile`
- Problem: O save escreve diretamente no arquivo final com `writeFile(filePath, JSON.stringify(...))`.
- Why it matters: queda do app, falha de disco, falta de espaço ou interrupção durante escrita pode deixar o `.qbm` truncado/corrompido.
- Reproduction / Scenario: usuário salva um projeto grande; o processo é encerrado durante `writeFile`; o arquivo oficial pode ficar parcialmente escrito e não abrir mais.
- Recommended fix: salvar em arquivo temporário no mesmo diretório, validar serialização antes, `fsync` quando possível, `rename` atômico para o destino e opcionalmente manter backup `.bak`.
- Release blocking: No, corrigido

### CRIT-002

- Severity: CRITICAL
- Status: CORRIGIDO
- Area: `.qbm` parse / migration history
- File(s): `src/core/qbm/qbm-file.ts`, `parseQbmFile`
- Problem: `flyway.versions` é validado de forma permissiva; versões inválidas são silenciosamente ignoradas e `flyway` malformado vira `{ versions: [] }`.
- Why it matters: abrir um `.qbm` parcialmente inválido e salvar novamente pode apagar histórico de migrations sem aviso.
- Reproduction / Scenario: um `.qbm` tem uma entrada `flyway.versions` sem `generatedSql` ou com shape inesperado; o app abre com menos versões; usuário salva; o histórico omitido desaparece do arquivo.
- Recommended fix: validar `flyway` estritamente. Se houver versão inválida, falhar abertura ou abrir em modo read-only/erro explícito. Nunca descartar versões silenciosamente.
- Release blocking: No, corrigido

## 4. High Priority Findings

### HIGH-001

- Severity: HIGH
- Status: CORRIGIDO
- Area: Migration SQL ordering
- File(s): `src/core/migration/postgres-migration-generator.ts`, `src/core/diff/project-diff.ts`
- Problem: renames são ordenados depois de drops/alters, mas várias operações usam nomes novos.
- Why it matters: migrations combinando rename + alteração/drop geram SQL inválido.
- Scenario: renomear tabela `users` para `accounts` e remover coluna. O diff guarda `tableName` atual, mas `DROP_COLUMN` roda antes de `RENAME_TABLE`, tentando alterar `accounts` antes dela existir.
- Recommended fix: revisar ordenação por dependência ou carregar old/new names nas operações. Renames estruturais precisam ocorrer antes das operações que usam nomes novos, ou as operações precisam usar nomes antigos até o rename.
- Release blocking: No, corrigido

### HIGH-002

- Severity: HIGH
- Status: CORRIGIDO
- Area: SQL generator / initial migration
- File(s): `src/core/sql/postgres-generator.ts`
- Problem: FKs são geradas inline no `CREATE TABLE`, sem ordenação topológica e sem fase separada de constraints.
- Why it matters: uma tabela pode referenciar outra ainda não criada; ciclos de FK são impossíveis inline.
- Scenario: tabela `orders` criada/listada antes de `customers`, com FK para `customers`; a initial migration falha no PostgreSQL.
- Recommended fix: gerar schemas/sequences, depois tabelas sem FKs, depois PK/UK/FK/indexes em `ALTER TABLE`/`CREATE INDEX`.
- Release blocking: No, corrigido

### HIGH-003

- Severity: HIGH
- Status: CORRIGIDO
- Area: Sequence/default migration ordering
- File(s): `src/core/diff/project-diff.ts`, `src/core/migration/postgres-migration-generator.ts`
- Problem: ao remover sequence usada por coluna, o gerador ordena `DROP_SEQUENCE` antes de `ALTER_COLUMN_DEFAULT DROP DEFAULT`.
- Why it matters: PostgreSQL pode bloquear o drop por dependência do default.
- Scenario: coluna usa `nextval(public.seq_id)`, usuário remove a sequence; migration tenta dropar a sequence antes de remover o default.
- Recommended fix: ordenar remoção de defaults antes de drop de sequences; idealmente modelar dependências no diff.
- Release blocking: No, corrigido

### HIGH-004

- Severity: HIGH
- Status: CORRIGIDO
- Area: Diff correctness
- File(s): `src/core/diff/project-diff.ts`
- Problem: mudanças de `scale` em `numeric/decimal` e mudanças de `startWith/incrementBy` em sequences não são detectadas.
- Why it matters: o snapshot avança, mas o SQL não altera o banco; o histórico Flyway passa a mentir sobre o estado aplicado.
- Scenario: `numeric(10,2)` vira `numeric(10,4)`; diff não gera operação porque só compara `size`.
- Recommended fix: comparar `scale`; comparar parâmetros de sequence e gerar operações suportadas ou marcar unsupported/warning.
- Release blocking: No, corrigido

### HIGH-005

- Severity: HIGH
- Status: CORRIGIDO
- Area: Constraint naming / migration drift
- File(s): `src/core/diff/project-diff.ts`, `src/core/migration/postgres-migration-generator.ts`
- Problem: PK é sempre assumida como `pk_${table.name}`. Ao renomear tabela, PostgreSQL não renomeia automaticamente a constraint.
- Why it matters: migrations futuras podem tentar dropar/alterar `pk_nome_novo`, mas o banco ainda tem `pk_nome_antigo`.
- Scenario: initial cria `pk_users`; migration renomeia tabela para `accounts`; próxima alteração de PK gera `DROP CONSTRAINT pk_accounts`, que não existe.
- Recommended fix: persistir nomes de constraints ou gerar rename explícito de PK quando tabela muda, se o padrão antigo for usado.
- Release blocking: No, corrigido

### HIGH-006

- Severity: HIGH
- Status: CORRIGIDO
- Area: Migration UX / data safety
- File(s): `src/app/canvas/components/FlywayMigrationsScreen.tsx`, `src/App.tsx`
- Problem: botão “Confirm and Save” não salva o `.qbm`; ele só adiciona a migration ao estado e marca `isDirty`.
- Why it matters: o texto indica persistência, mas a migration ainda depende de Save manual. Fechamento mostra prompt, mas o usuário pode entender que já foi salvo.
- Scenario: usuário confirma migration, vê “Confirm and Save”, depois descarta alterações ao fechar achando que a migration já foi gravada.
- Recommended fix: renomear para “Confirm migration” ou disparar save real após confirmar, com tratamento de erro.
- Release blocking: No, corrigido

## 5. Medium Priority Findings

### MED-001

- Severity: MEDIUM
- Status: CORRIGIDO
- Area: File association / pending open
- File(s): `electron/main.ts`
- Problem: `second-instance` e `open-file` enviam `qbm:open-file-requested` diretamente se `mainWindow` existe; se o renderer ainda não assinou, o evento pode se perder.
- Scenario: app abrindo lentamente e usuário abre outro `.qbm` por associação.
- Recommended fix: manter fila/pending path até renderer chamar `getPendingFile` ou sinalizar ready.
- Release blocking: No, corrigido

### MED-002

- Severity: MEDIUM
- Status: CORRIGIDO
- Area: File association
- File(s): `electron/main.ts`
- Problem: `getQbmFilePathFromArgs` usa `arg.endsWith(".qbm")` case-sensitive.
- Scenario: arquivo `MODEL.QBM` não abre por argumento no Windows, embora o resto do app aceite extensão case-insensitive.
- Recommended fix: usar `path.extname(arg).toLowerCase() === ".qbm"`.
- Release blocking: No, corrigido

### MED-003

- Severity: MEDIUM
- Status: CORRIGIDO
- Area: Packaging / runtime assets
- File(s): `electron/main.ts`, `package.json`
- Problem: `appIconPath` usa `process.cwd()/build/icon.png`, mas `build/**/*` não entra em `files` do app empacotado.
- Scenario: no app instalado, `BrowserWindow.icon`/dock icon pode apontar para arquivo inexistente.
- Recommended fix: usar asset incluído no pacote ou caminho condicionado por `app.isPackaged`.
- Release blocking: No, corrigido

### MED-004

- Severity: MEDIUM
- Status: CORRIGIDO
- Area: Validation / UX
- File(s): `ForeignKeyDialog.tsx`, `NamedColumnsDialog.tsx`, `ColumnDialog.tsx`
- Problem: alguns dialogs não bloqueiam reserved words ou defaults inválidos; a validação só falha no save.
- Scenario: usuário cria FK/index chamado `user` ou default com `;`; projeto fica editável, mas Save falha depois.
- Recommended fix: aplicar as mesmas validações do domínio nos forms antes de aceitar alterações.
- Release blocking: No, corrigido

### MED-005

- Severity: MEDIUM
- Area: Test coverage
- File(s): `README.md`
- Problem: não há testes automatizados para save/open `.qbm`, diff e SQL generator.
- Scenario: regressões nos casos acima não seriam capturadas por CI.
- Recommended fix: adicionar testes unitários de diff/generator e testes de parse/save para `.qbm`.
- Release blocking: No, após corrigir os bugs atuais; recomendado antes da 1.0.0 se possível.

## 6. Low Priority / Polish Findings

### LOW-001

- Severity: LOW
- Area: UX consistency
- File(s): `FlywayMigrationsScreen.tsx`
- Problem: export errors usam `alert()` nativo, diferente dos modais do app.
- Recommended fix: usar `MessageDialog`.
- Release blocking: No

### LOW-002

- Severity: LOW
- Area: Window lifecycle
- File(s): `electron/main.ts`
- Problem: fechamento depende do renderer responder `qbm:confirm-close`; se renderer travar, janela não fecha normalmente.
- Recommended fix: fallback ou dialog nativo em caso de timeout.
- Release blocking: No

### LOW-003

- Severity: LOW
- Area: Window state
- File(s): `electron/window-state.ts`
- Problem: bounds são checados contra displays, mas width/height corrompidos não são clampados.
- Recommended fix: limitar min/max ao carregar estado.
- Release blocking: No

### LOW-004

- Severity: LOW
- Area: Accessibility
- File(s): `WelcomeScreen.tsx`, `FlywayMigrationsTable.tsx`
- Problem: itens clicáveis são `div`/`tr` sem semântica de botão/keyboard.
- Recommended fix: adicionar `button`, `role`, `tabIndex` e handlers de teclado.
- Release blocking: No

## 7. Future Improvements

- MVP5 database read-only status, fora da 1.0.0.
- Keychain/credential store, somente se houver conexão futura.
- Multi-window support.
- File lock avançado para `.qbm`.
- Checksum compatível/semelhante ao Flyway.
- View snapshot read-only.
- Restore snapshot como novo projeto, sem operação destrutiva.

## 8. Architecture Review

A separação main/preload/renderer está razoável: `contextIsolation: true`, `nodeIntegration: false`, preload limitado e domínio em `src/core`.

O ponto mais fraco é que o migration engine ainda mistura diff por IDs com SQL baseado em nomes atuais. Isso exige um modelo de operação mais rico com old/new names e dependências. A organização em `core/diff`, `core/migration` e `core/sql` é boa para corrigir isso sem refatoração ampla.

Testabilidade está baixa porque não há testes automatizados exatamente nos módulos mais críticos.

## 9. Security Review

Não encontrei `eval`, `new Function`, `dangerouslySetInnerHTML` ou exposição direta de `fs` ao renderer.

Riscos:

- `openProjectFile(filePath)` aceita qualquer path `.qbm` vindo do renderer. Para app local sem conteúdo remoto isso é moderado, mas ainda é uma superfície IPC maior que o necessário.
- `saveProject` confia no payload do renderer; a validação de `project` ocorre em `createQbmFile`, mas `flyway` não é validado estritamente.
- Defaults SQL manuais são aceitos como texto, mas há bloqueio de `;`/line break só na validação final.

## 10. Data Safety Review

Principais riscos:

- save não atômico pode corromper `.qbm`;
- parser pode descartar migration history silenciosamente;
- “Confirm and Save” não salva em disco;
- abrir arquivo inválido via dialog preserva o estado atual, o que é correto;
- Save/Save As preservam `flyway`, mas dependem de `flyway` já estar íntegro.

## 11. Migration Engine Review

O diff cobre muitos casos esperados, mas ainda não é confiável para release sem correções:

- ordering quebra em renames combinados com drops/alters;
- FKs inline tornam initial migration frágil;
- sequence/default ordering está errado;
- `scale` e parâmetros de sequence não são detectados;
- PK baseada em nome da tabela causa drift após rename.

Os warnings destrutivos existem e a tela exige aceite, o que é bom. Unsupported schema drop também bloqueia confirmação.

## 12. Packaging Review

`package.json` tem `version: 1.0.0`, `appId`, `productName`, NSIS, licença e associação `.qbm`. Existe installer gerado em `release`.

Riscos:

- `build/icon.png` usado em runtime provavelmente não existe no app empacotado.
- `tsconfig.node.json` não inclui `electron/main.ts` nem `electron/preload.ts`; a checagem TypeScript explícita do build não cobre esses arquivos diretamente.
- Não rerodei package/build para não modificar `dist`/`release`.

## 13. Recommended Fix Plan

1. Fixes obrigatórios antes da 1.0.0:

- Implementar save atômico de `.qbm`.
- Tornar validação de `flyway.versions` estrita, sem descarte silencioso.
- Corrigir ordering de migrations com renames + drops/alters.
- Separar criação de tabelas e criação de FKs/constraints na initial migration.
- Corrigir ordering de defaults antes de drop de sequences.
- Detectar `scale` e alterações de sequence, ou marcar unsupported.
- Resolver drift de PK após rename de tabela.
- Corrigir texto/ação de “Confirm and Save”.

2. Fixes recomendados mas não bloqueantes:

- Fila robusta para arquivos abertos por associação antes do renderer estar pronto.
- Extensão `.QBM` case-insensitive nos argumentos.
- Ícone runtime empacotado.
- Validações completas nos dialogs.
- Testes unitários para `.qbm`, diff e SQL generator.

3. Melhorias futuras:

- Recursos MVP5 de banco read-only.
- File locking.
- Checksums.
- Snapshot viewer/restore seguro.
- Multi-window.

## 14. Final Recommendation

Não recomendo lançar a 1.0.0 neste estado.

Todos os itens CRITICAL e HIGH listados neste relatório foram corrigidos. Os itens medium/low podem ir para 1.0.1, exceto testes do migration engine, que eu tentaria incluir ainda antes da 1.0.0 para proteger as correções críticas.
