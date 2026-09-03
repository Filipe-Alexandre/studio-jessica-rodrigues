# 🌸 Studio Jessica Rodrigues - Plataforma de Agendamento e Link in Bio

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

Uma aplicação web _Full-Stack_ desenvolvida para modernizar a gestão de clientes, procedimentos e horários de um estúdio de estética. O projeto consolida uma Landing Page institucional, um sistema de autoatendimento para marcação de horários e uma página agregadora de links (Link in Bio), tudo sob uma identidade visual proprietária baseada em **Glassmorphism**.

---

## 🎯 Objetivo do Projeto

Eliminar o atrito no processo de agendamento manual via WhatsApp, oferecendo autonomia para as clientes marcarem, consultarem, reagendarem ou cancelarem seus próprios horários. O sistema foi projetado para ter **custo zero de infraestrutura de banco de dados**, utilizando o ecossistema do Google Workspace (Sheets & Calendar) como backend operacional para a gestão do estúdio.

---

## 🚀 Tecnologias e Arquitetura

### Front-end

* **Next.js (App Router) & React:** Renderização híbrida otimizada e componentização.
* **TypeScript:** Tipagem estática rigorosa para payloads de API, validações de CPF e tipagem de respostas do Google Sheets.
* **Tailwind CSS & SCSS Customizado:** Abordagem híbrida combinando a agilidade das classes utilitárias do Tailwind com o poder do SCSS para estilizações complexas. Uso de CSS Grid avançado (`grid-column: 1 / -1`), pseudo-elementos e variáveis nativas.
* **UI/UX Dinâmica:** Uso extensivo de _Glassmorphism_ (`backdrop-filter`), modais customizados que substituem os alertas nativos do navegador, e animações SVG síncronas controladas por estado (timers de 5s/10s).

### Back-end & Integrações

* **Next.js Route Handlers (`app/api`):** Criação de uma API RESTful interna (`/api/booking`, `/api/availability`, `/api/my-bookings`).
* **Google Sheets API (googleapis):** Atua como banco de dados NoSQL estruturado. O backend faz a leitura dinâmica dos **procedimentos oferecidos** e o cruzamento em tempo real (Join lógico) entre a aba de "Horários" (vagas) e "Agendamentos" (ocupações) usando estruturas de dados do tipo `Set` em memória para garantir performance `O(1)` na verificação de ocupação.
* **Google Calendar API:** Inserção simultânea de eventos na agenda profissional da clínica.
* **ICS Generator:** Geração de arquivos `.ics` nativos no front-end (Blob/URL Object) para que o cliente adicione o evento em sua própria agenda (Apple/Google Calendar).

---

## 🧠 Lógica de Negócio e Decisões Técnicas (Highlights)

1. **Trava Dupla de Concorrência (Anti-Double Booking):**
    O backend verifica ativamente o CPF e o mês/ano da solicitação antes de gravar na planilha. A regra de negócio impede que um mesmo CPF reserve o mesmo procedimento estético no mesmo mês calendário, protegendo a agenda contra spams ou reservas duplicadas acidentais.
2. **Cache Busting Estratégico:**
    Devido ao cache agressivo nativo do Next.js e de navegadores in-app (como o do Instagram), as chamadas para a API de vagas e buscas de CPF utilizam chaves de tempo (`?t=${Date.now()}`) e rotas forçadas dinamicamente (`force-dynamic`). Isso garante que cancelamentos ou reagendamentos reflitam instantaneamente na tela.
3. **Sistema de Reagendamento Transacional:**
    O fluxo de reagendamento automatiza a vida do cliente: exclui a reserva antiga na planilha, recarrega as vagas disponíveis e popula os estados do formulário de marcação (`nome`, `telefone`, `cpf`, `serviço`), rolando a tela suavemente para a grade de horários via matemática de eixo Y absoluta.
4. **Isolamento de Layouts Complexos:**
    Uso de seletores avançados como `:has()` no CSS para mutar fundos globais dependendo da rota atual, permitindo que a subpágina `/links` tenha imagens exclusivas (com overlays em degradê linear dinâmico) sem quebrar a identidade da Landing Page principal.

---

## 📱 Funcionalidades (Features)

* **Página Institucional:** Apresentação da marca, resultados em formato de cards de métricas e carrossel de avaliações em UI moderna.
* **Agendamento Self-Service:** Listagem dinâmica de meses e horários filtrados a partir da planilha mestre.
* **Meus Horários (Painel do Cliente):** Consulta de horários ativos e procedimentos vinculados ao CPF.
* **Cancelamento Automático:** Libera a vaga na planilha, atualiza a tela instantaneamente e gera uma mensagem formatada de aviso pelo WhatsApp.
* **Link in Bio (`/links`):** Rota dedicada (inspirada no Linktree), otimizada para webviews de redes sociais, com foto de perfil e botões interativos.
* **Validação Rigorosa:** Algoritmo matemático para cálculo e validação real de CPF no front-end.