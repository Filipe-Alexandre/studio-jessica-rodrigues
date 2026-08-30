import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo(); 

    const sheet = doc.sheetsByTitle["Banner"]; 
    if (!sheet) {
      throw new Error("Aba 'Banner' não encontrada na planilha.");
    }

    const rows = await sheet.getRows();

    await sheet.loadHeaderRow();
    const nomeDaPrimeiraColuna = sheet.headerValues[0];

    // 5. Puxa os dados EXATAMENTE como estão na planilha (Links Diretos)
    const images = rows
      .map((row) => row.get(nomeDaPrimeiraColuna))
      .filter((url) => typeof url === "string" && url.trim() !== ""); 

    return NextResponse.json({ images });

  } catch (error) {
    console.error("Erro na API de Imagens:", error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}