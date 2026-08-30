const navItems = [
  { label: "Sobre", href: "#sobre" },
  { label: "Procedimentos", href: "#procedimentos" },
  { label: "Contato", href: "#contato" },
];

export default function Header() {
  return (
    <header className="topbar glass-panel">
      <div className="brand-block">
        {/* Novo logotipo em formato de texto */}
        <div className="brand-logo-text">
          <span className="logo-studio">STUDIO</span>
          <span className="logo-name">JESSICA RODRIGUES</span>
        </div>
      </div>

      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <a key={item.label} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <a className="btn btn-primary" href="#agendar ">
        Agendar
      </a>
    </header>
  );
}