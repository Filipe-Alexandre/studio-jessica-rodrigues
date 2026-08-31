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

// O tipo :any previne o erro de compilação TS2769
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
        
    // Faz as duas requisições ao MESMO TEMPO para não deixar o site lento
    const [horariosResponse, agendamentosResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Horários", "A2:E"),
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Agendamentos", "A2:E"), // Pega o ID (A) e Status (E)
      })
    ]);

    const horariosRows = horariosResponse.data.values ?? [];
    const agendamentosRows = agendamentosResponse.data.values ?? [];

    // Cria uma lista de IDs que estão OCUPADOS
    const horariosOcupados = new Set<string>();

    agendamentosRows.forEach(row => {
      const id = String(row[0]).trim();
      const statusAgendamento = String(row[4] || "").toLowerCase().trim();

      // Se for reservado ou concluído, a gente marca como OCUPADO.
      // Se for "cancelado", a gente ignora, fazendo o horário reaparecer!
      if (statusAgendamento === "reservado" || statusAgendamento === "concluído" || statusAgendamento === "concluido") {
        horariosOcupados.add(id);
      }
    });

    return horariosRows
      .filter((row) => {
        const id = String(row[0]).trim();
        const statusHorarioBase = String(row[4] || "").toLowerCase().trim();
                
        // Compara com "livre" minúsculo
        const isLivreNaBase = row.length >= 5 && statusHorarioBase === "livre";
        if (!isLivreNaBase || horariosOcupados.has(id)) return false;

        // Validação de Tempo (Buffer de 4 horas)
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
      }));
  } catch (error) {
    console.error("[readAvailabilityFromSheet] Erro:", error);
    return [];
  }
}

// Salvando na aba Agendamentos com o CPF (Deixando o update de Horários para a fórmula PROCV)
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

// Incluindo o CPF na descrição do calendário com crases corrigidas
export async function createCalendarEvent(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const calendar = google.calendar({ version: "v3", auth });
        
    const [dia, mes, ano] = payload.date.split('/');
    const formattedDate = `${ano}-${mes}-${dia}`;
        
    const start = new Date(`${formattedDate}T${payload.time}:00`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Duração de 2h

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
  } catch (error) {
    console.error("Erro ao criar evento no Calendar:", error);
    return { ok: false };
  }
}

// Trava de segurança para impedir agendamentos duplos
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

    // Tipagem any[] corrigida
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