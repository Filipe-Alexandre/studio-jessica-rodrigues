import { NextResponse } from "next/server";
import { readAvailabilityFromSheet, readProcedimentosFromSheet } from "@/app/lib/google";

// Força o Next.js a não usar cache, buscando os dados da planilha em tempo real
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [slots, procedimentos] = await Promise.all([
      readAvailabilityFromSheet(),
      readProcedimentosFromSheet()
    ]);
    
    return NextResponse.json({ slots, procedimentos });
  } catch (error) {
    return NextResponse.json({ slots: [], procedimentos: [] }, { status: 500 });
  }
}