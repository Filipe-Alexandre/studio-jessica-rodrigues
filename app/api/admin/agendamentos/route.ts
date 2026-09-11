import { NextResponse } from "next/server";
import { google } from "googleapis";
import { buildGoogleAuth } from "@/app/lib/google"; // reaproveitando sua auth

export const dynamic = "force-dynamic";

// ROTA GET: Busca todos os agendamentos da planilha e devolve em formato de lista pro painel
export async function GET() {
  try {
    const auth = buildGoogleAuth();
    if (!auth) throw new Error("Sem autenticação");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Aba Agendamentos (A=ID, B=Data, C=Dia, D=Hora, E=Status, F=Procedimento, G=Nome, H=Telefone, I=CPF)
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Agendamentos!A2:I" });
    const rows = res.data.values || [];

    const agendamentos = rows.filter(row => row[1] && row[6]).map(row => ({
      id: String(row[0] || "").trim(),
      data: String(row[1] || "").trim(),
      dia: String(row[2] || "").trim(),
      hora: String(row[3] || "").trim(),
      status: String(row[4] || "reservado").trim(),
      procedimento: String(row[5] || "").trim(),
      nome: String(row[6] || "").trim(),
      telefone: String(row[7] || "").trim(),
      cpf: String(row[8] || "").trim()
    }));

    // Ordena mostrando os mais recentes/próximos primeiro
    agendamentos.sort((a, b) => {
      const [diaA, mesA, anoA] = a.data.split('/');
      const [diaB, mesB, anoB] = b.data.split('/');
      const timeA = new Date(`${anoA}-${mesA}-${diaA}T${a.hora}:00`).getTime();
      const timeB = new Date(`${anoB}-${mesB}-${diaB}T${b.hora}:00`).getTime();
      return timeB - timeA; 
    });

    return NextResponse.json({ agendamentos });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar agendamentos" }, { status: 500 });
  }
}

// ROTA PUT: Encontra a linha exata pela Data e Hora e atualiza as colunas E (Status) e F (Procedimento)
export async function PUT(request: Request) {
  try {
    const { data, hora, status, procedimento } = await request.json();
    const auth = buildGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Agendamentos!B:D" });
    const rows = res.data.values || [];

    // Normalizadores (iguais ao que usamos para excluir)
    const normDate = (d: string) => d.trim().split('/').map((p, i) => i < 2 ? p.padStart(2, '0') : p).join('/');
    const normTime = (t: string) => t.trim().split(':').slice(0, 2).map(p => p.padStart(2, '0')).join(':');

    const rowIndex = rows.findIndex(row => {
      if (!row[0] || !row[2]) return false;
      return normDate(String(row[0])) === normDate(data) && normTime(String(row[2])) === normTime(hora);
    });

    if (rowIndex === -1) throw new Error("Agendamento não encontrado na planilha.");

    // Atualiza apenas o status (Coluna E) e o procedimento (Coluna F) daquela linha
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Agendamentos!E${rowIndex + 1}:F${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[status, procedimento]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no PUT de agendamento:", error);
    return NextResponse.json({ error: "Falha na atualização" }, { status: 500 });
  }
}