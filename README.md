# SmartLar

Loja online de utilidades para o lar, com entrega em Maputo e Matola.
Frontend, backend, base de dados, checkout próprio, gestão de pedidos, notificação automática
por WhatsApp e Meta Pixel — tudo numa aplicação Next.js pronta para a Vercel.

**Inovação • Conforto • Para o seu lar.**

---

## Índice

1. [Instalação](#1-instalação)
2. [Configurar o Supabase](#2-configurar-o-supabase)
3. [Criar a base de dados](#3-criar-a-base-de-dados)
4. [Configurar o M-Pesa](#4-configurar-o-m-pesa)
5. [Configurar o e-Mola](#5-configurar-o-e-mola)
6. [Configurar o Meta Pixel](#6-configurar-o-meta-pixel)
7. [Configurar a WhatsApp Business API](#7-configurar-a-whatsapp-business-api)
8. [Publicar na Vercel](#8-publicar-na-vercel)
9. [Variáveis de ambiente](#9-variáveis-de-ambiente)
10. [Como adicionar produtos](#10-como-adicionar-produtos)
11. [Como testar o checkout](#11-como-testar-o-checkout)
12. [Como testar as notificações](#12-como-testar-as-notificações)

---

## 1. Instalação

Precisa de Node.js 18.17 ou superior.

```bash
git clone <o-seu-repositorio> smartlar
cd smartlar
npm install
cp .env.example .env.local
npm run dev
```

A loja fica em `http://localhost:3000`. Sem o Supabase configurado, o site abre e navega
normalmente, mas o catálogo aparece vazio e o checkout avisa que a base de dados não está ligada.

Comandos disponíveis:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Corre o build de produção |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm test` | Corre os testes (Vitest) |
| `npm run lint` | ESLint |

---

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região Europa dá boa latência para Moçambique).
2. Vá a **Project Settings → API** e copie para o `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

> A `service_role` ignora todas as regras de segurança. Ela só é lida em código de servidor
> (`src/lib/supabase/admin.ts` importa `server-only`, o que faz o build falhar se alguém a tentar
> usar num componente de navegador). Nunca a coloque numa variável começada por `NEXT_PUBLIC_`.

### Criar o seu utilizador de administrador

3. Vá a **Authentication → Users → Add user**, crie um utilizador com e-mail e palavra-passe e
   marque *Auto Confirm User*.
4. Ponha esse e-mail em `ADMIN_EMAILS` (pode ter vários, separados por vírgula).

Só os e-mails desta lista entram em `/admin`. Se a lista estiver vazia, ninguém entra — é o
comportamento seguro por omissão.

### Criar os buckets de ficheiros

Em **Storage → New bucket**:

| Bucket | Visibilidade | Para quê |
| --- | --- | --- |
| `produtos` | **Público** | Fotografias dos produtos |
| `comprovativos` | **Privado** | Comprovativos de pagamento enviados pelos clientes |

Os comprovativos ficam privados de propósito: no painel, o link é gerado na hora e só dura 10 minutos.

---

## 3. Criar a base de dados

No painel do Supabase, abra **SQL Editor → New query** e execute, por esta ordem:

1. `supabase/schema.sql` — tabelas, índices, RLS, funções e triggers.
2. `supabase/seed.sql` — 6 categorias e 12 produtos de arranque (opcional, mas útil para testar).

O que o `schema.sql` cria:

- **Tabelas:** `products`, `categories`, `customers`, `orders`, `order_items`, `payments`,
  `notifications`, `activity_logs`, `site_settings`.
- **`create_order(payload jsonb)`** — cria cliente, encomenda, itens e pagamento numa única
  transação. Relê os preços na base de dados (o preço enviado pelo navegador é ignorado), bloqueia
  as linhas dos produtos com `FOR UPDATE`, confirma o stock, calcula o total no servidor, gera o
  número do pedido e reserva o stock. Se qualquer passo falhar, nada fica meio-criado.
- **`claim_purchase_event(order_number)`** — devolve `true` só na primeira chamada. É isto que
  impede o evento Purchase de disparar duas vezes num refresh.
- **`restore_stock(product_id, quantity)`** — devolve stock quando um pedido é cancelado.
- **RLS ligado em todas as tabelas.** O navegador só consegue ler produtos, categorias e
  definições. Encomendas, clientes e pagamentos não são acessíveis a partir do browser: passam
  sempre pelo servidor.

Os preços estão guardados em **centavos** (inteiros): 2.099,00 MT = `209900`. Evita erros de
arredondamento.

---

## 4. Configurar o M-Pesa

Neste momento o pagamento é **manual e confirmado por si** — não há integração com a API da Vodacom.

1. No `.env.local`, `MPESA_NUMBER=858910700` (já preenchido com o seu número).
2. Depois de a base de dados existir, o número que o site mostra vem de
   **/admin/configuracoes → Pagamentos**, e pode ser alterado sem mexer no código.

Fluxo: o cliente escolhe M-Pesa → o site mostra «Efetue o pagamento para: 85 891 0700» e o valor
exato → o cliente transfere e preenche o número usado e a referência da transação → a encomenda
fica em **Aguardando confirmação** → você confirma no painel com **Confirmar pagamento**.

O sistema **nunca** dá o pagamento como recebido só porque o cliente preencheu os campos.

Para automatizar mais tarde (M-Pesa Payment Gateway da Vodacom M-Pesa Open API), os estados de
pagamento já existem (`pending`, `awaiting_confirmation`, `paid`, `failed`, `cancelled`): basta um
webhook que passe o pagamento a `paid`.

---

## 5. Configurar o e-Mola

Igual ao M-Pesa: `EMOLA_NUMBER=870253638` e o número editável em **/admin/configuracoes**.

Pode desligar qualquer um dos métodos nessa mesma página — o cartão deixa de aparecer no checkout.

---

## 6. Configurar o Meta Pixel

1. Em [business.facebook.com](https://business.facebook.com) → **Gestor de Eventos** → crie um Pixel.
2. Copie o ID (15-16 dígitos) para `NEXT_PUBLIC_META_PIXEL_ID`.

Enquanto essa variável estiver vazia, **nenhum script da Meta é carregado** e o site funciona
normalmente. Não há nenhum ID fictício no código.

Eventos implementados:

| Evento | Quando dispara | Parâmetros |
| --- | --- | --- |
| `PageView` | Todas as páginas | — |
| `ViewContent` | Abrir um produto | `content_ids`, `content_name`, `content_type`, `value`, `currency` |
| `AddToCart` | Adicionar ao carrinho | `content_ids`, `content_name`, `value`, `currency`, `num_items` |
| `InitiateCheckout` | Entrar no checkout ou clicar em «Finalizar compra» | `value`, `currency`, `num_items`, `content_ids` |
| `Purchase` | **Só depois** de o servidor confirmar a encomenda | `value`, `currency`, `content_ids`, `content_type`, `num_items`, `eventID` |

A moeda é sempre `MZN`.

### Purchase não duplica

Três travões, por ordem de importância:

1. **Base de dados** — `claim_purchase_event()` marca `purchase_tracked_at` e só devolve `true` uma vez.
2. **sessionStorage** — o navegador marca a encomenda como já registada.
3. **Referência do componente** — evita disparos repetidos na mesma renderização.

Um F5 em `/pedido-confirmado` não volta a contar a venda.

### Conversions API (opcional)

Preencha `META_CAPI_PIXEL_ID` e `META_CAPI_ACCESS_TOKEN` e o Purchase passa também a ser enviado
pelo servidor, com o **mesmo `event_id`** do Pixel — a Meta junta os dois e conta uma só conversão.
O telefone, o nome e a cidade vão em SHA-256, como a Meta exige. Sem o token, esta parte fica
inativa e nada quebra.

Use `META_CAPI_TEST_EVENT_CODE` durante os testes, no separador *Test Events* do Gestor de Eventos.

---

## 7. Configurar a WhatsApp Business API

O projeto usa a **Meta WhatsApp Cloud API** — a via oficial. Não há automação do WhatsApp Web em
lado nenhum, e nenhum token chega ao navegador.

### Passos na Meta

1. [developers.facebook.com](https://developers.facebook.com) → **Criar aplicação** → tipo *Business*.
2. Adicione o produto **WhatsApp** e associe uma conta WhatsApp Business (WABA).
3. Em **WhatsApp → API Setup**, copie:
   - *Phone number ID* → `WHATSAPP_PHONE_NUMBER_ID`
   - *WhatsApp Business Account ID* → `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. Gere um **token permanente** (System User em Business Settings, com a permissão
   `whatsapp_business_messaging`) → `WHATSAPP_ACCESS_TOKEN`.
5. Ponha o **seu** número em `ADMIN_WHATSAPP_NUMBER`, em formato internacional só com dígitos:
   `258` + o número. Exemplo: `258841234567`. O ficheiro `.env.example` deixa este campo vazio de
   propósito — não há nenhum número inventado no código.

### Templates

A Meta só deixa iniciar uma conversa com um **template aprovado**. Duas opções:

- **Sem template** (`WHATSAPP_ADMIN_TEMPLATE_NAME` vazio): envia texto livre. Só funciona se o
  número do administrador tiver falado com o número da empresa nas últimas 24 horas. Bom para testar.
- **Com template** (recomendado para produção): crie em *WhatsApp Manager → Message Templates* um
  template na categoria **Utility** com dois parâmetros — `{{1}}` para o número do pedido e `{{2}}`
  para o corpo da mensagem — e ponha o nome em `WHATSAPP_ADMIN_TEMPLATE_NAME`.

### Se ainda não tiver credenciais

Nada quebra. O painel mostra **«WhatsApp API não configurada»**, com a lista exata do que falta, e
a notificação de cada pedido fica com estado `failed` e a razão registada. Assim que configurar,
use **Reenviar WhatsApp** no pedido — não perde nenhuma encomenda.

### Mensagem que vai receber

```
🔔 NOVO PEDIDO — SMARTLAR

Pedido: #SL-000125

🛒 Produto:
• Irrigador Oral Elétrico × 1

💰 Total:
2.099 MT

👤 CLIENTE
Nome: João Manuel
Telefone: 841234567

📍 ENTREGA
Província: Maputo Província
Cidade: Matola
Bairro: Matola Gare
Referência: Próximo ao mercado

💳 PAGAMENTO
Método: M-Pesa
Estado: Aguardando confirmação

📅 Data:
09/08/2026 21:30
```

Com vários produtos, a lista cresce (`• Produto × quantidade`) e o total é sempre o final.
A data usa o fuso de Maputo (UTC+2).

### A encomenda nunca se perde

A ordem é sempre: **1)** gravar o pedido na base de dados, **2)** tentar notificar.
Se a API estiver em baixo, o pedido continua no painel e a notificação fica com
`notification_status = failed`, `attempts`, `last_error` e `sent_at` registados.

Reenvio manual: botões **Reenviar WhatsApp** / **Reenviar e-mail** no detalhe do pedido.
Reenvio automático: `GET /api/notifications/retry` (até 5 tentativas por notificação), já agendado
uma vez por dia (03h00) no `vercel.json` — os planos gratuitos (Hobby) da Vercel só permitem cron
jobs diários. Com o plano Pro pode aumentar a frequência (ex.: `0 * * * *` para de hora a hora).
Proteja-o com `CRON_SECRET` se quiser.

### Mensagem ao cliente

A arquitetura está pronta (`notifyCustomerOrderReceived`), mas **só liga** quando preencher
`WHATSAPP_CUSTOMER_TEMPLATE_NAME` com um template aprovado que receba `{{1}}` = primeiro nome e
`{{2}}` = número do pedido. Enquanto estiver vazio, não é enviado nada e nada é simulado.

---

## 8. Publicar na Vercel

### GitHub

```bash
git init
git add .
git commit -m "SmartLar: loja completa"
git branch -M main
git remote add origin https://github.com/<utilizador>/smartlar.git
git push -u origin main
```

O `.gitignore` já exclui `.env.local`, `node_modules` e `.next`. **Confirme que o `.env.local`
não vai no commit** — só o `.env.example` deve estar no repositório.

### Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
2. O framework é detetado sozinho (Next.js). Não mexa nos comandos de build.
3. Em **Settings → Environment Variables**, adicione **todas** as variáveis do `.env.example`
   (Production e Preview). `NEXT_PUBLIC_SITE_URL` passa a ser o domínio real, ex.:
   `https://smartlar.co.mz`.
4. **Deploy**.
5. Volte ao Supabase → **Authentication → URL Configuration** e acrescente o domínio da Vercel.

Depois de mudar qualquer variável de ambiente, faça um novo deploy para ela ser aplicada.

---

## 9. Variáveis de ambiente

| Variável | Onde vive | Obrigatória | Para quê |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador + servidor | Sim | Endereço do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador + servidor | Sim | Leitura pública do catálogo (com RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só servidor** | Sim | Criar pedidos, painel, storage |
| `ADMIN_EMAILS` | Só servidor | Sim | Quem pode entrar em `/admin` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Navegador | Não | Meta Pixel; vazio = sem Pixel |
| `META_CAPI_PIXEL_ID` | Só servidor | Não | Conversions API |
| `META_CAPI_ACCESS_TOKEN` | **Só servidor** | Não | Conversions API |
| `META_CAPI_TEST_EVENT_CODE` | Só servidor | Não | Testes no Gestor de Eventos |
| `ADMIN_WHATSAPP_NUMBER` | Só servidor | Para notificar | Número que recebe os avisos (`258...`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Só servidor | Para notificar | Número emissor na Cloud API |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Só servidor | Não | Referência da WABA |
| `WHATSAPP_ACCESS_TOKEN` | **Só servidor** | Para notificar | Token permanente da Meta |
| `WHATSAPP_API_VERSION` | Só servidor | Não | Por omissão `v21.0` |
| `WHATSAPP_ADMIN_TEMPLATE_NAME` | Só servidor | Não | Template para si; vazio = texto livre |
| `WHATSAPP_CUSTOMER_TEMPLATE_NAME` | Só servidor | Não | Vazio = mensagens ao cliente desligadas |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Só servidor | Não | Por omissão `pt_PT` |
| `MPESA_NUMBER` / `EMOLA_NUMBER` | Só servidor | Não | Valores iniciais; depois manda o painel |
| `NEXT_PUBLIC_SITE_URL` | Navegador | Sim em produção | URLs canónicos, sitemap, Open Graph |
| `CRON_SECRET` | Só servidor | Não | Protege `/api/notifications/retry` |

Nunca prefixe com `NEXT_PUBLIC_` nada que seja secreto: essas variáveis vão dentro do JavaScript
enviado ao navegador.

---

## 10. Como adicionar produtos

`/admin/produtos → Adicionar produto`.

- **Nome** — o endereço (slug) é sugerido automaticamente.
- **Preço** — em meticais, com vírgula: `2099,00`. O **preço anterior** é opcional e, quando
  existe, a loja mostra a percentagem de desconto e a etiqueta *Promoção*.
- **Stock** — desce sozinho a cada venda e volta a subir se cancelar o pedido.
- **Fotografias** — carregadas para o bucket `produtos`. Sem fotografia, a loja mostra um marcador
  neutro em vez de uma imagem partida.
- **Produto em destaque** aparece na secção de destaques da página inicial; **Novidade** na secção
  de novidades; **Visível na loja** controla se aparece de todo.

Produtos que já tenham vendas não são apagados — são desativados, para os pedidos antigos
continuarem coerentes.

---

## 11. Como testar o checkout

1. Abra um produto → **Adicionar ao carrinho** → `/carrinho` → **Finalizar compra**.
2. Preencha os dados. Telefone no formato `84XXXXXXX` (aceita também `+258 84...`).
3. Escolha M-Pesa ou e-Mola: aparece o número e o valor exato a transferir.
4. Preencha a referência da transação (e o comprovativo, se quiser) → **FINALIZAR PEDIDO**.
5. É redirecionado para `/pedido-confirmado/SL-00000X?t=...`.
6. Confirme em `/admin/pedidos` que o pedido aparece, com o estado **Pagamento pendente**.

O que deve verificar:

- **Preços** — altere o preço no painel com o carrinho já cheio e finalize: o total gravado é o do
  servidor, não o do navegador.
- **Stock** — o stock do produto desce depois da compra; peça mais unidades do que existem e a
  compra é recusada com uma mensagem clara.
- **Duplo clique** — clicar duas vezes em FINALIZAR PEDIDO cria **um** pedido só (chave de
  idempotência).
- **Carrinho persistente** — recarregue a página a meio: o carrinho mantém-se.
- **Página de confirmação** — sem o `?t=` correto não mostra os dados de ninguém.

Testes automáticos (`npm test`): formatação de preços, carrinho, cálculo de totais, validação do
checkout, número único de pedido, mensagem de notificação, limitação de pedidos repetidos e
proteção do Purchase duplicado.

O comportamento das funções SQL (`create_order`, idempotência, reserva de stock, rollback em caso
de falta de stock, `claim_purchase_event`) foi validado numa instância PostgreSQL 16 executando
`supabase/schema.sql` e `supabase/seed.sql`.

---

## 12. Como testar as notificações

**Sem credenciais configuradas:** crie um pedido e abra-o em `/admin/pedidos/...`. Na secção
*Notificação WhatsApp* deve ler `Estado: Falhou` e a razão exata (`WhatsApp API não configurada.
Em falta: ...`). O pedido continua lá, intacto. É este o comportamento correto — nada é fingido.

**Com credenciais:**

1. Preencha `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` e `ADMIN_WHATSAPP_NUMBER` e
   reinicie o servidor (`npm run dev`).
2. Se não usar template, envie primeiro uma mensagem qualquer do seu número para o número da
   empresa, para abrir a janela de 24 horas.
3. Crie um pedido de teste. A mensagem deve chegar em segundos.
4. No painel, a notificação passa a **Enviada**, com data e `provider_message_id`.
5. **Reenviar WhatsApp** volta a enviar e incrementa o contador de tentativas.
6. Para testar a falha: ponha um token inválido, crie um pedido (a notificação fica *Falhou* com a
   razão da Meta), reponha o token e carregue em **Reenviar WhatsApp**.

Os registos (`console`) usam JSON e escondem automaticamente qualquer campo cujo nome contenha
`token`, `key`, `secret` ou `password`. Nenhum token aparece nos logs.

---

## Estrutura do projeto

```
src/
  app/
    page.tsx                       Página inicial
    produtos/                      Catálogo e pesquisa
    produto/[slug]/                Página do produto (+ Schema.org)
    categorias/[slug]/             Produtos por categoria
    carrinho/  checkout/           Carrinho e checkout próprios
    pedido-confirmado/[orderNumber]/
    rastrear-pedido/               Consulta por número + telefone
    admin/login/                   Entrada no painel
    admin/(painel)/                Resumo, pedidos, produtos, configurações
    api/comprovativo/              Upload para bucket privado
    api/notifications/retry/       Reenvio automático de notificações
    sitemap.ts  robots.ts
  components/                      UI da loja e do painel
  lib/
    cart.ts  cart-store.ts         Carrinho (funções puras + estado persistente)
    money.ts  orders.ts            Preços em centavos e totais
    validation.ts                  Esquemas Zod, telefones moçambicanos
    pixel.ts  meta-capi.ts         Meta Pixel e Conversions API
    purchase-guard.ts              Proteção do Purchase duplicado
    whatsapp/                      message.ts, provider.ts, notify.ts
    supabase/                      client, server, admin (service role)
    auth.ts  rate-limit.ts  logger.ts  status.ts
  server/
    actions/                       checkout, orders, products, settings, auth, purchase, tracking
    admin-data.ts  orders-read.ts
supabase/
  schema.sql  seed.sql
tests/                             Vitest
middleware.ts                      Protege /admin
```

## Segurança

- Painel protegido por middleware **e** por verificação em cada página e ação (`requireAdmin`).
- RLS ligado em todas as tabelas; o navegador só lê o catálogo.
- Preços e totais calculados sempre no servidor.
- Validação e sanitização com Zod em todas as entradas.
- Idempotência na criação de pedidos e limitação de pedidos repetidos no checkout, no login e no upload.
- Comprovativos em bucket privado, com links temporários de 10 minutos.
- `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_ACCESS_TOKEN` e `META_CAPI_ACCESS_TOKEN` nunca saem do servidor.
