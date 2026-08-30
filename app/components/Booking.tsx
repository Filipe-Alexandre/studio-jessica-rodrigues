import { STUDIO_PHONE, STUDIO_MAIL, STUDIO_LOCATION, STUDIO_INSTAGRAM } from "../lib/config";

export default function Booking() {
  const whatsappMessage = "Olá! Gostaria de agendar uma avaliação.";
  const whatsappLink = `https://wa.me/${STUDIO_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <section id="contato" className="content-section booking-section">
      <div className="booking-card glass-panel p-8 md:p-10">
        
        {/* CORREÇÃO: Classes de alinhamento condicional (Centro no mobile, Esquerda no Desktop) */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left w-full">
          <span className="eyebrow">Agendamento</span>
          <h2 className="mb-8">Agende sua avaliação e descubra o melhor cuidado para você.</h2>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-8 w-full">
          
          <div className="contato-icons flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
            <a 
              href={`https://instagram.com/${STUDIO_INSTAGRAM}`}
              target="_blank" 
              rel="noreferrer"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>

            <a 
              href={`mailto:${STUDIO_MAIL}`}
              aria-label="Email"
            >
              <i className="fa-regular fa-envelope"></i>
            </a>

            <a 
              href={`tel:+${STUDIO_PHONE}`}
              aria-label="Telefone"
            >
              <i className="fa-solid fa-phone"></i>
            </a>
          </div>

          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noreferrer"
            className="avaliacao"
          >
            Agendar avaliação
          </a>
        </div>
      </div>
    </section>
  );
}