import { NextResponse } from "next/server";
import { appendBookingToSheet, createCalendarEvent, checkActiveBooking } from "@/app/lib/google";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Validação de dados básicos (Adicionado o 'servico' para garantir a trava dupla)
    if (!payload?.nome || !payload?.telefone || !payload?.id || !payload?.cpf || !payload?.servico) {
      return NextResponse.json({ message: "Dados incompletos." }, { status: 400 });
    }

    // 2. A Trava de Segurança
    const temAgendamentoAtivo = await checkActiveBooking(payload.cpf, payload.servico);

    if (temAgendamentoAtivo) {
      return NextResponse.json(
        { message: `Você já possui um agendamento ativo para o serviço de ${payload.servico}.` },
        { status: 409 }
      );
    }

    // 3. Salva na Planilha e no Calendário Simultaneamente
    const [sheetResult, calendarResult] = await Promise.all([
      appendBookingToSheet(payload),
      createCalendarEvent(payload),
    ]);

    // 4. Verificação de Sucesso e Geração do Link
    if (sheetResult.ok) {
      
      // Aviso no console do servidor caso a planilha salve, mas a agenda do Google bloqueie
      if (!calendarResult.ok) {
        console.warn(`[Aviso] Planilha salva, mas falha ao criar evento no calendário para o CPF: ${payload.cpf}`);
      }

      const numeroJessica = "5511993108983";
      const mensagemWa = encodeURIComponent(
        `Olá *Jessica*! Acabei de realizar um agendamento pelo site.\n\n` +
        `*Detalhes do Agendamento:*\n` +
        `*Serviço:* ${payload.servico}\n` +
        `*Data:* ${payload.date} (${payload.dayLabel})\n` +
        `*Horário:* ${payload.time}\n` +
        `*Cliente:* ${payload.nome}\n\n` +
        `Obrigada!`
      );
      const waLink = `https://wa.me/${numeroJessica}?text=${mensagemWa}`;

      return NextResponse.json({
        ok: true,
        message: "Agendamento enviado.",
        waLink: waLink
      }, { status: 200 }); // Confirmação de sucesso para o frontend
    }

    return NextResponse.json({ message: "Erro ao salvar na planilha." }, { status: 500 });
    
  } catch (error) {
    console.error("Erro na API de Agendamento:", error);
    return NextResponse.json({ message: "Erro no servidor." }, { status: 500 });
  }
}