"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "../components/Header";
import AgendamentosTab from "./components/AgendamentosTab";
import HorariosTab from "./components/HorariosTab";
import ProcedimentosTab from "./components/ProcedimentosTab";
import { HorarioSlot, Agendamento, parseProcedimento } from "./components/utils";
import "../styles/gestor.scss";
import "../styles/gestor-query.scss";


export default function GestorPage() {
  const [activeTab, setActiveTab] = useState<"agendamentos" | "horarios" | "procedimentos">("agendamentos");
  const [isMounted, setIsMounted] = useState(false);

  const [procedimentosRaw, setProcedimentosRaw] = useState<string[]>([]);
  const [isLoadingProc, setIsLoadingProc] = useState(false);

  const [horarios, setHorarios] = useState<HorarioSlot[]>([]);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [isLoadingAgendamentos, setIsLoadingAgendamentos] = useState(false);

  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "info"; message: string }>({ type: "idle", message: "" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; text: string; confirmText: string; confirmColor: string; onConfirm: () => void; } | null>(null);

  const [isEasterEggHovered, setIsEasterEggHovered] = useState(false);


  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (status.message && status.type !== 'idle') {
      const timer = setTimeout(() => setStatus({ type: "idle", message: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message, status.type]);

  const fetchProcedimentos = async () => {
    setIsLoadingProc(true);
    try {
      const res = await fetch(`/api/admin/procedimentos?t=${Date.now()}`);
      const data = await res.json();
      setProcedimentosRaw(data.procedimentos || []);
    } catch (e) { console.error(e); } finally { setIsLoadingProc(false); }
  };

  const fetchHorarios = async () => {
    setIsLoadingHorarios(true);
    try {
      const res = await fetch(`/api/admin/horarios?t=${Date.now()}`);
      const data = await res.json();
      setHorarios(data.horarios || []);
    } catch (e) { console.error(e); } finally { setIsLoadingHorarios(false); }
  };

  const fetchAgendamentos = async () => {
    setIsLoadingAgendamentos(true);
    try {
      const res = await fetch(`/api/admin/agendamentos?t=${Date.now()}`);
      if (!res.ok) throw new Error("API Falhou");
      const data = await res.json();
      setAgendamentos(data.agendamentos || []);
    } catch (e) { console.error(e); } finally { setIsLoadingAgendamentos(false); }
  };

  useEffect(() => {
    if (activeTab === "procedimentos") fetchProcedimentos();
    if (activeTab === "horarios") { fetchHorarios(); fetchAgendamentos(); }
    if (activeTab === "agendamentos") { fetchAgendamentos(); if (procedimentosRaw.length === 0) fetchProcedimentos(); }
  }, [activeTab]);

  /* --- ACTIONS PROCEDIMENTOS --- */
  const handleAddProcedimento = async (formatado: string, onSuccess: () => void) => {
    setIsLoadingProc(true);
    try {
      await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', nome: formatado }) });
      onSuccess(); await fetchProcedimentos(); setStatus({ type: "success", message: "Procedimento adicionado!" });
    } catch (e) { setStatus({ type: "error", message: "Erro ao adicionar." }); } finally { setIsLoadingProc(false); }
  };

  const handleDeleteProcedimento = (rawName: string) => {
    const obj = parseProcedimento(rawName);
    setConfirmModal({
      isOpen: true, title: "Excluir Procedimento", text: `Excluir o procedimento "${obj.nome}"?`, confirmText: "Excluir", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingProc(true);
        try {
          await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', nome: rawName }) });
          await fetchProcedimentos(); setStatus({ type: "success", message: "Procedimento excluído!" });
        } catch (e) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingProc(false); }
      }
    });
  };

  const handleEditProcedimento = async (oldRaw: string, newFormatado: string, onSuccess: () => void) => {
    setIsLoadingProc(true);
    try {
      await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', nome: oldRaw }) });
      await fetch('/api/admin/procedimentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', nome: newFormatado }) });
      onSuccess(); await fetchProcedimentos(); setStatus({ type: "success", message: "Procedimento atualizado!" });
    } catch (e) { setStatus({ type: "error", message: "Erro ao atualizar." }); } finally { setIsLoadingProc(false); }
  };

  /* --- ACTIONS HORÁRIOS --- */
  const handleAddHorario = async (dataFormatada: string, hora: string, onSuccess: () => void) => {
    setIsLoadingHorarios(true);
    try {
      const res = await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', data: dataFormatada, hora }) });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error);
      onSuccess(); await fetchHorarios(); setStatus({ type: "success", message: "Vaga aberta com sucesso!" });
    } catch (e: any) { setStatus({ type: "error", message: e.message || "Erro ao abrir vaga." }); } finally { setIsLoadingHorarios(false); }
  };

  const handleDeleteHorario = (data: string, hora: string) => {
    setConfirmModal({
      isOpen: true, title: "Excluir Vaga", text: `Excluir a vaga de ${data} às ${hora}?`, confirmText: "Excluir", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingHorarios(true);
        try {
          await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', data, hora }) });
          await fetchHorarios(); fetchAgendamentos(); setStatus({ type: "success", message: "Vaga excluída!" });
        } catch (e) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingHorarios(false); }
      }
    });
  };

  const handleBulkDelete = (slots: { data: string, hora: string }[], onSuccess: () => void) => {
    setConfirmModal({
      isOpen: true, title: "Excluir em Massa", text: `Excluir ${slots.length} vagas?`, confirmText: "Excluir Todas", confirmColor: "#ff4d4f",
      onConfirm: async () => {
        setConfirmModal(null); setIsLoadingHorarios(true);
        try {
          await fetch('/api/admin/horarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk-delete', items: slots }) });
          onSuccess(); await fetchHorarios(); fetchAgendamentos(); setStatus({ type: "success", message: "Vagas excluídas!" });
        } catch (e) { setStatus({ type: "error", message: "Erro ao excluir." }); } finally { setIsLoadingHorarios(false); }
      }
    });
  };

  /* --- ACTIONS AGENDAMENTOS --- */
  const handleUpdateAgendamento = async (ag: Agendamento, newStatus: string, newProcRaw: string, onSuccess: () => void) => {
    setIsLoadingAgendamentos(true);
    try {
      const res = await fetch('/api/admin/agendamentos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: ag.data, hora: ag.hora, status: newStatus, procedimento: newProcRaw }) });
      if (!res.ok) throw new Error("Falha");
      onSuccess(); await fetchAgendamentos(); await fetchHorarios(); setStatus({ type: "success", message: "Agendamento atualizado!" });
    } catch (e) { setStatus({ type: "error", message: "Erro ao atualizar." }); } finally { setIsLoadingAgendamentos(false); }
  };

  return (
    <div className="gestor-page-wrapper">
      <Header />

      <div className="gestor-container">
<aside
          className={`easter-egg-header ${isEasterEggHovered ? 'hovered' : ''}`}
          onMouseEnter={() => setIsEasterEggHovered(true)}
          onMouseLeave={() => setIsEasterEggHovered(false)}
        >
          <h2 className="easter-egg-text">
            "Mesmo com todo o brilho infinito das estrelas, você tem o brilho mais intenso e acolhedor de todo o universo."
          </h2>
          <span className="easter-egg-secret">
            Eu te amo ❤️
          </span>
        </aside>

        <div className="gestor-tabs">
          <button className={`btn-tab ${activeTab === "agendamentos" ? "active" : ""}`} onClick={() => setActiveTab("agendamentos")}>📋 Agendamentos</button>
          <button className={`btn-tab ${activeTab === "horarios" ? "active" : ""}`} onClick={() => setActiveTab("horarios")}>🕒 Horários</button>
          <button className={`btn-tab ${activeTab === "procedimentos" ? "active" : ""}`} onClick={() => setActiveTab("procedimentos")}>🌸 Procedimentos</button>
        </div>

        <div className="gestor-scroll-area">
          {activeTab === "agendamentos" && (
            <AgendamentosTab agendamentos={agendamentos} procedimentosRaw={procedimentosRaw} isLoading={isLoadingAgendamentos} onRefresh={fetchAgendamentos} onUpdate={handleUpdateAgendamento} />
          )}

          {activeTab === "horarios" && (
            <HorariosTab horarios={horarios} agendamentos={agendamentos} isLoading={isLoadingHorarios} onAdd={handleAddHorario} onDelete={handleDeleteHorario} onBulkDelete={handleBulkDelete} onRefresh={fetchHorarios} />
          )}

          {activeTab === "procedimentos" && (
            <ProcedimentosTab procedimentosRaw={procedimentosRaw} isLoading={isLoadingProc} onAdd={handleAddProcedimento} onDelete={handleDeleteProcedimento} onEdit={handleEditProcedimento} />
          )}
        </div>
      </div>

      {/* MODAIS GLOBAIS (Status e Exclusões) */}
      {isMounted && confirmModal && createPortal(
        <div className="popup-overlay" onClick={() => setConfirmModal(null)} style={{ zIndex: 10000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background)', padding: "32px", gap: "16px", borderRadius: '24px', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: 0, fontSize: "1.6rem", color: "var(--foreground)", fontWeight: "bold" }}>{confirmModal.title}</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{confirmModal.text}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "10px" }}>
              <button type="button" className="btn btn-primary" style={{ background: confirmModal.confirmColor, borderColor: confirmModal.confirmColor, width: "100%" }} onClick={confirmModal.onConfirm}>{confirmModal.confirmText}</button>
              <button type="button" style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer", padding: "8px" }} onClick={() => setConfirmModal(null)}>Voltar</button>
            </div>
          </div>
        </div>, document.body
      )}

      {isMounted && status.message && createPortal(
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setStatus({ type: "idle", message: "" }); }} style={{ zIndex: 10001, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={`popup-content white-theme ${status.type}`} style={{ position: 'relative', background: 'var(--background)', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="status-icon" style={{ fontSize: '2rem', color: status.type === 'error' ? '#ff4d4f' : 'var(--success, #25D366)' }}>{status.type === 'error' ? '✖' : '✔'}</div>
            <p style={{ textAlign: 'center', margin: 0, color: 'var(--foreground)' }}>{status.message}</p>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

