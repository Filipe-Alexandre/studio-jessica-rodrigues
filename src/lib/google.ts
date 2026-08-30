import "server-only";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

// ==================== Tipos ====================
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

// ==================== Credenciais ====================
const getPrivateKey = () =>
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";

export const getGoogleCredentials = () => {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  return { serviceAccountEmail, privateKey, sheetId };
};

export function hasGoogleConfig() {
  const { serviceAccountEmail, privateKey, sheetId } = getGoogleCredentials();
  return Boolean(serviceAccountEmail && privateKey && sheetId);
}

function buildGoogleAuth() {
  const { serviceAccountEmail, privateKey } = getGoogleCredentials();
  if (!serviceAccountEmail || !privateKey) return null;

  return new GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
}

// ==================== Utilitários ====================
function getSheetRange(sheetName: string, startCell: string) {
  const safeName = sheetName.includes(" ") ? `'${sheetName}'` : sheetName;
  return `${safeName}!${startCell}`;
}

// ==================== Google Clients ====================
const googleAuth = buildGoogleAuth();

export const sheets = google.sheets({
  version: "v4",
  auth: googleAuth as any,
});

export const calendar = google.calendar({
  version: "v3",
  auth: googleAuth as any,
});

// ==================== Leitura de Procedimentos ====================
export async function readProcedimentosFromSheet(): Promise<string[]> {
  if (!hasGoogleConfig()) return ["Microagulhamento (Mock)"];

  try {
    const auth = buildGoogleAuth();
    if (!auth) return ["Erro de autenticação"];

    const sheetsClient = google.sheets({ version: "v4", auth: auth as any });
    const { sheetId } = getGoogleCredentials();

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Procedimentos", "A2:A"),
    });

    const rows = response.data.values ?? [];
    return rows.map(row => String(row[0]).trim()).filter(Boolean);
  } catch {
    return ["Erro ao carregar procedimentos"];
  }
}

// ==================== Leitura de Horários Disponíveis ====================
export async function readAvailabilityFromSheet(): Promise<ScheduleSlot[]> {
  if (!hasGoogleConfig()) return [];

  try {
    const auth = buildGoogleAuth();
    if (!auth) return [];

    const sheetsClient = google.sheets({ version: "v4", auth: auth as any });
    const { sheetId } = getGoogleCredentials();

    const [horariosResponse, agendamentosResponse] = await Promise.all([
      sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Horários", "A2:E"),
      }),
      sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId!,
        range: getSheetRange("Agendamentos", "A2:E"),
      }),
    ]);

    const horariosRows = horariosResponse.data.values ?? [];
    const agendamentosRows = agendamentosResponse.data.values ?? [];

    const horariosOcupados = new Set<string>();
    agendamentosRows.forEach(row => {
      const id = String(row[0]).trim();
      const statusAgendamento = String(row[4] || "").toLowerCase().trim();
      if (["reservado", "concluído", "concluido"].includes(statusAgendamento)) {
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
            const bufferTimeBR = new Date(nowBR.getTime() + 4 * 60 * 60 * 1000);

            if (slotDate < bufferTimeBR) return false;
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

// ==================== Salvar Agendamento ====================
export async function appendBookingToSheet(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const { sheetId } = getGoogleCredentials();
    const sheetsClient = google.sheets({ version: "v4", auth: auth as any });

    await sheetsClient.spreadsheets.values.append({
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

    const horariosResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetId!,
      range: getSheetRange("Horários", "A:A"),
    });

    const rows = horariosResponse.data.values || [];
    const rowIndex = rows.findIndex(row => String(row[0]).trim() === payload.id);

    if (rowIndex !== -1) {
      const sheetRow = rowIndex + 1;
      await sheetsClient.spreadsheets.values.update({
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

// ==================== Criar Evento no Calendar ====================
export async function createCalendarEvent(payload: BookingPayload) {
  if (!hasGoogleConfig()) return { ok: true };

  try {
    const auth = buildGoogleAuth();
    if (!auth) return { ok: false };

    const calendarClient = google.calendar({ version: "v3", auth: auth as any });
    const [dia, mes, ano] = payload.date.split('/');
    const formattedDate = `${ano}-${mes}-${dia}`;

    const start = new Date(`${formattedDate}T${payload.time}:00`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    await calendarClient.events.insert({
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

// ==================== Verificar CPF Ativo ====================
export async function checkActiveBooking(cpf: string, servico: string): Promise<boolean> {
  if (!hasGoogleConfig()) return false;

  try {
    const auth = buildGoogleAuth();
    if (!auth) return false;

    const { sheetId } = getGoogleCredentials();
    const sheetsClient = google.sheets({ version: "v4", auth: auth as any });

    const response = await sheetsClient.spreadsheets.values.get({
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