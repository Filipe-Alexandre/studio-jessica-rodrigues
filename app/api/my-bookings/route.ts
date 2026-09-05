import { NextResponse } from "next/server";
import { getBookingsByCpf, cancelBooking, deleteCalendarEvent } from "@/app/lib/google"; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get("cpf");

  if (!cpf) return NextResponse.json({ bookings: [] });

  const bookings = await getBookingsByCpf(cpf);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  try {
    const { rowIndex, date, time, cpf } = await request.json();
    
    // 1. Cancela o agendamento na Planilha
    const result = await cancelBooking(rowIndex);
    if (!result.ok) throw new Error("Erro de comunicação com a planilha");
    
    // 2. Remove o evento da Agenda do Google
    if (date && time && cpf) {
      await deleteCalendarEvent(date, time, cpf);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao processar o cancelamento." }, { status: 500 });
  }
}