export type HorarioSlot = {
  id?: string;
  data: string;
  hora: string;
  ocupado?: boolean;
  procedimento?: string;
  cliente?: { nome: string; telefone: string; };
};

export type Agendamento = {
  id: string;
  data: string;
  dia: string;
  hora: string;
  status: string;
  procedimento: string;
  nome: string;
  telefone: string;
  cpf: string;
};

export const parseProcedimento = (rawString: string) => {
  if (!rawString) return { nome: "", cor: "var(--primary)" };
  const [nome, cor] = rawString.split(";;");
  if (cor) return { nome, cor };

  const colors = ["#ff7eb3", "#a29bfe", "#74b9ff", "#55efc4", "#ffeaa7", "#fab1a0", "#fd79a8", "#00cec9", "#fdcb6e"];
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return { nome, cor: colors[Math.abs(hash) % colors.length] };
};

export const getStatusVisual = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === 'concluído' || s === 'concluido') return { bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', icon: 'fa-circle-check', label: 'Concluído' };
  if (s === 'cancelado') return { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', icon: 'fa-circle-xmark', label: 'Cancelado' };
  return { bg: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', icon: 'fa-clock', label: 'Reservado' };
};

export const getProcedimentoAtualizado = (rawSaved: string, procedimentosRaw: string[]) => {
  const parsed = parseProcedimento(rawSaved);
  // Busca na aba de procedimentos se o NOME bate. Se bater, pega a cor nova!
  const atual = procedimentosRaw.find(p => parseProcedimento(p).nome === parsed.nome);
  if (atual) {
    return parseProcedimento(atual);
  }
  return parsed; // Fallback caso o procedimento tenha sido deletado
};