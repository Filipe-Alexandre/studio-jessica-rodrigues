"use client";

import React, { useState, useEffect } from "react";

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

export default function GestorPage() {
  const [activeTab, setActiveTab] = useState<"agendamentos" | "horarios" | "procedimentos">("horarios");
  
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
  
  // Controle do Pop-up Central e Seleção Múltipla
  const [selectedHorario, setSelectedHorario] = useState<HorarioSlot | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{data: string, hora: string}[]>([]);

  // Buscadores
  const fetchProcedimentos = async () => {
    setIsLoadingProc(true);
    try {
      const res = await fetch('/api/admin/procedimentos');
      const data = await res.json();
      setProcedimentos(data.procedimentos || []);
    } catch (error) { console.error(error); } finally { setIsLoadingProc(false); }
  };

  const fetchHorarios = async () => {
    setIsLoadingHorarios(true);
    try {
      const res = await fetch('/api/admin/horarios');
      const data = await res.json();
      setHorarios(data.horarios || []);
    } catch (error) { console.error(error); } finally { setIsLoadingHorarios(false); }
  };

  useEffect(() => {
    if (activeTab === "procedimentos") fetchProcedimentos();
    if (activeTab === "horarios") fetchHorarios();
  }, [activeTab]);

  // --- Handlers de Procedimentos ---
  const handleAddProcedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProcedimento.trim()) return;
    setIsLoadingProc(true);
    try {
      await fetch('/api/admin/procedimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', nome: novoProcedimento.trim() })
      });
      setNovoProcedimento("");
      await fetchProcedimentos();
    } catch (error) { console.error(error); setIsLoadingProc(false); }
  };

  const handleDeleteProcedimento = async (nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o procedimento "${nome}"?`)) return;
    setIsLoadingProc(true);
    try {
      await fetch('/api/admin/procedimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', nome })
      });
      await fetchProcedimentos();
    } catch (error) { console.error(error); setIsLoadingProc(false); }
  };

  // --- Handlers de Horários ---
  const handleAddHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDataInput || !novaHoraInput) return;

    const [ano, mes, dia] = novaDataInput.split("-");
    const dataFormatada = `${dia}/${mes}/${ano}`;

    setIsLoadingHorarios(true);
    try {
      await fetch('/api/admin/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', data: dataFormatada, hora: novaHoraInput })
      });
      setNovaHoraInput(""); 
      await fetchHorarios();
    } catch (error) { console.error(error); setIsLoadingHorarios(false); }
  };

  const handleDeleteHorario = async (data: string, hora: string) => {
    if (!confirm(`Tem certeza que deseja excluir a vaga do dia ${data} às ${hora}?`)) return;
    setIsLoadingHorarios(true);
    try {
      await fetch('/api/admin/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', data, hora })
      });
      await fetchHorarios();
      setSelectedHorario(null); 
    } catch (error) { console.error(error); setIsLoadingHorarios(false); }
  };

  // Lógica de Seleção Múltipla
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSlots([]);
  };

  const handleToggleSlotSelection = (data: string, hora: string) => {
    setSelectedSlots(prev => {
      const isAlreadySelected = prev.find(item => item.data === data && item.hora === hora);
      if (isAlreadySelected) {
        return prev.filter(item => !(item.data === data && item.hora === hora));
      } else {
        return [...prev, { data, hora }];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedSlots.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedSlots.length} vaga(s)?`)) return;

    setIsLoadingHorarios(true);
    try {
      await fetch('/api/admin/horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-delete', items: selectedSlots })
      });
      await fetchHorarios();
      setIsSelectionMode(false);
      setSelectedSlots([]);
    } catch (error) { console.error(error); setIsLoadingHorarios(false); }
  };

  // Lógica de filtro
  const horariosFiltrados = horarios.filter(slot => {
    const termo = buscaHorario.toLowerCase();
    const matchData = slot.data.includes(termo);
    const matchHora = slot.hora.includes(termo);
    const matchId = slot.id?.toLowerCase().includes(termo) || false;
    const matchNome = slot.cliente?.nome.toLowerCase().includes(termo) || false;
    const matchStatus = slot.ocupado ? "ocupada".includes(termo) : "livre".includes(termo);
    
    return matchData || matchHora || matchNome || matchStatus || matchId;
  });

  return (
    <main className="gestor-wrapper" style={{ padding: "120px 20px 40px", minHeight: "100vh", maxHeight: "100vh", overflow: "hidden" }}>
      <div className="gestor-container glass-panel" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
        
        <header className="gestor-header" style={{ marginBottom: "24px", flexShrink: 0 }}>
          <h2 style={{ margin: 0, color: "var(--foreground)" }}>Painel da Gestora</h2>
          <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>Gerencie o sistema sem abrir a planilha.</p>
        </header>

        <nav className="gestor-tabs" style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "16px", overflowX: "auto", flexShrink: 0 }}>
          <button 
            className={`btn ${activeTab === "agendamentos" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("agendamentos")}
            style={activeTab !== "agendamentos" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}
          >
            📋 Agendamentos
          </button>
          
          <button 
            className={`btn ${activeTab === "horarios" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("horarios")}
            style={activeTab !== "horarios" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}
          >
            🕒 Horários
          </button>

          <button 
            className={`btn ${activeTab === "procedimentos" ? "btn-primary" : ""}`}
            onClick={() => setActiveTab("procedimentos")}
            style={activeTab !== "procedimentos" ? { background: "transparent", color: "var(--foreground)", border: "1px solid rgba(255,255,255,0.2)" } : {}}
          >
            🌸 Procedimentos
          </button>
        </nav>

        <section className="gestor-content" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {activeTab === "agendamentos" && (
             <div>
                <h3 style={{ color: "var(--foreground)" }}>Agendamentos (Em breve)</h3>
             </div>
          )}
          
          {/* GUIA DE HORÁRIOS */}
          {activeTab === "horarios" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
                
                <form onSubmit={handleAddHorario} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", flexShrink: 0 }}>
                  <label style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Data da Vaga</span>
                    <input 
                      type="date" 
                      value={novaDataInput}
                      onChange={(e) => setNovaDataInput(e.target.value)}
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff" }}
                      disabled={isLoadingHorarios}
                      required
                    />
                  </label>
                  <label style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Horário</span>
                    <input 
                      type="time" 
                      value={novaHoraInput}
                      onChange={(e) => setNovaHoraInput(e.target.value)}
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff", colorScheme: "dark" }}
                      disabled={isLoadingHorarios}
                      required
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoadingHorarios || !novaDataInput || !novaHoraInput} style={{ height: "46px", flex: "1 1 100px" }}>
                    {isLoadingHorarios ? "Salvando..." : "Abrir Vaga"}
                  </button>
                </form>

                <div className="horarios-lista" style={{ flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "16px", flexShrink: 0, flexWrap: "wrap", gap: "12px" }}>
                    <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--foreground)" }}>Vagas na Planilha</h3>
                    
                    <div style={{ display: "flex", flex: "1 1 180px", maxWidth: "300px", position: "relative" }}>
                      <input 
                        type="text" 
                        placeholder="Pesquisar..."
                        value={buscaHorario}
                        onChange={(e) => setBuscaHorario(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: "0.9rem" }}
                      />
                      {buscaHorario && (
                        <button type="button" onClick={() => setBuscaHorario("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>

                    {/* BOTÕES DE SELEÇÃO E ATUALIZAR */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isSelectionMode ? (
                        <>
                          <button 
                            type="button" 
                            onClick={handleBulkDelete} 
                            disabled={selectedSlots.length === 0 || isLoadingHorarios} 
                            className="btn btn-primary" 
                            style={{ background: '#ff4d4f', borderColor: '#ff4d4f', padding: '8px 12px', fontSize: '0.9rem', display: 'flex', gap: '6px', alignItems: 'center' }}
                          >
                            <i className="fa-solid fa-trash-can"></i> Deletar ({selectedSlots.length})
                          </button>
                          <button 
                            type="button" 
                            onClick={toggleSelectionMode} 
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--foreground)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button" 
                            onClick={toggleSelectionMode} 
                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--foreground)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', gap: '6px', alignItems: 'center' }}
                          >
                            <i className="fa-solid fa-list-check"></i> Selecionar
                          </button>
                          <button type="button" onClick={fetchHorarios} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem', padding: "4px" }}>
                            <i className={`fa-solid fa-rotate-right ${isLoadingHorarios ? 'fa-spin' : ''}`}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
                    {isLoadingHorarios && horarios.length === 0 ? (
                      <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando grade...</p>
                    ) : horariosFiltrados.length === 0 ? (
                      <p style={{ color: "var(--muted)", textAlign: "center" }}>Nenhum horário encontrado na pesquisa.</p>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
                        {horariosFiltrados.map((slot, index) => {
                          const [dia, mes, ano] = slot.data.split('/');
                          const dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia));
                          const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                          
                          const isSelected = selectedSlots.some(s => s.data === slot.data && s.hora === slot.hora);

                          return (
                            <li 
                              key={index} 
                              onClick={() => {
                                if (isSelectionMode) {
                                  handleToggleSlotSelection(slot.data, slot.hora);
                                } else {
                                  setSelectedHorario(slot);
                                }
                              }}
                              style={{ 
                                display: "flex", 
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                padding: "16px 12px", 
                                background: slot.ocupado ? "rgba(124, 99, 141, 0.1)" : "rgba(255,255,255,0.05)", 
                                borderRadius: "12px",
                                border: isSelected ? "2px solid #ff4d4f" : (slot.ocupado ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)"),
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                gap: "4px",
                                textAlign: "center",
                                position: "relative" // Necessário para o ícone flutuante do checkbox
                              }}
                            >
                              {/* Ícone de Checkbox flutuante quando em Modo Seleção */}
                              {isSelectionMode && (
                                <div style={{ position: "absolute", top: "8px", right: "8px", color: isSelected ? "#ff4d4f" : "rgba(255,255,255,0.2)", fontSize: "1.2rem" }}>
                                  {isSelected ? <i className="fa-solid fa-square-check"></i> : <i className="fa-regular fa-square"></i>}
                                </div>
                              )}

                              <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                                {slot.id || "#---"}
                              </span>
                              
                              <span style={{ color: "var(--primary)", fontSize: "0.9rem", textTransform: "capitalize", fontWeight: 500, marginBottom: "4px" }}>
                                {diaSemana}
                              </span>
                              
                              <strong style={{ color: "var(--foreground)", fontSize: "1.6rem", lineHeight: "1" }}>
                                {slot.hora}
                              </strong>
                              
                              <span style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                                {slot.data}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

             </div>
          )}

          {activeTab === "procedimentos" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <form onSubmit={handleAddProcedimento} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", color: "var(--foreground)" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Novo Procedimento</span>
                    <input 
                      type="text" 
                      value={novoProcedimento}
                      onChange={(e) => setNovoProcedimento(e.target.value)}
                      placeholder="Ex: Limpeza de Pele Profunda"
                      style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.2)", color: "#fff" }}
                      disabled={isLoadingProc}
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={isLoadingProc || !novoProcedimento.trim()} style={{ height: "46px" }}>
                    {isLoadingProc ? "Salvando..." : "Adicionar"}
                  </button>
                </form>

                <div className="procedimentos-lista" style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "16px" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--foreground)" }}>Procedimentos Cadastrados</h3>
                  
                  {isLoadingProc && procedimentos.length === 0 ? (
                    <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p>
                  ) : procedimentos.length === 0 ? (
                    <p style={{ color: "var(--muted)", textAlign: "center" }}>Nenhum procedimento cadastrado.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {procedimentos.map((proc) => (
                        <li key={proc} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                          <span style={{ color: "var(--foreground)" }}>{proc}</span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteProcedimento(proc)}
                            disabled={isLoadingProc}
                            style={{ background: "transparent", border: "none", color: "#ff4d4f", cursor: "pointer", fontSize: "1.2rem", padding: "4px 8px" }}
                            title="Excluir Procedimento"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
             </div>
          )}

        </section>
      </div>

      {selectedHorario && !isSelectionMode && (
        <div 
          className="popup-overlay"
          onClick={() => setSelectedHorario(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
          }}
        >
          <div 
            className="popup-content white-theme"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--background, #1a1a1a)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
              display: 'flex', flexDirection: 'column', gap: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.4rem' }}>
                {selectedHorario.id ? `${selectedHorario.id} em ` : ''}{selectedHorario.data} às {selectedHorario.hora}
              </h3>
              <button type="button" onClick={() => setSelectedHorario(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedHorario.ocupado ? (
                <span style={{ color: "var(--primary)", padding: "4px 8px", background: "rgba(124, 99, 141, 0.2)", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold" }}>
                  <i className="fa-solid fa-lock"></i> Vaga Ocupada
                </span>
              ) : (
                <span style={{ color: "var(--success, #25D366)", padding: "4px 8px", background: "rgba(37, 211, 102, 0.2)", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold" }}>
                  <i className="fa-regular fa-circle-check"></i> Vaga Livre
                </span>
              )}
            </div>

            {selectedHorario.ocupado && selectedHorario.cliente ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Nome da Cliente</span>
                  <span style={{ color: "var(--foreground)", fontSize: "1.2rem", fontWeight: 700 }}>{selectedHorario.cliente.nome}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>WhatsApp</span>
                  <a href={`https://wa.me/55${selectedHorario.cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: "1.1rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                    <i className="fa-brands fa-whatsapp"></i> {selectedHorario.cliente.telefone}
                  </a>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', margin: '8px 0', fontSize: '0.95rem' }}>Esta vaga está disponível no site para as clientes agendarem.</p>
            )}

            <div style={{ display: 'flex', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleDeleteHorario(selectedHorario.data, selectedHorario.hora)}
                disabled={isLoadingHorarios}
                style={{ flex: 1, background: "#ff4d4f", border: "none", color: "#fff", cursor: "pointer", fontSize: "1rem", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", fontWeight: "bold" }}
              >
                <i className="fa-solid fa-trash-can"></i> Excluir Vaga da Planilha
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}