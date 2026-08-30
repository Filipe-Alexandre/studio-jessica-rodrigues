# Diretrizes de Desenvolvimento: Site Institucional Omnichannel

## 1. Identidade Visual e UI
- O design system baseia-se em Glassmorphism (fundos translúcidos, blur, bordas suaves e contrastes de luz).
- Utilize componentes funcionais e modulares.
- Garanta que a interface seja totalmente responsiva (Mobile-First).
- Acessibilidade deve ser uma considerado, seguindo as diretrizes WCAG 2.1.
- Prioridade máxima com SEO do geral do site, utilizando práticas recomendadas de Next.js e React para o Google.
- Paleta de cores deve serguir o Lilás: #7C638D, #8C769C, #9C8CA9, #C4B2DA, #F5EFED e o contarste #FFE9A6, #FFC985.
- Fontes: Para fontes Display, utilize "The Silver Editorial"; Para fontes Título, utilize "The Seasons"; Para fontes de texto, utilize "Questrial" com pesos variados (400, 500, 600, 700).


## 2. Padrões de Código (Next.js & React)
- Utilize Next.js com App Router.
- Priorize Server Components para otimização de SEO.
- Utilize TypeScript com tipagem estrita para todas as props e retornos de funções.
- SCSS deve ser utilizado para estilização, com suporte a variáveis e mixins.
- SCSS dever ser aninhado e modularizado, conforme a estrutura dos componentes.

## 3. Regras de Negócio e Funcionalidades
- Funcionalidade de agendamento deve funcionar com integração a um calendário externo (Google Calendar ou Outlook).
- Disponibilidade de agendamentos deve ser dinamica integrada com o Google Sheets.
- Modal de agendamento deve ser responsivo e acessível, com validação de campos e feedback visual.
- Modal deve estar integrada com google sheets e google calendar para salvar os agendamentos.