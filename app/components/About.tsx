const items = [
  "Avaliação personalizada e acolhedora",
  "Uso de tecnologias e protocolos modernos",
  "Foco em resultados naturais e duradouros",
  "Atendimento com atenção aos detalhes",
];

export default function About() {
  return (
    <section id="sobre" className="content-section about-section">
      {/* <div className="about-visual glass-panel">
        logo
      </div> */}

      <div className="about">
        <span className="eyebrow">Sobre o studio</span>
        {/* <h2>Um espaço de cuidado, beleza e confiança.</h2> */}
        <h2>
          Nascemos com o propósito de transformar o cuidado com a pele em um momento de acolhimento, autoestima e bem-estar.
        </h2>
        <ul>
          <li> &bull; Cada atendimento é pensado de forma <strong>individualizada</strong>, respeitando as necessidades e características de <strong>cada pele</strong>.</li>

          <li> &bull; Mais do que realizar procedimentos, buscamos proporcionar uma <strong>experiência de cuidado</strong>, com atenção em <strong>cada detalhe</strong>.</li>

          <li> &bull; Nosso objetivo é que você se sinta <strong>acolhida</strong>, <strong>confiante</strong> e <strong>bem cuidada</strong> em cada visita ao Studio.</li>
        </ul>


        {/* lista */}
        {/* <ul className="feature-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul> */}
      </div>
    </section>
  );
}
