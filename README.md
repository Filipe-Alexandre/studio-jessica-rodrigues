# 🌸 Studio Jessica Rodrigues - Plataforma de Agendamento e Link in Bio

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

Uma aplicação web _Full-Stack_ desenvolvida para modernizar a gestão de clientes e horários de um estúdio de estética. O projeto consolida uma Landing Page institucional, um sistema de autoatendimento para marcação de horários e uma página agregadora de links (Link in Bio), tudo sob uma identidade visual proprietária baseada em **Glassmorphism**.

---

## 🎯 Objetivo do Projeto

Eliminar o atrito no processo de agendamento manual via WhatsApp, oferecendo autonomia para as clientes marcarem, consultarem, reagendarem ou cancelarem seus próprios horários. O sistema foi projetado para ter **custo zero de infraestrutura de banco de dados**, utilizando o ecossistema do Google Workspace (Sheets & Calendar) como backend operacional para a dona do estúdio.

---

## 🚀 Tecnologias e Arquitetura

### Front-end
*   **Next.js (App Router) & React:** Renderização híbrida otimizada e componentização.
*   **TypeScript:** Tipagem estática rigorosa para payloads de API, validações de CPF e tipagem de respostas do Google Sheets.
*   **SCSS Customizado (No CSS Frameworks):** Estilização feita do zero utilizando CSS Grid avançado (`grid-column: 1 / -1`), Flexbox e variáveis nativas.
*   **UI/UX Dinâmica:** Uso extensivo de _Glassmorphism_ (`backdrop-filter`), animações SVG síncronas controladas por estado (timers de 5s/10s) e modais customizados que substituem os alertas nativos do navegador.

### Back-end & Integrações
*   **Next.js Route Handlers (`app/api`):** Criação de uma API RESTful interna (`/api/booking`, `/api/availability`, `/api/my-bookings`).
*   **Google Sheets API (googleapis):** Atua como banco de dados NoSQL estruturado. O backend faz o cruzamento em tempo real (Join lógico) entre a aba de "Horários" (vagas) e "Agendamentos" (ocupações) usando estruturas de dados do tipo `Set` em memória para garantir performance `O(1)` na verificação de ocupação.
*   **Google Calendar API:** Inserção simultânea de eventos na agenda profissional da clínica.
*   **ICS Generator:** Geração de arquivos `.ics` nativos no front-end (Blob/URL Object) para que o cliente adicione o evento em sua própria agenda (Apple/Google Calendar).

---

## 🧠 Lógica de Negócio e Decisões Técnicas (Highlights)

1.  **Trava Dupla de Concorrência (Anti-Double Booking):**
    O backend verifica ativamente o CPF e o mês/ano da solicitação antes de gravar na planilha. A regra de negócio impede que um mesmo CPF reserve o mesmo serviço no mesmo mês calendário, protegendo a agenda contra spams ou reservas duplicadas acidentais.
2.  **Cache Busting Estratégico:**
    Devido ao cache agressivo nativo do Next.js, as chamadas para a API de vagas e buscas de CPF pelo cliente utilizam `?t=${Date.now()}`. Isso garante que cancelamentos ou reagendamentos reflitam instantaneamente na tela sem a necessidade de recarregar a página ou perder o estado do React.
3.  **Sistema de Reagendamento Transacional:**
    O fluxo de reagendamento não apenas exclui a linha antiga, mas automaticamente popula os estados do formulário (`nome`, `telefone`, `cpf`, `serviço`) e rola a tela suavemente para a grade de vagas, proporcionando uma experiência contínua (Frictionless UX).
4.  **Isolamento de Layouts Complexos:**
    Uso de seletores avançados como `:has()` no CSS para mutar fundos globais dependendo da rota atual, permitindo que a página `/links` tenha proporções exclusivas de imagens sem quebrar a estrutura da Landing Page principal.

---

## 📱 Funcionalidades (Features)

*   **Página Institucional:** Apresentação de procedimentos, resultados em formato de cards e avaliações.
*   **Agendamento Self-Service:** Listagem dinâmica de meses e horários livres.
*   **Meus Horários (Painel do Cliente):** Consulta de horários ativos vinculados ao CPF.
*   **Cancelamento Automático:** Libera a vaga na planilha, atualiza a tela instantaneamente e gera uma mensagem formatada de aviso pelo WhatsApp.
*   **Link in Bio (`/links`):** Rota dedicada otimizada para mobile com links úteis, foto de perfil, capa com overlay degradê linear dinâmico e botões em formato pílula.
*   **Validação Rigorosa:** Algoritmo matemático para cálculo e validação real de CPF no front-end.

---