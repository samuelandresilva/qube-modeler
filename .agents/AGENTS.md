# Qube Modeler - AI Agent Instructions

Este arquivo contém diretrizes e regras específicas do projeto para orientar agentes de IA no desenvolvimento do **Qube Modeler**.

## Visão Geral do Projeto
O **Qube Modeler** é um editor visual de modelos de banco de dados PostgreSQL construído com React, TypeScript, Vite e React Flow (@xyflow/react).

## Comandos de Desenvolvimento
- Instalação: `pnpm install`
- Execução em desenvolvimento: `pnpm dev`
- Verificações de lint: `pnpm lint`
- Build de produção: `pnpm build`

## Estrutura do Código (`src/`)
- `app/`: Contém os componentes e a interface do usuário.
  - `canvas/components/`: Elementos visuais do editor e do diagrama.
  - `canvas/dialogs/`: Diálogos/formulários de criação e edição.
  - `canvas/hooks/`: Hooks de integração e controle do React Flow.
  - `canvas/mappers/`: Funções de conversão do domínio para o diagrama.
  - `canvas/styles/`: Estilos de CSS separados por componente.
  - `shared/`: Componentes e utilitários compartilhados e reutilizáveis.
- `core/`: Regras de negócio e domínio do modelador.
  - `diagram/`: Tipos e interfaces independentes de visualização.
  - `model/`: Entidades, consultas e comandos de alteração do modelo.
  - `sql/`: Regras de banco de dados e gerador de script SQL para PostgreSQL.
  - `validation/`: Validação estrutural de entidades do banco.
- `styles/`: Tokens globais de design e variáveis CSS.

## Regras de Arquitetura e Dependências (IMPORTANTE)
1. **Isolamento do Core**: A pasta `src/core` é puramente TypeScript. Ela **não** pode depender de React, hooks do React ou componentes visuais.
2. **Uso de Tipos e Comandos**: Componentes visuais devem interagir com o domínio utilizando exclusivamente tipos e comandos públicos exportados por `src/core/model`.
3. **Integridade do Domínio**: Operações que alteram referências relacionadas (como renomear tabelas, colunas, alterar tipos ou relacionamentos) devem permanecer encapsuladas no domínio (`src/core/model`), e não no canvas.
4. **Formulários Únicos**: Cada entidade (tabela, relacionamento, etc.) deve possuir um único diálogo/formulário para criação e edição (evitando lógica duplicada).
5. **Estilos e Design System**:
   - Os estilos específicos do canvas devem seguir o padrão BEM com o prefixo `canvas-` (ex: `canvas-node__header`).
   - Use os tokens de design CSS declarados em `src/styles/tokens.css`. Não utilize cores, espaçamentos ou tamanhos arbitrários "hardcoded".
