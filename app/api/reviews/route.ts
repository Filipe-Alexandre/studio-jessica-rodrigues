import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Puxa as chaves de segurança do seu arquivo .env
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.PLACE_ID; 

  if (!apiKey || !placeId) {
    return NextResponse.json(
      { error: "Chaves do Google ausentes na configuração." }, 
      { status: 500 }
    );
  }

  try {
    // Monta a URL pedindo especificamente a nota (rating) e os comentários (reviews) em português
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,reviews&language=pt-BR&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Se o Google encontrar o local e aprovar a requisição, devolvemos os dados limpos
if (data.result) {
      // Filtra para pegar apenas as avaliações de 4 e 5 estrelas
      const avaliacoes = data.result.reviews || [];
      const avaliacoesFiltradas = avaliacoes.filter((rev: any) => rev.rating >= 4);

      return NextResponse.json({
        rating: data.result.rating,
        reviews: avaliacoesFiltradas
      });
    }

    // Se o Google bloquear (ex: falta de Billing), repassamos o erro para facilitar a correção
    return NextResponse.json({ 
      error: "Falha ao buscar dados no Google Maps.", 
      status_google: data.status,
      mensagem_google: data.error_message || "Sem mensagem detalhada"
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json(
      { error: "Erro de comunicação com o servidor externo." }, 
      { status: 500 }
    );
  }
}