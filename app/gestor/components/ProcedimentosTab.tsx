"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { parseProcedimento } from "./utils";

type Props = {
  procedimentosRaw: string[];
  isLoading: boolean;
  onAdd: (formatado: string, onSuccess: () => void) => void;
  onDelete: (rawName: string) => void;
  onEdit: (oldRaw: string, newFormatado: string, onSuccess: () => void) => void;
};

export default function ProcedimentosTab({ procedimentosRaw, isLoading, onAdd, onDelete, onEdit }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [novoProcedimentoNome, setNovoProcedimentoNome] = useState("");
  const [novoProcedimentoCor, setNovoProcedimentoCor] = useState("#ff7eb3");
  const [editProcModal, setEditProcModal] = useState<{ originalRaw: string, nome: string, cor: string } | null>(null);

  useEffect(() => setIsMounted(true), []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProcedimentoNome.trim()) return;
    const procFormatado = `${novoProcedimentoNome.trim()};;${novoProcedimentoCor}`;
    onAdd(procFormatado, () => setNovoProcedimentoNome(""));
  };

  const handleEditSave = () => {
    if (!editProcModal) return;
    const novoFormatado = `${editProcModal.nome.trim()};;${editProcModal.cor}`;
    onEdit(editProcModal.originalRaw, novoFormatado, () => setEditProcModal(null));
  };

  const procedimentosOrdenados = [...procedimentosRaw].sort((a, b) => {
    const nomeA = parseProcedimento(a).nome.toLowerCase();
    const nomeB = parseProcedimento(b).nome.toLowerCase();
    if (nomeA.includes("limpeza de pele") && !nomeB.includes("limpeza de pele")) return -1;
    if (!nomeA.includes("limpeza de pele") && nomeB.includes("limpeza de pele")) return 1;
    return nomeA.localeCompare(nomeB);
  });

  return (
    <>
      <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <label className="gestor-input-group" style={{ flex: 2 }}>
          <span>Novo Procedimento</span>
          <input type="text" className="gestor-input" value={novoProcedimentoNome} onChange={(e) => setNovoProcedimentoNome(e.target.value)} placeholder="Ex: Limpeza de Pele Profunda" disabled={isLoading} />
        </label>
        <label className="gestor-input-group" style={{ flex: 1, maxWidth: "100px", alignItems: "center" }}>
          <span>Cor</span>
          <input type="color" className="gestor-color-input" value={novoProcedimentoCor} onChange={(e) => setNovoProcedimentoCor(e.target.value)} disabled={isLoading} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !novoProcedimentoNome.trim()} style={{ height: "46px" }}>{isLoading ? "Salvando..." : "Adicionar"}</button>
      </form>

      <div>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--foreground)" }}>Procedimentos Cadastrados</h3>
        {isLoading && procedimentosRaw.length === 0 ? ( <p style={{ color: "var(--muted)", textAlign: "center" }}>Carregando...</p> ) : (
          <ul className="procedimentos-list">
            {procedimentosOrdenados.map((rawString) => {
              const proc = parseProcedimento(rawString);
              return (
                <li key={rawString} className="proc-item" style={{ borderLeft: `6px solid ${proc.cor}` }}>
                  <span>{proc.nome}</span>
                  <div className="proc-actions">
                    <button type="button" className="btn-edit" onClick={() => setEditProcModal({ originalRaw: rawString, nome: proc.nome, cor: proc.cor })} title="Editar"><i className="fa-solid fa-pen-to-square"></i></button>
                    <button type="button" className="btn-delete" onClick={() => onDelete(rawString)} disabled={isLoading} title="Excluir"><i className="fa-solid fa-trash-can"></i></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isMounted && editProcModal && createPortal(
        <div className="popup-overlay" onClick={() => setEditProcModal(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ background: 'var(--background)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <button className="popup-close-btn" onClick={() => setEditProcModal(null)}><i className="fa-solid fa-xmark"></i></button>
            <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Editar Procedimento</h3>
            
            <label className="gestor-input-group">
              <span>Nome do Procedimento</span>
              <input type="text" className="gestor-input" value={editProcModal.nome} onChange={e => setEditProcModal({...editProcModal, nome: e.target.value})} />
            </label>
            <label className="gestor-input-group" style={{ alignItems: "flex-start" }}>
              <span>Cor do Procedimento</span>
              <input type="color" className="gestor-color-input" value={editProcModal.cor} onChange={e => setEditProcModal({...editProcModal, cor: e.target.value})} />
            </label>
            <button type="button" onClick={handleEditSave} className="btn btn-primary" disabled={isLoading} style={{ width: "100%", marginTop: "10px" }}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      , document.body)}
    </>
  );
}