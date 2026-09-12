"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Agendamento, parseProcedimento, getStatusVisual, getProcedimentoAtualizado } from "./utils";

type Props = {
  agendamentos: Agendamento[];
  procedimentosRaw: string[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdate: (ag: Agendamento, status: string, procRaw: string, onSuccess: () => void) => void;
};

export default function AgendamentosTab({ agendamentos, procedimentosRaw, isLoading, onRefresh, onUpdate }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [buscaAgendamento, setBuscaAgendamento] = useState("");
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [editAgendamento, setEditAgendamento] = useState({ status: "", procedimento: "" });
  const [isProcDropdownOpen, setIsProcDropdownOpen] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const openAgendamentoModal = (ag: Agendamento) => {
    setSelectedAgendamento(ag);
    setEditAgendamento({ status: ag.status || 'reservado', procedimento: ag.procedimento || procedimentosRaw[0] || '' });
    setIsProcDropdownOpen(false);
  };

  const handleSave = () => {
    if (selectedAgendamento) {
      onUpdate(selectedAgendamento, editAgendamento.status, editAgendamento.procedimento, () => setSelectedAgendamento(null));
    }
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    const t = buscaAgendamento.toLowerCase();
    return a.nome.toLowerCase().includes(t) || a.data.includes(t) || a.status.toLowerCase().includes(t) || a.procedimento.toLowerCase().includes(t) || a.cpf.includes(t);
  });

  const procedimentosOrdenados = [...procedimentosRaw].sort((a, b) => {
    const nomeA = parseProcedimento(a).nome.toLowerCase();
    const nomeB = parseProcedimento(b).nome.toLowerCase();
    if (nomeA.includes("limpeza de pele") && !nomeB.includes("limpeza de pele")) return -1;
    if (!nomeA.includes("limpeza de pele") && nomeB.includes("limpeza de pele")) return 1;
    return nomeA.localeCompare(nomeB);
  });

  return (
    <>
      <div className="list-header">
        <h3>Lista de Clientes</h3>
        <div className="search-wrapper">
          <input type="text" className="gestor-input" placeholder="Buscar cliente, CPF..." value={buscaAgendamento} onChange={(e) => setBuscaAgendamento(e.target.value)} />
        </div>
        <button type="button" onClick={onRefresh} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem' }} title="Atualizar">
          <i className={`fa-solid fa-rotate-right ${isLoading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {isLoading && agendamentos.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando agendamentos...</p>
      ) : agendamentosFiltrados.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>Nenhum agendamento encontrado.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {agendamentosFiltrados.map((ag, i) => {
            // CORREÇÃO: Utilizando getProcedimentoAtualizado em vez de parseProcedimento
            const procObj = getProcedimentoAtualizado(ag.procedimento, procedimentosRaw);
            const visStatus = getStatusVisual(ag.status);
            const isAtivo = ag.status.toLowerCase() !== 'concluído' && ag.status.toLowerCase() !== 'cancelado';
            
            return (
              <div key={i} className="agendamento-card" onClick={() => openAgendamentoModal(ag)} style={{ borderLeft: `6px solid ${procObj.cor}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "1.2rem", color: "var(--foreground)" }}>{ag.nome}</strong>
                    <span style={{ background: visStatus.bg, color: visStatus.color, padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>
                      <i className={`fa-solid ${visStatus.icon}`} style={{ marginRight: '4px' }}></i> {visStatus.label}
                    </span>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}><i className="fa-regular fa-calendar" style={{marginRight: '6px', color: procObj.cor}}></i>{ag.data} - {ag.dia} às <strong>{ag.hora}</strong></span>
                  <span style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 500 }}>{procObj.nome}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", color: "var(--muted)" }}>
                  <span><strong>CPF:</strong> {ag.cpf}</span>
                  <span><strong>Tel:</strong> {ag.telefone}</span>
                </div>
                {isAtivo && (
                  <div style={{ display: "flex", gap: "8px" }} onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => onUpdate(ag, 'concluído', ag.procedimento, () => {})} style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }} title="Concluir"><i className="fa-solid fa-check"></i></button>
                    <button type="button" onClick={() => onUpdate(ag, 'cancelado', ag.procedimento, () => {})} style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }} title="Cancelar"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isMounted && selectedAgendamento && createPortal(
        <div className="popup-overlay" onClick={() => {setSelectedAgendamento(null); setIsProcDropdownOpen(false);}} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          {/* CORREÇÃO: Utilizando getProcedimentoAtualizado para a borda do Pop-up */}
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background)', border: `1px solid ${getProcedimentoAtualizado(selectedAgendamento.procedimento, procedimentosRaw).cor}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button className="popup-close-btn" onClick={() => {setSelectedAgendamento(null); setIsProcDropdownOpen(false);}}><i className="fa-solid fa-xmark"></i></button>
            <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Detalhes do Agendamento</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--glass-bg)', padding: '16px', borderRadius: '12px' }}>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)" }}>{selectedAgendamento.nome}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Data: {selectedAgendamento.data} às {selectedAgendamento.hora}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>WhatsApp: {selectedAgendamento.telefone}</span>
            </div>

            <label className="gestor-input-group">
              <span>Corrigir Procedimento</span>
              <div className="custom-dropdown-container">
                <div className={`custom-dropdown-selected ${isProcDropdownOpen ? 'active' : ''}`} onClick={() => setIsProcDropdownOpen(!isProcDropdownOpen)}>
                  {parseProcedimento(editAgendamento.procedimento).nome || "Selecione"} <span className="dropdown-arrow">▼</span>
                </div>
                {isProcDropdownOpen && (
                  <div className="custom-dropdown-list">
                    {procedimentosOrdenados.map(p => {
                      const obj = parseProcedimento(p);
                      return (
                        <div key={p} className="custom-dropdown-item" onClick={() => { setEditAgendamento({...editAgendamento, procedimento: p}); setIsProcDropdownOpen(false); }}>
                          {obj.nome}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            <label className="gestor-input-group">
              <span>Alterar Status</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[ {id: 'reservado', bg: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', label: 'Reservado'}, {id: 'concluído', bg: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', label: 'Concluído'}, {id: 'cancelado', bg: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', label: 'Cancelado'} ].map(s => (
                  <button key={s.id} type="button" onClick={() => setEditAgendamento({...editAgendamento, status: s.id})} style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "0.85rem", fontWeight: "bold", cursor: "pointer", background: editAgendamento.status === s.id ? s.bg : "transparent", color: editAgendamento.status === s.id ? s.color : "var(--muted)", border: `1px solid ${editAgendamento.status === s.id ? s.color : "var(--glass-border)"}` }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </label>

            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isLoading} style={{ width: "100%", marginTop: "10px" }}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      , document.body)}
    </>
  );
}