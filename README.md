# Qube Modeler

Editor visual de modelos PostgreSQL construído com React, TypeScript, Vite e React Flow.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Verificações disponíveis nesta etapa:

```bash
pnpm lint
pnpm build
```

Testes automatizados e o comando agregado `pnpm check` serão adicionados em uma etapa posterior.

## Organização

```text
src/
  app/
    canvas/
      components/   # elementos visuais do editor
      dialogs/      # formulários de criação e edição
      hooks/        # integração e estado do React Flow
      mappers/      # conversão do domínio para o diagrama
      styles/       # estilos separados por componente
    shared/         # componentes e utilitários reutilizáveis
  core/
    diagram/        # tipos independentes da visualização
    model/          # tipos, consultas e comandos do domínio
    sql/            # regras e geração PostgreSQL
    validation/     # validação estrutural por entidade
  styles/           # tokens globais de design
```

## Regras de dependência

- `core` não depende de React nem de componentes visuais.
- Componentes usam os tipos e comandos públicos exportados por `core/model`.
- Operações que alteram referências relacionadas, como renomear tabelas ou colunas, permanecem no domínio.
- Cada entidade possui um único diálogo para criação e edição.
- Estilos do canvas usam o prefixo BEM `canvas-` e tokens definidos em `src/styles/tokens.css`.
