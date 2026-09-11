import { NextResponse } from "next/server";
import { addProcedimentoAdmin, deleteProcedimentoAdmin } from "@/app/lib/google";
// Assumindo que você já tenha uma função getProcedimentos ou similar, se não tiver, me avise!
// Vou usar um fetch direto na API do Google aqui para garantir que funcione de forma isolada.
import { google } from "googleapis";
import { buildGoogleAuth } from "@/app/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = buildGoogleAuth();
    if (!auth) throw new Error("Sem autenticação");
    
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Procedimentos!A2:A",
    });
    
    const procedimentos = res.data.values ? res.data.values.map(row => row[0]) : [];
    return NextResponse.json({ procedimentos });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar procedimentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, nome } = await request.json();
    
    if (action === 'add') {
      await addProcedimentoAdmin(nome);
    } else if (action === 'delete') {
      await deleteProcedimentoAdmin(nome);
    } else {
      throw new Error("Ação inválida");
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao processar a requisição" }, { status: 500 });
  }
}