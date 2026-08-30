import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleCredentials, hasGoogleConfig } from "@/app/lib/google"; 

function buildGoogleAuth() {
  const { serviceAccountEmail, privateKey } = getGoogleCredentials();
  if (!serviceAccountEmail || !privateKey) return null;

  return new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// Garante que a métrica será calculada em tempo real e não ficará travada em cache
export const dynamic = "force-dynamic"; 

export async function GET() {
  if (!hasGoogleConfig()) {
    return NextResponse.json({ procedimentosCount: 0, clientesUnicosCount: 0 });
  }

  try {
    const auth = buildGoogleAuth();
    if (!auth) throw new Error("Erro de autenticação");

    const sheets = google.sheets({ version: "v4", auth });
    const { sheetId } = getGoogleCredentials();

    // Puxa a aba inteira de Agendamentos (A2 até a coluna I, onde está o CPF)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: "Agendamentos!A2:I", 
    });

    const rows = response.data.values ?? [];

    let procedimentosCount = 0;
    const cpfsUnicos = new Set<string>();

    rows.forEach((row) => {
      // Baseado na sua ordem: 0=id, 1=date, 2=day, 3=time, 4=status, 5=servico, 6=nome, 7=tel, 8=cpf
      const status = String(row[4] || "").trim().toLowerCase();
      const cpf = String(row[8] || "").trim().replace(/\D/g, ""); // Pega o CPF e limpa a máscara

      // Aceita concluído com ou sem acento
      if (status === "concluído" || status === "concluido") {
        procedimentosCount++; 
        
        if (cpf) {
          cpfsUnicos.add(cpf); // O Set ignora CPFs repetidos automaticamente
        }
      }
    });

    return NextResponse.json({
      procedimentosCount,
      clientesUnicosCount: cpfsUnicos.size, 
    });

  } catch (error) {
    console.error("[Métricas] Erro ao buscar dados:", error);
    return NextResponse.json({ procedimentosCount: 0, clientesUnicosCount: 0 }, { status: 500 });
  }
}