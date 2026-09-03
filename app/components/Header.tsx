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
        <div className="brand-logo-text">
          <span className="logo-studio">STUDIO</span>
          <span className="logo-name">JESSICA RODRIGUES</span>
        </div>
      </div>

      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

<Link 
        className="btn btn-primary" 
        href="/#agendar"
        onClick={(e) => {
          if (window.location.pathname === '/') {
            e.preventDefault();
            document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        Agendar
      </Link>
    </header>
  );
}