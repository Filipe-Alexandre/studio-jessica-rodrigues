import Carousel from './Carousel/Carousel';

interface ServiceItem {
  title: string;
  text: string;
  tag: string;
}

const services: ServiceItem[] = [
  {
    title: "Limpeza de Pele",
    text: "Remove cravos, células mortas e impurezas acumuladas na pele. Ajuda a controlar a oleosidade, desobstruir os poros e deixar a pele mais limpa, saudável e renovada.",
    tag: "Renovação",
  },
  {
    title: "Revitalização Facial",
    text: "Devolve o brilho natural da pele. Promove hidratação, melhora a aparência de peles opacas e deixa o rosto com o aspecto mais saudável e descansado.",
    tag: "Hidratação",
  },
  {
    title: "Detox Facial",
    text: "Ajuda a eliminar as impurezas acumuladas na pele causadas pela poluição e pela oleosidade. Deixa a pele mais fresca, equilibrada e com aparência saudável.",
    tag: "Purificação",
  },
  {
    title: "Spa Facial",
    text: "Um protocolo com experiência de autocuidado, com etapas que limpam, revitalizam e relaxam a pele, proporcionando uma agradável sensação de bem-estar, conforto e leveza.",
    tag: "Relaxamento",
  },
  {
    title: "Epilação com linha",
    text: "Método 100% natural, hipoalergênico e higiênico que elimina até os pelos mais finos.",
    tag: "Precisão",
  }
];

export default function Services() {
  const serviceCards = services.map((service, index) => (
    /* A classe h-full é o que garante que todos os cards estiquem igualmente */
    <article key={index} className="service-card glass-panel h-full">
      <div>
        <span className="service-tag">{service.tag}</span>
        <h3>{service.title}</h3>
        <p>{service.text}</p>
      </div>
      <a href="#agendar">Agendar</a>
    </article>
  ));

  return (
    <section id="procedimentos" className="content-section">
      <div className="section-heading">
        <span className="eyebrow">Procedimentos</span>
        <h2>Escolhas pensadas para seu tipo de pele e estilo.</h2>
      </div>

      {/* Carrossel respeitando o limite da section */}
      <div className="w-full mt-6">
        <Carousel slides={serviceCards} />
      </div>
    </section >
  );
}