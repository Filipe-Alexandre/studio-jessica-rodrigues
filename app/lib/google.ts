import "server-only"; 
import { google } from "googleapis";

export type ScheduleSlot = {
  id: string;
  date: string;
  dayLabel: string;
  time: string;
  status: string;
};

export type BookingPayload = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  servico: string;
  date: string;
  dayLabel: string;
  time: string;
};

export function getGoogleCredentials() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // CORREÇÃO: Duas barras no regex para garantir a leitura da chave do .env
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;

  return { serviceAccountEmail, privateKey, sheetId };
}

export function hasGoogleConfig() {
  const { serviceAccountEmail, privateKey, sheetId } = getGoogleCredentials();
  return Boolean(serviceAccountEmail && privateKey && sheetId);
}

function getSheetRange(sheetName: string, startCell: string) {
  const safeName = sheetName.includes(" ") ? `'${sheetName}'` : sheetName;
  return `${safeName}!${startCell}`;
}

function buildGoogleAuth(): any {
  const { serviceAccountEmail, privateKey } = getGoogleCredentials();
  if (!serviceAccountEmail || !privateKey) return null;

  return new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
}

// Lendo procedimentos
export async function readProcedimentosFromSheet(): Promise<string[]> {
  if (!hasGoogleConfig()) return ["Microagulhamento (Mock)"];

  try {
    const auth = buildGoogleAuth();
    if (!auth) return ["Erro de autenticação"];

    const sheets = google.sheets({ version: "v4", auth });
    const { sheetId } = getGoogleCredentials();
        
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Procedimentos", "A2:A"),
    });

    const rows = response.data.values ?? [];
    return rows.map(row => String(row[0]).trim()).filter(Boolean);
  } catch {
    return ["Erro ao carregar procedimentos"];
  }
}

// Lendo a aba Horários com CRUZAMENTO DE DADOS inteligente
export async function readAvailabilityFromSheet(): Promise<ScheduleSlot[]> {
  if (!hasGoogleConfig()) return [];

  try {
    const auth = buildGoogleAuth();
    if (!auth) return [];

    const sheets = google.sheets({ version: "v4", auth });
    const { sheetId } = getGoogleCredentials();
        
    const [horariosResponse, agendamentosResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Horários", "A2:E"),
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Agendamentos", "A2:E"),
      })
    ]);

    const horariosRows = horariosResponse.data.values ?? [];
    const agendamentosRows = agendamentosResponse.data.values ?? [];

    const horariosOcupados = new Set<string>();

    agendamentosRows.forEach(row => {
      const id = String(row[0]).trim();
      const statusAgendamento = String(row[4] || "").toLowerCase().trim();

      if (statusAgendamento === "reservado" || statusAgendamento === "concluído" || statusAgendamento === "concluido") {
        horariosOcupados.add(id);
      }
    });

    return horariosRows
      .filter((row) => {
        const id = String(row[0]).trim();
        const statusHorarioBase = String(row[4] || "").toLowerCase().trim();
                
        const isLivreNaBase = row.length >= 5 && statusHorarioBase === "livre";
        if (!isLivreNaBase || horariosOcupados.has(id)) return false;

        try {
          const dataStr = String(row[1]).trim();
          const timeStr = String(row[3]).trim();

          const [dia, mes, ano] = dataStr.split('/');
          const [hora, minuto] = timeStr.split(':');

          if (dia && mes && ano && hora && minuto) {
            const slotDate = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
            const nowString = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
            const nowBR = new Date(nowString);
            const bufferTimeBR = new Date(nowBR.getTime() + (4 * 60 * 60 * 1000));

            if (slotDate < bufferTimeBR) {
              return false;
            }
          }
        } catch (e) {
          console.error("Erro ao analisar data do slot:", e);
        }

        return true; 
      })
      .map((row) => ({
        id: String(row[0]).trim(),
        date: String(row[1]).trim(),
        dayLabel: String(row[2]).trim(),
        time: String(row[3]).trim(),
        status: String(row[4]).trim(),
      }))
      .sort((a, b) => {
        const [diaA, mesA, anoA] = a.date.split('/');
        const [horaA, minutoA] = a.time.split(':');
        const dataA = new Date(Number(anoA), Number(mesA) - 1, Number(diaA), Number(horaA), Number(minutoA)).getTime();

        const [diaB, mesB, anoB] = b.date.split('/');
        const [horaB, minutoB] = b.time.split(':');
        const dataB = new Date(Number(anoB), Number(mesB) - 1, Number(diaB), Number(horaB), Number(minutoB)).getTime();

        return dataA - dataB;
      });
  } catch (error) {
    console.error("[readAvailabilityFromSheet] Erro:", error);
    return [];
  }
}

