"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HorarioSlot, Agendamento, parseProcedimento, getStatusVisual } from "./utils";

type Props = {
  horarios: HorarioSlot[];
  agendamentos: Agendamento[];
  isLoading: boolean;
  onAdd: (data: string, hora: string, onSuccess: () => void) => void;
  onDelete: (data: string, hora: string) => void;
  onBulkDelete: (slots: {data: string, hora: string}[], onSuccess: () => void) => void;
  onRefresh: () => void;
};

export default function HorariosTab({ horarios, agendamentos, isLoading, onAdd, onDelete, onBulkDelete, onRefresh }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [novaDataInput, setNovaDataInput] = useState("");
  const [novaHoraInput, setNovaHoraInput] = useState("");
  const [buscaHorario, setBuscaHorario] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{data: string, hora: string}[]>([]);
  const [selectedHorario, setSelectedHorario] = useState<HorarioSlot | null>(null);

  useEffect(() => setIsMounted(true), []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDataInput || !novaHoraInput) return;
    const [ano, mes, dia] = novaDataInput.split("-");
    const dataFormatada = `${dia}/${mes}/${ano}`;
    onAdd(dataFormatada, novaHoraInput, () => setNovaHoraInput(""));
  };

  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedSlots([]); };
  const handleToggleSlotSelection = (data: string, hora: string) => {
    setSelectedSlots(prev => prev.find(i => i.data === data && i.hora === hora) ? prev.filter(i => !(i.data === data && i.hora === hora)) : [...prev, { data, hora }]);
  };

  const horariosFiltrados = horarios.filter(s => {
    const t = buscaHorario.toLowerCase();
    return s.data.includes(t) || s.hora.includes(t) || (s.id?.toLowerCase() || "").includes(t) || (s.cliente?.nome.toLowerCase() || "").includes(t) || (s.ocupado ? "ocupada".includes(t) : "livre".includes(t));
  });

  return (
    <>
      <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <label className="gestor-input-group">
          <span>Data da Vaga</span>
          <input type="date" className="gestor-input" value={novaDataInput} onChange={(e) => setNovaDataInput(e.target.value)} disabled={isLoading} required />
        </label>
        <label className="gestor-input-group" style={{ flex: "1 1 120px" }}>
          <span>Horário</span>
          <input type="time" className="gestor-input" value={novaHoraInput} onChange={(e) => setNovaHoraInput(e.target.value)} disabled={isLoading} required />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !novaDataInput || !novaHoraInput} style={{ height: "46px", flex: "1 1 100px" }}>
          {isLoading ? "Salvando..." : "Abrir Vaga"}
        </button>
      </form>

      <div className="list-header" style={{ marginTop: "16px" }}>
        <h3>Horários Disponíveis</h3>
        <div className="search-wrapper">
          <input type="text" className="gestor-input" placeholder="Pesquisar..." value={buscaHorario} onChange={(e) => setBuscaHorario(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSelectionMode ? (
            <>
              <button type="button" onClick={() => onBulkDelete(selectedSlots, () => {setIsSelectionMode(false); setSelectedSlots([]);})} disabled={selectedSlots.length === 0 || isLoading} className="btn btn-primary" style={{ background: '#ff4d4f', borderColor: '#ff4d4f', padding: '8px 12px', fontSize: '0.9rem' }}><i className="fa-solid fa-trash-can"></i> ({selectedSlots.length})</button>
              <button type="button" onClick={toggleSelectionMode} className="btn-tab">Cancelar</button>
            </>
          ) : (
            <>
              <button type="button" onClick={toggleSelectionMode} className="btn-tab"><i className="fa-solid fa-list-check"></i> Sel.</button>
              <button type="button" onClick={onRefresh} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem', padding: "4px" }}><i className={`fa-solid fa-rotate-right ${isLoading ? 'fa-spin' : ''}`}></i></button>
            </>
          )}
        </div>
      </div>
        
      {isLoading && horarios.length === 0 ? ( <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p> ) : (
        <ul className="horarios-grid">
          {horariosFiltrados.map((slot, index) => {
            const [dia, mes, ano] = slot.data.split('/');
            const diaSemana = new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', { weekday: 'long' });
            const isSelected = selectedSlots.some(s => s.data === slot.data && s.hora === slot.hora);
            
            const agVinculado = agendamentos.find(a => a.data === slot.data && a.hora === slot.hora && a.status.toLowerCase() !== 'cancelado');
            const procObj = agVinculado ? parseProcedimento(agVinculado.procedimento) : null;
            const destaqueColor = procObj ? procObj.cor : 'var(--primary)';
            const bgCard = slot.ocupado ? `${destaqueColor}1A` : 'transparent';
            const borderCard = isSelected ? "2px solid #ff4d4f" : (slot.ocupado ? `2px solid ${destaqueColor}` : "1px solid var(--glass-border)");

            return (
              <li key={index} className="horario-card" onClick={() => isSelectionMode ? handleToggleSlotSelection(slot.data, slot.hora) : setSelectedHorario(slot)} style={{ background: bgCard, border: borderCard }}>
                {isSelectionMode && <div style={{ position: "absolute", top: "8px", right: "8px", color: isSelected ? "#ff4d4f" : "var(--muted)", fontSize: "1.2rem" }}>{isSelected ? <i className="fa-solid fa-square-check"></i> : <i className="fa-regular fa-square"></i>}</div>}
                <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600 }}>{slot.id || "#---"}</span>
                <span style={{ color: destaqueColor, fontSize: "0.9rem", textTransform: "capitalize", fontWeight: 500 }}>{diaSemana}</span>
                <strong style={{ color: "var(--foreground)", fontSize: "1.6rem", lineHeight: "1" }}>{slot.hora}</strong>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{slot.data}</span>
              </li>
            );
          })}
        </ul>
      )}

      {isMounted && selectedHorario && !isSelectionMode && (() => {
        const agVinculado = agendamentos.find(a => a.data === selectedHorario.data && a.hora === selectedHorario.hora);
        const procInfo = agVinculado ? parseProcedimento(agVinculado.procedimento) : null;
        const statusInfo = agVinculado ? getStatusVisual(agVinculado.status) : null;

        return createPortal(
          <div className="popup-overlay" onClick={() => setSelectedHorario(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <button className="popup-close-btn" onClick={() => setSelectedHorario(null)}><i className="fa-solid fa-xmark"></i></button>
              
              <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.4rem' }}>
                {selectedHorario.id ? `${selectedHorario.id} em ` : ''}{selectedHorario.data} às {selectedHorario.hora}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {selectedHorario.ocupado ? (
                  <span style={{ color: "var(--primary)", padding: "4px 8px", background: "rgba(124, 99, 141, 0.2)", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold" }}><i className="fa-solid fa-lock"></i> Vaga Ocupada</span>
                ) : (
                  <span style={{ color: "var(--success, #25D366)", padding: "4px 8px", background: "rgba(37, 211, 102, 0.2)", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold" }}><i className="fa-regular fa-circle-check"></i> Vaga Livre</span>
                )}
                {statusInfo && (
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>
                    <i className={`fa-solid ${statusInfo.icon}`} style={{ marginRight: '4px' }}></i> {statusInfo.label}
                  </span>
                )}
              </div>

              {selectedHorario.ocupado && selectedHorario.cliente ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Cliente</span>
                    <span style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 700 }}>{selectedHorario.cliente.nome}</span>
                  </div>
                  {procInfo && (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Procedimento</span>
                      <span style={{ color: procInfo.cor, fontSize: "1rem", fontWeight: 600 }}>{procInfo.nome}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>WhatsApp</span>
                    <a href={`https://wa.me/55${selectedHorario.cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: "1.1rem", textDecoration: "none", fontWeight: 600 }}>
                      <i className="fa-brands fa-whatsapp"></i> {selectedHorario.cliente.telefone}
                    </a>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', margin: '8px 0', fontSize: '0.95rem' }}>Esta vaga está disponível no site.</p>
              )}
              <button type="button" onClick={() => { onDelete(selectedHorario.data, selectedHorario.hora); setSelectedHorario(null); }} disabled={isLoading} style={{ width: "100%", background: "#ff4d4f", border: "none", color: "#fff", cursor: "pointer", fontSize: "1rem", padding: "12px", borderRadius: "12px", fontWeight: "bold", marginTop: "8px" }}><i className="fa-solid fa-trash-can"></i> Excluir Vaga</button>
            </div>
          </div>
        , document.body);
      })()}
    </>
  );
}