import { NextResponse } from "next/server";
// Olha a importação do bulkDeleteHorarioAdmin adicionada aqui em baixo!
import { addHorarioAdmin, deleteHorarioAdmin, bulkDeleteHorarioAdmin, buildGoogleAuth } from "@/app/lib/google";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = buildGoogleAuth();
    if (!auth) throw new Error("Sem autenticação");
    
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 1. Busca as vagas abertas (A=ID, B=Data, C=Dia da Semana, D=Hora)
    const resHorarios = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Horários!A2:D",
    });
    
    // 2. Busca os agendamentos até a coluna I (que abrange as 9 colunas, de ID a CPF)
    const resAgendamentos = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Agendamentos!A2:I", 
    });

    const vagasRows = resHorarios.data.values || [];
    const agendamentosRows = resAgendamentos.data.values || [];

    const horariosRaw = vagasRows
      .filter(row => row[1] && row[3]) // Garante que a linha da vaga tem Data e Hora
      .map(row => {
        const id = String(row[0] || "").trim(); // Coluna A da vaga
        const data = String(row[1] || "").trim(); // Coluna B da vaga
        const hora = String(row[3] || "").trim(); // Coluna D da vaga

        // Busca a reserva cruzando EXATAMENTE os índices [1] (Data) e [3] (Horário) da planilha Agendamentos
        const reserva = agendamentosRows.find(a => 
          a[1] && String(a[1]).trim() === data && 
          a[3] && String(a[3]).trim() === hora
        );

        if (reserva) {
          // Puxa as informações cirurgicamente pela ordem da aba Agendamentos
          const nomeDaPlanilha = reserva[6] ? String(reserva[6]).trim() : "Cliente";
          const telefoneDaPlanilha = reserva[7] ? String(reserva[7]).trim() : "Telefone não informado";

          return { 
            id, 
            data, 
            hora, 
            ocupado: true, 
            cliente: { 
              nome: nomeDaPlanilha, 
              telefone: telefoneDaPlanilha 
            } 
          };
        }

        return { id, data, hora, ocupado: false };
      });
      
    // Ordena as vagas em ordem cronológica (Data e Hora) para o painel
    const horarios = horariosRaw.sort((a, b) => {
      const [diaA, mesA, anoA] = a.data.split('/');
      const [diaB, mesB, anoB] = b.data.split('/');
      
      const timeA = new Date(`${anoA}-${mesA}-${diaA}T${a.hora}:00`).getTime();
      const timeB = new Date(`${anoB}-${mesB}-${diaB}T${b.hora}:00`).getTime();
      
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      
      return timeA - timeB;
    });

    return NextResponse.json({ horarios });
  } catch (error) {
    console.error("Erro na API de Horários:", error);
    return NextResponse.json({ error: "Erro ao buscar horários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    if (payload.action === 'add') {
      await addHorarioAdmin(payload.data, payload.hora);
    } else if (payload.action === 'delete') {
      await deleteHorarioAdmin(payload.data, payload.hora);
    } else if (payload.action === 'bulk-delete') {
      await bulkDeleteHorarioAdmin(payload.items);
    } else {
      throw new Error("Ação inválida");
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao modificar horários:", error);
    return NextResponse.json({ error: "Falha ao processar a requisição" }, { status: 500 });
  }
}