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

function buildGoogleAuth() {
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
        
        // CORRIGIDO: Comparando com "livre" minúsculo, já que usamos .toLowerCase() acima!
        const isLivreNaBase = row.length >= 5 && statusHorarioBase === "livre";
        if (!isLivreNaBase || horariosOcupados.has(id)) return false;

        // 2. Validação de Tempo (Buffer de 4 horas)
        try {
          const dataStr = String(row[1]).trim(); // Ex: 15/08/2026
          const timeStr = String(row[3]).trim(); // Ex: 18:00

          const [dia, mes, ano] = dataStr.split('/');
          const [hora, minuto] = timeStr.split(':');

          if (dia && mes && ano && hora && minuto) {
            // Monta a data do slot (como nós digitamos na planilha, ela já é a do Brasil)
            const slotDate = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));

            // Pega a data/hora ATUAL cravada no fuso de São Paulo
            const nowString = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
            const nowBR = new Date(nowString);

            // Adiciona a margem de segurança de 4 horas (2 agendamentos de 2h)
            const bufferTimeBR = new Date(nowBR.getTime() + (4 * 60 * 60 * 1000));

            // Se a data/hora do slot for menor que a hora atual + 4h, ele oculta!
            if (slotDate < bufferTimeBR) {
              return false;
            }
          }
        } catch (e) {
          console.error("Erro ao analisar data do slot:", e);
        }

        return true; // Passou por todas as validações, pode mostrar no site!
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

// Salvando na aba Agendamentos E ATUALIZANDO a aba Horários
export async function appendBookingToSheet(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const { sheetId } = getGoogleCredentials();
    const sheets = google.sheets({ version: "v4", auth });
    
    // 1. Salva todos os dados da cliente na aba "Agendamentos" (Histórico/CRM)
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
          "Reservado", // Status no histórico
          payload.servico,
          payload.nome,
          payload.telefone,
          payload.cpf
        ]],
      },
    });

    // 2. NOVO: Puxa apenas a coluna A (IDs) da aba "Horários" para achar a linha correta
    const horariosResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Horários", "A:A"),
    });

    const rows = horariosResponse.data.values || [];
    // Descobre em qual número de linha o ID do agendamento está
    const rowIndex = rows.findIndex(row => String(row[0]).trim() === payload.id);

    // Se ele encontrou a linha na aba Horários...
    if (rowIndex !== -1) {
      const sheetRow = rowIndex + 1; // Soma 1 porque arrays começam em 0, mas a planilha começa na linha 1

      // 3. NOVO: Reescreve a célula da Coluna E (Status) daquela linha exata para "Reservado"
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId!,
        range: getSheetRange("Horários", `E${sheetRow}`),
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Reservado"]]
        }
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("Erro na atualização da planilha:", error);
    return { ok: false };
  }
}

export async function createCalendarEvent(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const calendar = google.calendar({ version: "v3", auth });
    
    const [dia, mes, ano] = payload.date.split('/');
    const formattedDate = `${ano}-${mes}-${dia}`;
    
    const start = new Date(`${formattedDate}T${payload.time}:00`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Mantendo as 2h de duração

    await calendar.events.insert({
      // Grava o evento DIRETAMENTE na nova agenda que você configurou no .env
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      
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
      // Índices baseados no seu array: Status = 4, Serviço = 5, CPF = 8
      const rowStatus = String(row[4] || "").trim().toLowerCase();
      const rowServico = String(row[5] || "").trim().toLowerCase();
      const rowCpf = String(row[8] || "").trim();

      const cleanRowCpf = rowCpf.replace(/\D/g, "");
      const cleanInputCpf = cpf.replace(/\D/g, "");
      const cleanInputServico = servico.trim().toLowerCase();

      // A TRAVA DUPLA: Só bloqueia se o CPF for igual, o status for reservado E o serviço for o mesmo
      return cleanRowCpf === cleanInputCpf && 
             rowStatus === "reservado" && 
             rowServico === cleanInputServico;
    });
  } catch (error) {
    console.error("Erro ao verificar CPF ativo na planilha:", error);
    return false; 
  }
}