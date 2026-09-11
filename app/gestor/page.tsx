"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type HorarioSlot = {
  id?: string;
  data: string;
  hora: string;
  ocupado?: boolean;
  cliente?: {
    nome: string;
    telefone: string;
  };
};

type Agendamento = {
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

// Gerador de cores único para cada procedimento (Tons pastéis/neon)
const getProcedimentoColor = (procName: string) => {
  if (!procName) return "var(--primary)";
  const colors = ["#ff7eb3", "#a29bfe", "#74b9ff", "#55efc4", "#ffeaa7", "#fab1a0", "#fd79a8", "#00cec9", "#fdcb6e"];
  let hash = 0;
  for (let i = 0; i < procName.length; i++) hash = procName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Formatador visual de status
const getStatusVisual = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === 'concluído' || s === 'concluido') return { bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', icon: 'fa-circle-check', label: 'Concluído' };
  if (s === 'cancelado') return { bg: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', icon: 'fa-circle-xmark', label: 'Cancelado' };
  return { bg: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', icon: 'fa-clock', label: 'Reservado' };
};

export default function GestorPage() {
  const [activeTab, setActiveTab] = useState<"agendamentos" | "horarios" | "procedimentos">("horarios");
  const [isMounted, setIsMounted] = useState(false);
  
  // --- Estados de Procedimentos ---
  const [procedimentos, setProcedimentos] = useState<string[]>([]);
  const [novoProcedimento, setNovoProcedimento] = useState("");
  const [isLoadingProc, setIsLoadingProc] = useState(false);

  // --- Estados de Horários ---
  const [horarios, setHorarios] = useState<HorarioSlot[]>([]);
  const [novaDataInput, setNovaDataInput] = useState("");
  const [novaHoraInput, setNovaHoraInput] = useState("");
  const [buscaHorario, setBuscaHorario] = useState("");
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);

  // --- Estados de Agendamentos ---
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [buscaAgendamento, setBuscaAgendamento] = useState("");
  const [isLoadingAgendamentos, setIsLoadingAgendamentos] = useState(false);
  
  // --- Controle de Pop-ups ---
  const [selectedHorario, setSelectedHorario] = useState<HorarioSlot | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{data: string, hora: string}[]>([]);
  
  // Pop-up de Edição de Agendamento
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [editAgendamento, setEditAgendamento] = useState<{ status: string; procedimento: string }>({ status: "", procedimento: "" });

  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "info"; message: string }>({ type: "idle", message: "" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; text: string; confirmText: string; confirmColor: string; onConfirm: () => void; } | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (status.message && status.type !== 'idle') {
      const timer = setTimeout(() => setStatus({ type: "idle", message: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message, status.type]);

  // --- Buscadores ---
  const fetchProcedimentos = async () => {
    setIsLoadingProc(true);
    try {
      const res = await fetch(`/api/admin/procedimentos?t=${Date.now()}`);
      const data = await res.json();
      setProcedimentos(data.procedimentos || []);
    } catch (error) { console.error(error); } finally { setIsLoadingProc(false); }
  };

  const fetchHorarios = async () => {
    setIsLoadingHorarios(true);
    try {
      const res = await fetch(`/api/admin/horarios?t=${Date.now()}`);
      const data = await res.json();
      setHorarios(data.horarios || []);
    } catch (error) { console.error(error); } finally { setIsLoadingHorarios(false); }
  };

const fetchAgendamentos = async () => {
    setIsLoadingAgendamentos(true);
    try {
      const res = await fetch(`/api/admin/agendamentos?t=${Date.now()}`);
      
      // Se a rota não for encontrada (404) ou der erro (500), ele não tenta ler o HTML
      if (!res.ok) throw new Error("A API não respondeu corretamente.");
      
      const data = await res.json();
      setAgendamentos(data.agendamentos || []);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsLoadingAgendamentos(false); 
    }
  };

  useEffect(() => {
    if (activeTab === "procedimentos") fetchProcedimentos();
    if (activeTab === "horarios") fetchHorarios();
    if (activeTab === "agendamentos") {
      fetchAgendamentos();
      if (procedimentos.length === 0) fetchProcedimentos(); // Garante que a lista de proceds exista para o pop-up
    }
  }, [activeTab]);

  // --- Handlers de Procedimentos e Horários (Omitidos os comentários para encurtar) ---
  const handleAddProcedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProcedimento.trim()) return;
    setIsLoadingProc(true);
    try {
      await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', nome: novoProcedimento.trim() }) });
      setNovoProcedimento(""); await fetchProcedimentos();
      setStatus({ type: "success", message: "Procedimento adicionado com sucesso!" });
    } catch (error) { setStatus({ type: "error", message: "Erro ao adicionar procedimento." }); } finally { setIsLoadingProc(false); }
  };

  const handleDeleteProcedimento = (nome: string) => {
    setConfirmModal({
      isOpen: true, title: "Excluir Procedimento", text: `Tem certeza que deseja excluir "${nome}"?`, confirmText: "Sim, Excluir", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingProc(true);
        try {
          await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', nome }) });
          await fetchProcedimentos(); setStatus({ type: "success", message: "Procedimento excluído!" });
        } catch (error) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingProc(false); }
      }
    });
  };

  const handleAddHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDataInput || !novaHoraInput) return;
    const [ano, mes, dia] = novaDataInput.split("-");
    setIsLoadingHorarios(true);
    try {
      await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', data: `${dia}/${mes}/${ano}`, hora: novaHoraInput }) });
      setNovaHoraInput(""); await fetchHorarios(); setStatus({ type: "success", message: "Vaga aberta com sucesso!" });
    } catch (error) { setStatus({ type: "error", message: "Erro ao abrir vaga." }); } finally { setIsLoadingHorarios(false); }
  };

  const handleDeleteHorario = (data: string, hora: string) => {
    setConfirmModal({
      isOpen: true, title: "Excluir Vaga", text: `Excluir a vaga de ${data} às ${hora}?`, confirmText: "Excluir", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingHorarios(true);
        try {
          await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', data, hora }) });
          await fetchHorarios(); setSelectedHorario(null); setStatus({ type: "success", message: "Vaga excluída!" });
        } catch (error) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingHorarios(false); }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedSlots.length === 0) return;
    setConfirmModal({
      isOpen: true, title: "Excluir Vagas em Massa", text: `Excluir as ${selectedSlots.length} vagas selecionadas?`, confirmText: "Excluir Todas", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingHorarios(true);
        try {
          await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk-delete', items: selectedSlots }) });
          await fetchHorarios(); setIsSelectionMode(false); setSelectedSlots([]); setStatus({ type: "success", message: "Vagas excluídas!" });
        } catch (error) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingHorarios(false); }
      }
    });
  };

  const toggleSelectionMode = () => { setIsSelectionMode(!isSelectionMode); setSelectedSlots([]); };
  const handleToggleSlotSelection = (data: string, hora: string) => {
    setSelectedSlots(prev => prev.find(i => i.data === data && i.hora === hora) ? prev.filter(i => !(i.data === data && i.hora === hora)) : [...prev, { data, hora }]);
  };

  // --- Handlers de Agendamentos (NOVO) ---
  const handleUpdateAgendamento = async (ag: Agendamento, newStatus: string, newProc: string) => {
    setIsLoadingAgendamentos(true);
    try {
      const response = await fetch('/api/admin/agendamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: ag.data, hora: ag.hora, status: newStatus, procedimento: newProc })
      });
      if (!response.ok) throw new Error("Falha na atualização");
      await fetchAgendamentos();
      setStatus({ type: "success", message: "Agendamento atualizado com sucesso!" });
      setSelectedAgendamento(null);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Erro ao atualizar o agendamento." });
    } finally {
      setIsLoadingAgendamentos(false);
    }
  };

  const openAgendamentoModal = (ag: Agendamento) => {
    setSelectedAgendamento(ag);
    setEditAgendamento({ status: ag.status || 'reservado', procedimento: ag.procedimento || procedimentos[0] || '' });
  };

  const horariosFiltrados = horarios.filter(s => {
    const t = buscaHorario.toLowerCase();
    return s.data.includes(t) || s.hora.includes(t) || (s.id?.toLowerCase() || "").includes(t) || (s.cliente?.nome.toLowerCase() || "").includes(t) || (s.ocupado ? "ocupada".includes(t) : "livre".includes(t));
  });

  const agendamentosFiltrados = agendamentos.filter(a => {
    const t = buscaAgendamento.toLowerCase();
    return a.nome.toLowerCase().includes(t) || a.data.includes(t) || a.status.toLowerCase().includes(t) || a.procedimento.toLowerCase().includes(t) || a.cpf.includes(t);
  });

  return (
    // ATENÇÃO AQUI: Retirado o overflow: hidden e o maxHeight para a tela rolar livremente!
    <main className="gestor-wrapper" style={{ padding: "120px 20px 40px", minHeight: "100vh" }}>
      <div className="gestor-container glass-panel" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", minHeight: "80vh" }}>
        
        <header className="gestor-header" style={{ marginBottom: "24px" }}>
          <h2 style={{ margin: 0, color: "var(--foreground)" }}>Painel da Gestora</h2>
          <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>Gerencie o sistema sem abrir a planilha.</p>
        </header>

        <nav className="gestor-tabs" style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "16px", overflowX: "auto" }}>
          <button className={`btn ${activeTab === "agendamentos" ? "btn-primary" : ""}`} onClick={() => setActiveTab("agendamentos")} style={activeTab !== "agendamentos" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}>📋 Agendamentos</button>
          <button className={`btn ${activeTab === "horarios" ? "btn-primary" : ""}`} onClick={() => setActiveTab("horarios")} style={activeTab !== "horarios" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}>🕒 Horários</button>
          <button className={`btn ${activeTab === "procedimentos" ? "btn-primary" : ""}`} onClick={() => setActiveTab("procedimentos")} style={activeTab !== "procedimentos" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}>🌸 Procedimentos</button>
        </nav>

        <section className="gestor-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* GUIA DE AGENDAMENTOS */}
          {activeTab === "agendamentos" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: "wrap", gap: "12px" }}>
                  <h3 style={{ fontSize: "1.2rem", margin: 0, color: "var(--foreground)" }}>Lista de Clientes</h3>
                  <div style={{ display: "flex", flex: "1 1 200px", maxWidth: "400px", position: "relative" }}>
                    <input type="text" placeholder="Buscar cliente, CPF ou procedimento..." value={buscaAgendamento} onChange={(e) => setBuscaAgendamento(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff" }} />
                  </div>
                  <button type="button" onClick={fetchAgendamentos} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem' }} title="Atualizar">
                    <i className={`fa-solid fa-rotate-right ${isLoadingAgendamentos ? 'fa-spin' : ''}`}></i>
                  </button>
                </div>

                {isLoadingAgendamentos && agendamentos.length === 0 ? (
                  <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando agendamentos...</p>
                ) : agendamentosFiltrados.length === 0 ? (
                  <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px" }}>Nenhum agendamento encontrado.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {agendamentosFiltrados.map((ag, i) => {
                      const procColor = getProcedimentoColor(ag.procedimento);
                      const visStatus = getStatusVisual(ag.status);
                      return (
                        <div key={i} onClick={() => openAgendamentoModal(ag)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderLeft: `6px solid ${procColor}`, borderRadius: "12px", padding: "16px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "1.2rem", color: "var(--foreground)" }}>{ag.nome}</strong>
                              <span style={{ background: visStatus.bg, color: visStatus.color, padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>
                                <i className={`fa-solid ${visStatus.icon}`} style={{ marginRight: '4px' }}></i> {visStatus.label}
                              </span>
                            </div>
                            <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}><i className="fa-regular fa-calendar" style={{marginRight: '6px', color: procColor}}></i>{ag.data} - {ag.dia} às <strong>{ag.hora}</strong></span>
                            <span style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 500 }}>{ag.procedimento}</span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", color: "var(--muted)" }}>
                            <span><strong>CPF:</strong> {ag.cpf}</span>
                            <span><strong>Tel:</strong> {ag.telefone}</span>
                          </div>

                          <div style={{ display: "flex", gap: "8px" }} onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => handleUpdateAgendamento(ag, 'concluído', ag.procedimento)} style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }} title="Marcar como Concluído"><i className="fa-solid fa-check"></i></button>
                            <button type="button" onClick={() => handleUpdateAgendamento(ag, 'cancelado', ag.procedimento)} style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }} title="Cancelar Horário"><i className="fa-solid fa-xmark"></i></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>
          )}
          
          {/* GUIA DE HORÁRIOS (Idêntica ao que já estava funcionando) */}
          {activeTab === "horarios" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <form onSubmit={handleAddHorario} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Data da Vaga</span>
                    <input type="date" value={novaDataInput} onChange={(e) => setNovaDataInput(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff" }} disabled={isLoadingHorarios} required />
                  </label>
                  <label style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Horário</span>
                    <input type="time" value={novaHoraInput} onChange={(e) => setNovaHoraInput(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff", colorScheme: "dark" }} disabled={isLoadingHorarios} required />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoadingHorarios || !novaDataInput || !novaHoraInput} style={{ height: "46px", flex: "1 1 100px" }}>{isLoadingHorarios ? "Salvando..." : "Abrir Vaga"}</button>
                </form>

                <div className="horarios-lista" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--foreground)" }}>Vagas na Planilha</h3>
                    <div style={{ display: "flex", flex: "1 1 180px", maxWidth: "300px", position: "relative" }}>
                      <input type="text" placeholder="Pesquisar..." value={buscaHorario} onChange={(e) => setBuscaHorario(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: "0.9rem" }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isSelectionMode ? (
                        <>
                          <button type="button" onClick={handleBulkDelete} disabled={selectedSlots.length === 0 || isLoadingHorarios} className="btn btn-primary" style={{ background: '#ff4d4f', borderColor: '#ff4d4f', padding: '8px 12px', fontSize: '0.9rem', display: 'flex', gap: '6px', alignItems: 'center' }}><i className="fa-solid fa-trash-can"></i> Deletar ({selectedSlots.length})</button>
                          <button type="button" onClick={toggleSelectionMode} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--foreground)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={toggleSelectionMode} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--foreground)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', gap: '6px', alignItems: 'center' }}><i className="fa-solid fa-list-check"></i> Selecionar</button>
                          <button type="button" onClick={fetchHorarios} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem', padding: "4px" }}><i className={`fa-solid fa-rotate-right ${isLoadingHorarios ? 'fa-spin' : ''}`}></i></button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {isLoadingHorarios && horarios.length === 0 ? ( <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p> ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
                      {horariosFiltrados.map((slot, index) => {
                        const [dia, mes, ano] = slot.data.split('/');
                        const diaSemana = new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', { weekday: 'long' });
                        const isSelected = selectedSlots.some(s => s.data === slot.data && s.hora === slot.hora);
                        return (
                          <li key={index} onClick={() => isSelectionMode ? handleToggleSlotSelection(slot.data, slot.hora) : setSelectedHorario(slot)} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "16px 12px", background: slot.ocupado ? "rgba(124, 99, 141, 0.1)" : "rgba(255,255,255,0.05)", borderRadius: "12px", border: isSelected ? "2px solid #ff4d4f" : (slot.ocupado ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)"), cursor: "pointer", gap: "4px", textAlign: "center", position: "relative" }}>
                            {isSelectionMode && <div style={{ position: "absolute", top: "8px", right: "8px", color: isSelected ? "#ff4d4f" : "rgba(255,255,255,0.2)", fontSize: "1.2rem" }}>{isSelected ? <i className="fa-solid fa-square-check"></i> : <i className="fa-regular fa-square"></i>}</div>}
                            <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600 }}>{slot.id || "#---"}</span>
                            <span style={{ color: "var(--primary)", fontSize: "0.9rem", textTransform: "capitalize", fontWeight: 500 }}>{diaSemana}</span>
                            <strong style={{ color: "var(--foreground)", fontSize: "1.6rem", lineHeight: "1" }}>{slot.hora}</strong>
                            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{slot.data}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
             </div>
          )}

          {/* GUIA DE PROCEDIMENTOS (Idêntica) */}
          {activeTab === "procedimentos" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <form onSubmit={handleAddProcedimento} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}><span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Novo Procedimento</span><input type="text" value={novoProcedimento} onChange={(e) => setNovoProcedimento(e.target.value)} placeholder="Ex: Limpeza de Pele Profunda" style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff" }} disabled={isLoadingProc} /></label>
                  <button type="submit" className="btn btn-primary" disabled={isLoadingProc || !novoProcedimento.trim()} style={{ height: "46px" }}>{isLoadingProc ? "Salvando..." : "Adicionar"}</button>
                </form>
                <div className="procedimentos-lista" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--foreground)" }}>Procedimentos Cadastrados</h3>
                  {isLoadingProc && procedimentos.length === 0 ? ( <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p> ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {procedimentos.map((proc) => (
                        <li key={proc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                          <span style={{ color: "var(--foreground)" }}>{proc}</span>
                          <button type="button" onClick={() => handleDeleteProcedimento(proc)} disabled={isLoadingProc} style={{ background: "transparent", border: "none", color: "#ff4d4f", cursor: "pointer", fontSize: "1.2rem", padding: "4px 8px" }}><i className="fa-solid fa-trash-can"></i></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
             </div>
          )}
        </section>
      </div>

      {/* MODAL DE EDICAO DE AGENDAMENTO (NOVO) */}
      {selectedAgendamento && (
        <div className="popup-overlay" onClick={() => setSelectedAgendamento(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background, #1a1a1a)', border: `1px solid ${getProcedimentoColor(selectedAgendamento.procedimento)}`, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.4rem' }}>Detalhes do Agendamento</h3>
              <button type="button" onClick={() => setSelectedAgendamento(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>{selectedAgendamento.nome}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Data: {selectedAgendamento.data} às {selectedAgendamento.hora}</span>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>WhatsApp: {selectedAgendamento.telefone}</span>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>
              Corrigir Procedimento
              <select 
                value={editAgendamento.procedimento} 
                onChange={e => setEditAgendamento({...editAgendamento, procedimento: e.target.value})}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff", cursor: "pointer" }}
              >
                {procedimentos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>
              Alterar Status
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[ {id: 'reservado', bg: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', label: 'Reservado'}, {id: 'concluído', bg: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', label: 'Concluído'}, {id: 'cancelado', bg: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', label: 'Cancelado'} ].map(s => (
                  <button 
                    key={s.id} type="button" 
                    onClick={() => setEditAgendamento({...editAgendamento, status: s.id})}
                    style={{ flex: 1, padding: "8px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "bold", cursor: "pointer", background: editAgendamento.status === s.id ? s.bg : "transparent", color: editAgendamento.status === s.id ? s.color : "var(--muted)", border: `1px solid ${editAgendamento.status === s.id ? s.color : "rgba(255,255,255,0.2)"}` }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </label>

            <button type="button" onClick={() => handleUpdateAgendamento(selectedAgendamento, editAgendamento.status, editAgendamento.procedimento)} disabled={isLoadingAgendamentos} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "var(--primary)", border: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
              {isLoadingAgendamentos ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}

      {/* POPUPS DE DETALHES, CONFIRMAÇÃO E STATUS (Omitidos para não poluir, são idênticos aos anteriores) */}
      {/* MODAL PADRÃO DE CONFIRMAÇÃO */}
      {isMounted && confirmModal && createPortal(
        <div className="popup-overlay" onClick={() => setConfirmModal(null)} style={{zIndex: 10000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background, #1a1a1a)', padding: "32px", gap: "16px", border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: "1.6rem", color: "var(--foreground)", fontWeight: "bold" }}>{confirmModal.title}</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{confirmModal.text}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "10px" }}>
              <button type="button" className="btn btn-primary" style={{ background: confirmModal.confirmColor, borderColor: confirmModal.confirmColor, width: "100%", cursor: 'pointer' }} onClick={confirmModal.onConfirm}>{confirmModal.confirmText}</button>
              <button type="button" style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer", padding: "8px" }} onClick={() => setConfirmModal(null)}>Voltar</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* POPUP DE STATUS */}
      {isMounted && status.message && createPortal(
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setStatus({ type: "idle", message: "" }); }} style={{ zIndex: 10001, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={`popup-content white-theme ${status.type}`} style={{ position: 'relative', background: 'var(--background, #1a1a1a)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div className="status-icon" style={{ fontSize: '2rem', color: status.type === 'error' ? '#ff4d4f' : 'var(--success, #25D366)' }}>{status.type === 'error' ? '✖' : '✔'}</div>
            <p style={{ textAlign: 'center', margin: 0, color: 'var(--foreground)' }}>{status.message}</p>
          </div>
        </div>, document.body
      )}
    </main>
  );
}