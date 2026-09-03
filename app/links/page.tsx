"use client";

import React from "react";
import { STUDIO_NAME, STUDIO_PHONE, STUDIO_INSTAGRAM } from "../lib/config";

export default function LinksPage() {
  return (
    <main className="links-page-wrapper">
      {/* Fundos isolados para permitir proporções customizadas sem afetar a Home */}
      <div className="bg-lirio-header"></div>
      <div className="bg-lirio-footer"></div>

      <section className="links-container">
        
        <header className="links-header">
          <div className="links-cover glass-panel">
            <img 
              src="/assets/imgs/capa-links.jpg" 
              alt={`Capa do ${STUDIO_NAME}`} 
              className="cover-img"
            />
          </div>
          <div className="profile-wrapper">
            <img 
              src="/assets/imgs/perfil-links.jpg" 
              alt="Jessica Rodrigues" 
              className="profile-img"
            />

            <div className="profile-badge">
              <i className="fa-solid fa-sparkles"></i>
            </div>
          </div>
          <h1 className="links-title">Jessica Rodrigues</h1>
          <p className="links-bio">Estética facial</p>
        </header>

        {/* Lista de Links */}
        <nav className="links-list">
          
          <a 
            href="/#agendar" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="link-item glass-panel"
          >
            <div className="link-icon">
              <i className="fa-regular fa-calendar-check"></i>
            </div>
            <span className="link-text">Agendamento Online</span>
            <i className="fa-solid fa-chevron-right link-arrow"></i>
          </a>

          <a href={`https://wa.me/${STUDIO_PHONE}`} target="_blank" rel="noopener noreferrer" className="link-item glass-panel">
            <div className="link-icon">
              <i className="fa-brands fa-whatsapp"></i>
            </div>
            <span className="link-text">Dúvidas pelo WhatsApp</span>
            <i className="fa-solid fa-chevron-right link-arrow"></i>
          </a>

          <a href={`https://instagram.com/${STUDIO_INSTAGRAM}`} target="_blank" rel="noopener noreferrer" className="link-item glass-panel">
            <div className="link-icon">
              <i className="fa-brands fa-instagram"></i>
            </div>
            <span className="link-text">Siga no Instagram</span>
            <i className="fa-solid fa-chevron-right link-arrow"></i>
          </a>

          <a href="https://maps.app.goo.gl/r7FvsXgSqtJ54cK89" target="_blank" rel="noopener noreferrer" className="link-item glass-panel">
            <div className="link-icon">
              <i className="fa-solid fa-location-dot"></i>
            </div>
            <span className="link-text">Como Chegar</span>
            <i className="fa-solid fa-chevron-right link-arrow"></i>
          </a>
        </nav>

        <footer className="links-footer">
          <p>© {new Date().getFullYear()} {STUDIO_NAME}</p>
        </footer>

      </section>
    </main>
  );
}