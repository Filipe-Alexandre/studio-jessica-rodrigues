"use client";

import { ReactNode, useState } from 'react';
// Importamos o useState e o tipo do Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper'; 

import 'swiper/css';
import 'swiper/css/pagination';

interface CarouselProps {
  slides: ReactNode[];
}

export default function Carousel({ slides }: CarouselProps) {
  // Guardamos a instância do Swiper aqui para usarmos nos botões externos
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  return (
    <div className="w-full relative pb-10 
      /* A MÁGICA AQUI: lg:px-14 cria espaço nas laterais APENAS no desktop, 
         afastando os cards das bordas e dando um lugar para os botões respirarem */
      lg:px-14
      [&_.swiper-pagination-bullet-active]:!bg-[#7c638d] 
      [&_.swiper-pagination-bullet-active]:!opacity-100
      [&_.swiper-pagination-bullet]:!bg-[#7c638d]
      [&_.swiper-pagination-bullet]:!opacity-40
    ">

      {/* 1. BOTÃO ANTERIOR (Agora está FORA do Swiper, livre para flutuar!) */}
      <div 
        onClick={() => swiper?.slidePrev()} 
        className="hidden lg:flex absolute top-[45%] left-0 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-white shadow-md text-[#7c638d] hover:bg-[#efe7f6] hover:scale-105 transition-all cursor-pointer"
      >
        <i className="fa-solid fa-chevron-left text-lg"></i>
      </div>

      <Swiper
        // Conecta este carrossel ao nosso estado do React
        onSwiper={(swiperInstance) => setSwiper(swiperInstance)}
        modules={[Pagination]} 
        pagination={{ clickable: true }}
        spaceBetween={24}
        slidesPerView={1}
        grabCursor={true}
        loop={true} 
        breakpoints={{
          640: { slidesPerView: 2 },
          992: { slidesPerView: 3 },
          1200: { slidesPerView: 4 }, // Matemática cravada para 4 cards
        }}
        // Sem padding horizontal aqui para não quebrar a matemática
        className="mySwiper !pb-14" 
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index} className="!h-auto">
            {slide}
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 2. BOTÃO PRÓXIMO (Também fora do Swiper) */}
      <div 
        onClick={() => swiper?.slideNext()} 
        className="hidden lg:flex absolute top-[45%] right-0 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-white shadow-md text-[#7c638d] hover:bg-[#efe7f6] hover:scale-105 transition-all cursor-pointer"
      >
        <i className="fa-solid fa-chevron-right text-lg"></i>
      </div>

    </div>
  );
}