export async function appendBookingToSheet(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const { sheetId } = getGoogleCredentials();
    const sheets = google.sheets({ version: "v4", auth });
        
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId!,
      range: getSheetRange("Agendamentos", "A1"),
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          payload.id,
          payload.date,
          payload.dayLabel,
          payload.time,
          "Reservado", 
          payload.servico,
          payload.nome,
          payload.telefone,
          payload.cpf 
        ]],
      },
    });
    
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// CORREÇÃO: Crases (Template Literals) restauradas
export async function createCalendarEvent(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const calendar = google.calendar({ version: "v3", auth });
        
    const [dia, mes, ano] = payload.date.split('/');
    const formattedDate = `${ano}-${mes}-${dia}`;
        
    const start = new Date(`${formattedDate}T${payload.time}:00`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); 

    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
      requestBody: {
        summary: `Agendamento - ${payload.nome} (${payload.servico})`,
        description: `Cliente: ${payload.nome}\nTelefone: ${payload.telefone}\nCPF: ${payload.cpf}\nServiço: ${payload.servico}`,
        start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
      },
    });
    return { ok: true };
  } catch (error: any) {
    console.error(">>> ERRO GRAVE NO CALENDÁRIO:", error.message || error);
    return { ok: false };
  }
}

export async function checkActiveBooking(cpf: string, servico: string): Promise<boolean> {
  if (!hasGoogleConfig()) return false;

  try {
    const auth = buildGoogleAuth();
    if (!auth) return false;

    const { sheetId } = getGoogleCredentials();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Agendamentos", "A:J"),
    });

    const rows = response.data.values || [];

    return rows.some((row: any[]) => {
      const rowStatus = String(row[4] || "").trim().toLowerCase();
      const rowServico = String(row[5] || "").trim().toLowerCase();
      const rowCpf = String(row[8] || "").trim();

      const cleanRowCpf = rowCpf.replace(/\D/g, "");
      const cleanInputCpf = cpf.replace(/\D/g, "");
      const cleanInputServico = servico.trim().toLowerCase();

      return cleanRowCpf === cleanInputCpf && 
             rowStatus === "reservado" && 
             rowServico === cleanInputServico;
    });
  } catch (error) {
    console.error("Erro ao verificar CPF ativo na planilha:", error);
    return false;
  }
}

// --- ADICIONE ESTAS FUNÇÕES NO FINAL DO SEU ARQUIVO google.ts ---

export async function getBookingsByCpf(cpf: string) {
  if (!hasGoogleConfig()) return [];
  try {
    const auth = buildGoogleAuth();
    if (!auth) return [];
    
    const { sheetId } = getGoogleCredentials();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Agendamentos", "A2:J"),
    });

    const rows = response.data.values || [];
    const cleanInputCpf = cpf.replace(/\D/g, "");

    return rows.map((row, index) => ({
      rowIndex: index + 2, // A2 começa na linha 2 da planilha
      id: String(row[0] || "").trim(),
      date: String(row[1] || "").trim(),
      dayLabel: String(row[2] || "").trim(),
      time: String(row[3] || "").trim(),
      status: String(row[4] || "").toLowerCase().trim(),
      servico: String(row[5] || "").trim(),
      nome: String(row[6] || "").trim(),
      telefone: String(row[7] || "").trim(),
      cpf: String(row[8] || "").trim()
    })).filter(b => b.cpf.replace(/\D/g, "") === cleanInputCpf && b.status === "reservado");

  } catch (error) {
    console.error("Erro ao buscar agendamentos por CPF:", error);
    return [];
  }
}

export async function cancelBooking(rowIndex: number) {
  if (!hasGoogleConfig()) return { ok: false };
  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const { sheetId } = getGoogleCredentials();
    const sheets = google.sheets({ version: "v4", auth });

    // Atualiza estritamente a célula da coluna E (Status) para "Cancelado"
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId!,
      range: getSheetRange("Agendamentos", `E${rowIndex}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Cancelado"]] }
    });
    
    return { ok: true };
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    return { ok: false };
  }
}