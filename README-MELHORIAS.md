# Melhorias implementadas

A pasta `src` foi atualizada integralmente em TypeScript/TSX e mantém a interface existente.

## O que foi conectado

- CRUD de produtos, categorias, mesas e funcionários passa pelo `src/services/api.ts` antes de atualizar a interface.
- O modo de demonstração usa uma base local persistente em `localStorage` quando o app está rodando na web; no mobile, mantém os dados durante a sessão. Para usar o backend real, altere `USE_MOCK_API` para `false` e configure `API_BASE_URL`.
- O `CatalogProvider` hidrata as listas através da API na abertura do app.
- `src/data/mockDatabase.tsx` é a fonte mock central de produtos, categorias, mesas, equipe, configurações e pedidos; o admin, atendimento e cozinha compartilham o mesmo estado persistido.
- Buscas de pedidos e produtos filtram em tempo real, e as abas de status/categoria modificam as listas.
- O botão de funil abre filtros avançados para faixa de preço e intervalo de datas.
- Validações de preço, telefone, CPF e duplicidade de mesas são aplicadas antes do envio.
- Mesas possuem ações persistentes de abrir, fechar conta, dividir e receber. O recebimento calcula troco para pagamento em dinheiro e libera a mesa.
- Pedidos têm modal de detalhes com itens, total, observações, histórico e impressão nativa.
- Produtos aceitam imagem da galeria; a imagem é armazenada no registro do produto.
- Relatórios geram PDF pelo Expo Print e oferecem compartilhamento do arquivo.
- Configurações, alteração de senha e encerramento de sessões usam os endpoints de conta/configuração.

## Dependências Expo adicionais

No projeto Expo/React Native, instale os módulos usados nesta versão:

```bash
npx expo install expo-image-picker expo-print expo-sharing
```

Depois, execute a checagem:

```bash
npx tsc --noEmit
```

Se o projeto tiver um backend pronto, ajuste no arquivo `src/services/api.ts`:

```ts
export const API_BASE_URL = 'https://seu-backend.example.com';
export const USE_MOCK_API = false;
```

A API esperada possui endpoints REST para `/products`, `/categories`, `/tables`, `/staff`, `/settings`, `/orders`, `/auth/login`, `/account/change-password`, `/account/end-other-sessions` e `/reports/export-pdf`.
