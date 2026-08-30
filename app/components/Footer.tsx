"use client";

import Image from "next/image";
import { STUDIO_PHONE, STUDIO_MAIL, STUDIO_LOCATION, STUDIO_INSTAGRAM } from "../lib/config";

export default function Footer() {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer>
      <div className="site-footer glass-panel">
        

        {/* LADO ESQUERDO: Informações e Contatos */}
        <div className="footer-info">
          <div className="footer-brand">
            <div className="brand-logo-text">
              <span className="logo-studio">STUDIO</span>
              <span className="logo-name">JESSICA RODRIGUES</span>
              <span className="brand-tag">Estética Facial</span>
            </div>
          </div>

          <div className="footer-links">
            <a
              href={`https://wa.me/${STUDIO_PHONE}`}
              target="_blank"
              rel="noreferrer"
              className="social-btn"
              aria-label="WhatsApp"
            >
              <i className="fa-brands fa-whatsapp"></i>
            </a>

            <a
              href={`https://instagram.com/${STUDIO_INSTAGRAM}`}
              target="_blank"
              rel="noreferrer"
              className="social-btn"
              aria-label="Instagram"
            >
              <i className="fa-brands fa-instagram"></i>
            </a>

            <button
              onClick={handleScrollToTop}
              className="social-btn"
              aria-label="Voltar ao topo"
            >
              <i className="fa-solid fa-house"></i>
            </button>
          </div>

          <a className="footer-contact" href={`mailto:${STUDIO_MAIL}`}>
            {STUDIO_MAIL}
          </a>
        </div>

        {/* LADO DIREITO: O Mapa Interativo */}
        <div className="footer-map-container">
          <span className="eyebrow">Nosso Espaço</span>
          <h4>Venha nos visitar</h4>
          <p>{STUDIO_LOCATION}</p>

          <div className="map-frame-wrapper">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29263.74994513239!2d-46.49176482568358!3d-23.5336266!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce6761c3f8f4cf%3A0xf00b35a0ecce396!2sStudio%20Jessica%20Rodrigues!5e0!3m2!1spt-BR!2sbr!4v1787365862361!5m2!1spt-BR!2sbr" width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </footer>
  );
}