"use client";

import { useEffect, useState } from "react";

const highlights = [
  "Protocolos personalizados",
  "Ambiente acolhedor",
  "Escuta ativa",
];

// Array principal (vazio no momento ou sujeito a arquivos ausentes)
const heroImages: string[] = [];

// Biblioteca de backup com suas marcas d'água locais
const backupLibrary = [
  "/assets/imgs/MarcaDAguaLilas.png",
  "/assets/imgs/MarcaDAguaPreto.png",
  "/assets/imgs/MarcaDAguaBranco.png",
];

export default function Hero() {
  const [metrics, setMetrics] = useState([
    { value: "-", label: "Procedimentos concluídos" },
    { value: "-", label: "Clientes atendidas" },
    { value: "-", label: "Avaliações incríveis" },
  ]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 1. Proteção de Array Vazio: Se não houver imagens principais, o backup assume imediatamente
  const activeImages = heroImages.length > 0 ? heroImages : backupLibrary;

  // 2. O timer do carrossel agora usa dinamicamente o tamanho do array ativo
  useEffect(() => {
    if (activeImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % activeImages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [activeImages.length]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [metricsRes, reviewsRes] = await Promise.all([
          fetch('/api/metrics'),
          fetch('/api/reviews')
        ]);

        const metricsData = await metricsRes.json();
        const reviewsData = await reviewsRes.json();

        const rating = reviewsData.rating ? `${reviewsData.rating}/5` : "5.0/5";

        setMetrics([
          { value: metricsData.procedimentosCount || "0", label: "Procedimentos concluídos" },
          { value: metricsData.clientesUnicosCount || "0", label: "Clientes atendidas" },
          { value: rating, label: "Avaliações incríveis" },
        ]);
      } catch (error) {
        console.error("Erro ao carregar os dados iniciais", error);

        setMetrics([
          { value: "-", label: "Procedimentos concluídos" },
          { value: "-", label: "Clientes atendidas" },
          { value: "5.0/5", label: "Avaliações incríveis" },
        ]);
      }
    };

    fetchAllData();
  }, []);

  return (
    <section id="hero">
      <div className="hero-copy">
        <h1>Cuidando da sua pele com propósito.</h1>
        <p></p>

        <div className="hero-actions">
          <a className="btn btn-primary" href="#agendar">
            Agendar avaliação
          </a>
          <a className="btn btn-secondary" href="#procedimentos">
            Ver procedimentos
          </a>
        </div>

        <ul className="highlight-list" aria-label="Diferenciais do studio">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="hero-visual" aria-label="Visual do studio">
        <div className="portrait-card glass-panel">

          {activeImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={`Banner do Studio ${index + 1}`}
              className={`hero-carousel-img ${index === currentImgIndex ? "active" : ""}`}
              onError={(e) => {
                // 3. Proteção de Caminho Quebrado: Intercepta a falha e puxa o arquivo local de backup
                e.currentTarget.src = backupLibrary[index] || backupLibrary[0];
                e.currentTarget.onerror = null;
              }}
            />
          ))}

        </div>
      </div>
    </section>
  );
}