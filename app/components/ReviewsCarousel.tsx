"use client";

import { useEffect, useState } from "react";

type Review = {
  author_name: string;
  rating: number;
  text: string;
  time: number;
};

export default function ReviewsCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews");
        const data = await res.json();
        
        if (data.reviews) setReviews(data.reviews);
        if (data.rating) setRating(data.rating);
      } catch (error) {
        console.error("Erro ao buscar avaliações");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Retorna a estrutura da section para garantir os 100vh antes do conteúdo carregar
  if (isLoading) {
    return (
      <section 
        id="reviews-section" 
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="loading-reviews">Carregando avaliações...</div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section id="reviews-section">
      <div className="reviews-header">
        <h2>O que dizem sobre nós</h2>
        {rating && (
          <span className="average-rating">
            Média: {rating} / 5 <i className="fa-solid fa-star" style={{ color: "var(--secondary-strong)", marginLeft: "4px" }}></i>
          </span>
        )}
      </div>
      
      <div className="carousel-container">
        {reviews.map((review, index) => (
          <div key={index} className="review-card glass-panel">
            <div className="review-stars">
              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
            </div>
            <p className="review-text">"{review.text}"</p>
            <strong className="review-author">- {review.author_name}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}