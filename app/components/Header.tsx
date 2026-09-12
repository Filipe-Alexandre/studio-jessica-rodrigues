"use client";

import Link from "next/link";

const navItems = [
  { label: "Links", href: "/links" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Procedimentos", href: "/#procedimentos" },
  { label: "Contato", href: "/#contato" },
];

export default function Header() {
  return (
    <header className="topbar glass-panel">
      <div className="brand-block">
        {/* Novo logotipo em formato de texto */}
        <Link
          href="/"
          className="brand-logo-text"
          style={{ textDecoration: "none" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="logo-studio">STUDIO</span>
          <span className="logo-name">JESSICA RODRIGUES</span>
        </Link>
      </div>

      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Botão corrigido sem a tag span e focado inteiramente no cálculo de eixo Y */}
      <button
        className="btn btn-primary"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          if (window.location.pathname === '/') {
            const secao = document.getElementById('agendar');

            if (secao) {
              // 1. Calcula a distância da seção até o topo da tela
              // 2. Adiciona o scrollY atual para obter a posição absoluta (Altura Y)
              // 3. Subtrai 120px para compensar a altura do seu cabeçalho fixo
              const alturaY = secao.getBoundingClientRect().top + window.scrollY;

              window.scrollTo({
                top: alturaY,
                behavior: 'smooth'
              });
            }
          } else {
            // Se a cliente estiver na página "/links", força o redirecionamento
            window.location.href = '/#agendar';
          }
        }}
      >
        Agendar
      </button>
    </header>
  );
}