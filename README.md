# Studio Jessica Rodrigues

> Plataforma institucional e de agendamento online para um estúdio de estética facial.

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-16.3.1-000000?style=flat-square&logo=next.js" alt="Next.js 16.3.1" />
  <img src="https://img.shields.io/badge/React-19.2.8-149ECA?style=flat-square&logo=react" alt="React 19.2.8" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SCSS-Glassmorphism-CC6699?style=flat-square&logo=sass&logoColor=white" alt="SCSS" />
  <img src="https://img.shields.io/badge/Google_APIs-Sheets_%7C_Calendar_%7C_Places-4285F4?style=flat-square&logo=google" alt="Google APIs" />
</p>

## Visão geral

Este projeto transforma o site institucional do Studio Jessica Rodrigues em uma experiência digital completa: apresenta os procedimentos, exibe avaliações reais, permite consultar horários disponíveis e oferece agendamento, reagendamento e cancelamento sem depender de atendimento manual.

O diferencial da solução é usar **Google Sheets como back-office operacional** e o **Google Calendar como agenda profissional**, evitando a necessidade de manter um banco de dados próprio para a operação do estúdio. A interface foi construída para transmitir cuidado e sofisticação, com uma linguagem visual baseada em **glassmorphism**, paleta lilás e experiência mobile-first.

## O que a aplicação entrega

- **Landing page institucional:** hero, apresentação do estúdio, procedimentos, resultados e contato.
- **Agendamento self-service:** procedimentos e horários carregados dinamicamente da planilha.
- **Área “Meus horários”:** consulta de agendamentos ativos por CPF.
- **Reagendamento e cancelamento:** fluxo guiado, atualização da disponibilidade e comunicação via WhatsApp.
- **Sincronização operacional:** gravação no Google Sheets e criação de evento no Google Calendar.
- **Avaliações do Google Maps:** nota média e comentários carregados pela Places API.
- **Página Link in Bio (`/links`):** experiência otimizada para mobile com WhatsApp, Instagram, localização e acesso direto ao agendamento.
- **Calendário do cliente:** geração de arquivo `.ics` para adicionar o compromisso à agenda pessoal.
- **Experiência instalável:** manifesto, ícones e `themeColor` configurados para o modo standalone.

## Stack e arquitetura

### Front-end

- **Next.js 16 + App Router:** estrutura de rotas, metadata, Route Handlers e renderização server-first.
- **React 19:** componentes funcionais e estado local para os fluxos interativos.
- **TypeScript:** contratos explícitos para slots, payloads de agendamento e respostas de integração.
- **Tailwind CSS 4 + SCSS:** utilitários para composição rápida e estilos globais/componentizados para a identidade visual.
- **Swiper:** carrosséis de procedimentos e conteúdo visual.
- **Font Awesome:** ícones de navegação, contato e ações.

### Back-end e integrações

- **Route Handlers do Next.js:** API interna no diretório `app/api`.
- **Google Sheets API / `google-spreadsheet`:** disponibilidade, procedimentos, agendamentos, cancelamentos e métricas.
- **Google Calendar API:** criação de eventos com data, horário, serviço e dados do cliente.
- **Google Places API:** avaliações e classificação do estabelecimento.
- **Service account:** autenticação server-side sem expor credenciais no navegador.

### Arquitetura de dados

1. A disponibilidade é lida das abas `Horários` e `Agendamentos`.
2. O servidor cruza os registros e usa um `Set` para remover slots ocupados com consulta `O(1)`.
3. Horários passados e reservas concluídas são filtrados antes de chegarem à interface.
4. O POST de agendamento valida o payload e impede mais de uma reserva do mesmo serviço por CPF no mês.
5. A reserva é persistida na planilha e o evento é enviado ao Google Calendar em paralelo.

## Decisões técnicas que merecem destaque

- **Consistência contra double booking:** validação de CPF, serviço e período antes da persistência.
- **Dados sempre atuais:** endpoints dinâmicos e cache busting na consulta de disponibilidade após alterações.
- **UX transacional:** o reagendamento reaproveita os dados do cliente, reposiciona o formulário e conduz o usuário até a escolha do novo horário.
- **Feedback sem alertas nativos:** modais e estados de sucesso, erro e informação mantêm o contexto da tarefa.
- **Responsividade real:** layout mobile-first, carrosséis adaptáveis e rota `/links` com composição própria.
- **Identidade visual consistente:** glass panels com blur, bordas translúcidas, gradientes lilás/dourados, tipografia editorial e animações SVG.
- **SEO e plataforma:** `lang="pt-BR"`, metadata, manifesto, viewport e componentes server-first configurados no App Router.

## Endpoints

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `GET` | `/api/availability` | Lista procedimentos e horários futuros livres. |
| `POST` | `/api/booking` | Valida e registra um agendamento; cria evento no Calendar. |
| `GET` | `/api/my-bookings?cpf=...` | Consulta agendamentos pelo CPF. |
| `POST` | `/api/my-bookings` | Cancela um agendamento por linha da planilha. |
| `GET` | `/api/reviews` | Retorna nota e avaliações do Google Maps. |
| `GET` | `/api/metrics` | Calcula procedimentos concluídos e clientes únicos. |
| `GET` | `/api/images` | Carrega URLs de imagens da aba `Banner`. |

## Estrutura principal

```text
app/
├── api/                    # Route Handlers e integrações server-side
├── components/             # Seções, carrosséis e formulário de agendamento
├── lib/
│   ├── config.ts           # Dados públicos do estúdio
│   └── google.ts           # Autenticação e operações Google
├── links/page.tsx          # Página Link in Bio
├── page.tsx                # Composição da landing page
└── styles/                 # SCSS global e media queries
public/
├── assets/                 # Imagens, logos, ícones e fontes da marca
└── manifest.json           # Configuração PWA
```

## Como executar localmente

### Pré-requisitos

- Node.js 20+
- npm
- Projeto Google Cloud com APIs Sheets, Calendar e Places habilitadas
- Service account com acesso à planilha e ao calendário

### Instalação

```bash
git clone https://github.com/Filipe-Alexandre/studio-jessica-rodrigues.git
cd studio-jessica-rodrigues
npm install
```

Crie um arquivo `.env.local` na raiz:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=
GOOGLE_CALENDAR_ID=primary
GOOGLE_PLACES_API_KEY=
PLACE_ID=
```

Compartilhe a planilha com o e-mail da service account. As abas esperadas são:

- `Procedimentos`: procedimentos a partir de `A2`.
- `Horários`: `id`, `data`, `dia`, `horário`, `status`.
- `Agendamentos`: `id`, `data`, `dia`, `horário`, `status`, `serviço`, `nome`, `telefone`, `CPF`.
- `Banner`: URLs de imagens na primeira coluna.

### Scripts disponíveis

```bash
npm run dev      # Desenvolvimento com Webpack
npm run lint     # ESLint
npm run build    # Build de produção
npm start        # Servidor de produção
```

Abra `http://localhost:3000` após iniciar o servidor.

> As credenciais ficam exclusivamente no ambiente do servidor. Nunca publique `.env.local`, chaves privadas ou IDs sensíveis no repositório.

## Estilo visual

O design system combina:

- **Paleta:** `#7C638D`, `#8C769C`, `#9C8CA9`, `#C4B2DA`, `#F5EFED`, com contrastes `#FFE9A6` e `#FFC985`.
- **Glassmorphism:** transparências, `backdrop-filter`, bordas suaves e sombras difusas.
- **Tipografia:** Cormorant Garamond para títulos editoriais, Brown Carolina para elementos de marca e Questrial para textos de interface.
- **Interação:** transições curtas, carrosséis, modais, feedback visual e rolagem suave.

## Status

Projeto em evolução, com foco em consolidar a presença digital do estúdio e reduzir o atrito entre descoberta, contato e agendamento.
