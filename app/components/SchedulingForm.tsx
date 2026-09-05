"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { STUDIO_NAME, STUDIO_LOCATION, STUDIO_PHONE } from "../lib/config";

type ScheduleSlot = {
  id: string;
  date: string;
  dayLabel: string;
  time: string;
};

const isValidCpf = (cpf: string) => {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;

  return true;
};

const generateICS = (servico: string, dateStr: string, timeStr: string) => {
  try {
    const [dia, mes, ano] = dateStr.split('/');
    const [hora, minuto] = timeStr.split(':');

    const startDate = `${ano}${mes}${dia}T${hora}${minuto}00`;
    const endHora = String(Number(hora) + 2).padStart(2, '0');
    const endDate = `${ano}${mes}${dia}T${endHora}${minuto}00`;

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//${STUDIO_NAME}//Agendamento//PT\nBEGIN:VEVENT\nSUMMARY:Agendamento: ${servico}\nDTSTART;TZID=America/Sao_Paulo:${startDate}\nDTEND;TZID=America/Sao_Paulo:${endDate}\nLOCATION:${STUDIO_LOCATION}\nDESCRIPTION:Seu momento de cuidado e bem-estar no ${STUDIO_NAME}.\nEND:VEVENT\nEND:VCALENDAR`;

    const safeDate = dateStr.replace(/\//g, "-");
    const safeTime = timeStr.replace(":", "h");
    const fileName = `Agendamento_${STUDIO_NAME.replace(/\s/g, "_")}_${safeDate}_${safeTime}.ics`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Erro ao gerar calendário", error);
  }
};

const getMonthName = (dateStr: string) => {
  const [dia, mes, ano] = dateStr.split('/');
  const date = new Date(Number(ano), Number(mes) - 1, 1);
  const currentYear = new Date().getFullYear();
  const monthStr = date.toLocaleDateString('pt-BR', { month: 'long' });

  if (Number(ano) === currentYear) {
    return monthStr;
  } else {
    return `${monthStr}/${ano.slice(-2)}`;
  }
};

export default function SchedulingForm() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [procedimentos, setProcedimentos] = useState<string[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [meusHorariosCpf, setMeusHorariosCpf] = useState("");
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isSearchingBookings, setIsSearchingBookings] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const nomeInputRef = useRef<HTMLInputElement>(null);
  const telefoneInputRef = useRef<HTMLInputElement>(null);
  const cpfInputRef = useRef<HTMLInputElement>(null);
  const servicoDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    servico: "",
  });

  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "info"; message: string }>({
    type: "idle",
    message: "",
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    text: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  const [popupStep, setPopupStep] = useState<1 | 2 | 3>(1);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<{ servico: string, date: string, time: string } | null>(null);
  const [waLinkStr, setWaLinkStr] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Timer: Fecha popup de erro ou informação nativa (5 segundos)
  useEffect(() => {
    if (status.message && (status.type === 'error' || status.type === 'info')) {
      const timer = setTimeout(() => {
        setStatus({ type: "idle", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message, status.type]);

  // Timer: Passo 2 (Agenda) -> Passo 3 (Mapa) - 10 SEGUNDOS
  useEffect(() => {
    if (status.type === 'success' && popupStep === 2) {
      const timer = setTimeout(() => {
        setPopupStep(3);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [status.type, popupStep]);

  // Timer: Passo 3 (Mapa) -> Fecha o Popup - 10 SEGUNDOS
  useEffect(() => {
    if (status.type === 'success' && popupStep === 3) {
      const timer = setTimeout(() => {
        setStatus({ type: "idle", message: "" });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [status.type, popupStep]);

  const loadAvailability = async () => {
    try {
      const response = await fetch(`/api/availability?t=${Date.now()}`);
      if (!response.ok) return;

      const data = await response.json();
      const fetchedSlots = data.slots ?? [];
      setSlots(fetchedSlots);
      setProcedimentos(data.procedimentos ?? []);

      if (data.procedimentos?.length > 0 && !formData.servico) {
        setFormData(current => ({ ...current, servico: data.procedimentos[0] }));
      }
      if (fetchedSlots.length > 0 && !selectedMonth) {
        setSelectedMonth(getMonthName(fetchedSlots[0].date));
      }
    } catch {
      setSlots([]);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    setFormData({ ...formData, telefone: value });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setFormData({ ...formData, cpf: value });
  };

  const formatSearchCpf = (val: string) => {
    let v = val.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  };

  const fetchMyBookings = async () => {
    const cleanCpf = meusHorariosCpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setStatus({ type: "error", message: "Digite um CPF válido com 11 dígitos para buscar." });
      return;
    }
    setIsSearchingBookings(true);
    try {
      const res = await fetch(`/api/my-bookings?cpf=${cleanCpf}&t=${Date.now()}`);
      if (!res.ok) {
        setStatus({ type: "error", message: "Erro ao buscar no servidor. Tente novamente." });
        return;
      }
      const data = await res.json();
      setMyBookings(data.bookings || []);
      setHasSearched(true);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Falha ao buscar agendamentos." });
    } finally {
      setIsSearchingBookings(false);
    }
  };

  const handleCancelBooking = (booking: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancelar Horário",
      text: `Deseja realmente cancelar o seu agendamento de ${booking.servico}?`,
      confirmText: "Sim, Cancelar",
      confirmColor: "#DC3545",
      onConfirm: async () => {
        setConfirmModal(null);
        setIsSearchingBookings(true);
        try {
          await fetch('/api/my-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rowIndex: booking.rowIndex,
              date: booking.date,
              time: booking.time,
              cpf: meusHorariosCpf
            })
          });
          await loadAvailability();
          await fetchMyBookings();

          const msg = `Olá, gostaria de cancelar meu agendamento de ${booking.servico} no dia ${booking.date} às ${booking.time}.`;
          window.open(`https://wa.me/${STUDIO_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
        } catch (e) {
          console.error(e);
          setStatus({ type: "error", message: "Erro ao cancelar o agendamento." });
        } finally {
          setIsSearchingBookings(false);
        }
      }
    });
  };

  const handleRescheduleBooking = (booking: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Reagendar Horário",
      text: "Isso cancelará o seu horário atual e preparará o formulário para você escolher um novo. Deseja continuar?",
      confirmText: "Sim, Reagendar",
      confirmColor: "var(--primary)",
      onConfirm: async () => {
        setConfirmModal(null);
        setIsSearchingBookings(true);
        try {
          await fetch('/api/my-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rowIndex: booking.rowIndex,
              date: booking.date,
              time: booking.time,
              cpf: meusHorariosCpf
            })
          });

          setFormData({
            nome: booking.nome,
            telefone: booking.telefone,
            cpf: booking.cpf,
            servico: booking.servico
          });

          await loadAvailability();
          await fetchMyBookings();

          setStatus({ type: "info", message: "Horário liberado! Escolha a nova data acima e confirme seu reagendamento." });
          window.scrollTo({ top: document.getElementById('agendar')?.offsetTop || 0, behavior: 'smooth' });
        } catch (e) {
          console.error(e);
          setStatus({ type: "error", message: "Erro ao reagendar." });
        } finally {
          setIsSearchingBookings(false);
        }
      }
    });
  };

  const handleBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlotId) return setStatus({ type: "error", message: "Selecione um horário disponível." });
    if (!formData.nome.trim() || formData.telefone.replace(/\D/g, "").length < 10) return setStatus({ type: "error", message: "Preencha o nome e um telefone válido." });
    if (!isValidCpf(formData.cpf)) return setStatus({ type: "error", message: "Por favor, insira um CPF válido." });

    const chosenSlot = slots.find((slot) => slot.id === selectedSlotId);
    if (!chosenSlot) return;

    setIsLoading(true);
    setStatus({ type: "idle", message: "" });
    setPopupStep(1);

    const payload = {
      id: chosenSlot.id,
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
      cpf: formData.cpf.trim(),
      servico: formData.servico,
      date: chosenSlot.date,
      dayLabel: chosenSlot.dayLabel,
      time: chosenSlot.time,
    };

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao realizar agendamento.");
      }

      await loadAvailability();

      setSelectedSlotId("");
      setAgendamentoConfirmado({ servico: payload.servico, date: payload.date, time: payload.time });
      setWaLinkStr(result.waLink || `https://wa.me/${STUDIO_PHONE}`);

      setStatus({ type: "success", message: "Horário pré-reservado! Falta apenas um passo." });
      setFormData({ nome: "", telefone: "", cpf: "", servico: procedimentos[0] });

    } catch (error: any) {
      setStatus({ type: "error", message: error.message || "Erro ao confirmar. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotSelection = (slotId: string) => {
    setSelectedSlotId(slotId);
    setTimeout(() => nomeInputRef.current?.focus(), 50);
  };

  const availableMonths = Array.from(new Set(slots.map((slot) => getMonthName(slot.date))));
  const filteredSlots = slots.filter((slot) => getMonthName(slot.date) === selectedMonth);

  return (
    <section className="scheduling-shell" id="agendar">
      <div className="scheduling-header">
        <span className="eyebrow">Disponibilidade</span>
        <h2>Escolha o melhor horário para você.</h2>
      </div>

      <div className="scheduling-grid">

        {/* COLUNA ESQUERDA (VAGAS) */}
        <div className="left-column-wrapper">
          <div className="available-panel glass-panel">
            <div className="available-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                Horários disponíveis
              </h3>
              <button
                type="button"
                onClick={loadAvailability}
                className="btn-icon-refresh"
                title="Atualizar horários"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>

            {availableMonths.length > 0 && (
              <div className="month-filters">
                {availableMonths.map((month) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => setSelectedMonth(month)}
                    className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {filteredSlots.length === 0 ? (
              <p className="empty-state">Nenhum horário disponível para {selectedMonth}.</p>
            ) : (
              <div className="slot-list">
                {filteredSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`slot-card ${selectedSlotId === slot.id ? "selected" : ""}`}
                    onClick={() => handleSlotSelection(slot.id)}
                  >
                    <span className="slot-date">{slot.dayLabel} - {slot.date}</span>
                    <strong>{slot.time}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (FORMULÁRIO) */}
        <form className="booking-form glass-panel" onSubmit={handleBooking}>
          <h3>Dados do cliente</h3>

          <label>
            <span>Nome</span>
            <input
              type="text"
              ref={nomeInputRef}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  telefoneInputRef.current?.focus();
                }
              }}
            />
          </label>

          <label>
            <span>Telefone</span>
            <input
              type="tel"
              ref={telefoneInputRef}
              value={formData.telefone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              maxLength={15}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  cpfInputRef.current?.focus();
                }
              }}
            />
          </label>

          <label>
            <span>CPF</span>
            <input
              type="text"
              ref={cpfInputRef}
              value={formData.cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  servicoDropdownRef.current?.focus();
                  setIsDropdownOpen(true);
                }
              }}
            />
          </label>

          <label className="custom-dropdown-label">
            <span>Serviço</span>
            <div className="custom-dropdown-container" ref={dropdownContainerRef}>
              <div
                ref={servicoDropdownRef}
                tabIndex={0}
                className={`custom-dropdown-selected ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setIsDropdownOpen(!isDropdownOpen);
                  }
                }}
              >
                {formData.servico || "Selecione um serviço"}
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </div>

              {isDropdownOpen && (
                <div className="custom-dropdown-list">
                  {procedimentos.map((proc) => (
                    <div
                      key={proc}
                      className={`custom-dropdown-item ${formData.servico === proc ? 'selected-item' : ''}`}
                      onClick={() => {
                        setFormData({ ...formData, servico: proc });
                        setIsDropdownOpen(false);
                      }}
                    >
                      {proc}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          <button
            type="submit"
            className={`btn btn-primary booking-submit ${isLoading ? 'is-loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? "Processando..." : "Confirmar agendamento"}
          </button>
        </form>

        {/* MEUS HORÁRIOS (LARGURA TOTAL) */}
        <div className="my-bookings-panel glass-panel">
          <div className="my-bookings-header">
            <h3>Meus horários</h3>
          </div>

          <div className="my-bookings-search">
            <input
              type="tel"
              placeholder="Digite seu CPF..."
              value={meusHorariosCpf}
              onChange={(e) => setMeusHorariosCpf(formatSearchCpf(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fetchMyBookings();
                }
              }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', fontSize: '0.95rem' }}
            />
            <button type="button" onClick={fetchMyBookings} className="btn-primary" style={{ padding: '0.6rem 1.4rem', borderRadius: '999px', fontSize: '0.9rem', minWidth: '100px', cursor: 'pointer' }}>
              {isSearchingBookings ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {hasSearched && myBookings.length === 0 && (
            <p className="empty-state" style={{ textAlign: 'center', marginTop: '8px' }}>Nenhum horário reservado encontrado.</p>
          )}

          {myBookings.length > 0 && (
            <div className="my-bookings-list">
              {myBookings.map((b) => (
                <div key={b.rowIndex} className="my-booking-card">
                  <div className="my-booking-info">
                    <strong>{b.date} às {b.time}</strong>
                    <small>{b.servico}</small>
                  </div>
                  <div className="my-booking-actions">
                    <button type="button" onClick={() => handleRescheduleBooking(b)} className="btn-action reschedule" title="Reagendar Horário">
                      <i className="fa-regular fa-clock" style={{ fontSize: '1.2rem' }}></i>
                    </button>
                    <button type="button" onClick={() => handleCancelBooking(b)} className="btn-action cancel" title="Cancelar Horário">
                      <i className="fa-solid fa-xmark" style={{ fontSize: '1.2rem' }}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO (Cancelar / Reagendar) */}
      {isMounted && confirmModal && createPortal(
        <div className="popup-overlay" onClick={() => setConfirmModal(null)}>
          <div className="popup-content white-theme" onClick={e => e.stopPropagation()} style={{ padding: "32px", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.6rem", color: "var(--foreground)", fontFamily: "var(--font-display)", fontWeight: "bold" }}>{confirmModal.title}</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{confirmModal.text}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "10px" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: confirmModal.confirmColor, borderColor: confirmModal.confirmColor, width: "100%", cursor: 'pointer' }}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText}
              </button>
              <button
                type="button"
                style={{ background: "transparent", color: "var(--muted)", border: "none", cursor: "pointer", padding: "8px" }}
                onClick={() => setConfirmModal(null)}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* POPUP DE STATUS / INFORMAÇÃO / 3 PASSOS */}
      {isMounted && status.message && createPortal(
        <div
          className="popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (status.type === 'error' || status.type === 'info' || (status.type === 'success' && popupStep === 3)) {
                setStatus({ type: "idle", message: "" });
              }
            }
          }}
        >
          <div className={`popup-content white-theme ${status.type}`} style={{ position: 'relative' }}>

            {((status.type === 'success' && (popupStep === 2 || popupStep === 3)) || status.type === 'info') && (
              <svg
                key={status.type === 'info' ? 'info' : popupStep}
                className="popup-border-svg"
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  pointerEvents: 'none', borderRadius: '24px', zIndex: 10
                }}
              >
                <rect
                  x="2" y="2"
                  width="calc(100% - 4px)" height="calc(100% - 4px)"
                  rx="22" ry="22"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  pathLength="100"
                  className="popup-border-rect"
                  style={status.type === 'info' ? { animationDuration: '5s' } : undefined}
                />
              </svg>
            )}

            <div className="status-icon-container">
              {(status.type === 'error' || status.type === 'info') && (
                <div className="spinner-ring" style={{ borderColor: status.type === 'error' ? 'rgba(255, 77, 79, 0.8)' : 'var(--primary)' }}></div>
              )}
              <div className="status-icon" style={{ color: status.type === 'error' ? '#ff4d4f' : 'var(--primary)' }}>
                {status.type === 'error' ? '✖' : status.type === 'info' ? 'ℹ' : '✔'}
              </div>
            </div>

            <p>
              {(status.type === 'error' || status.type === 'info') ? status.message :
                popupStep === 1 ? status.message :
                  popupStep === 2 ? "Tudo certo! Para não esquecer, adicione à sua agenda:" :
                    "Prepare-se para seu momento de cuidado! Veja nossa localização:"}
            </p>

            {status.type === 'success' && popupStep === 1 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "10px", backgroundColor: "#25D366" }}
                onClick={() => {
                  window.open(waLinkStr, "_blank");
                  setPopupStep(2);
                }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: '8px' }}></i>
                Enviar Confirmação
              </button>
            )}

            {status.type === 'success' && popupStep === 2 && agendamentoConfirmado && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => generateICS(agendamentoConfirmado.servico, agendamentoConfirmado.date, agendamentoConfirmado.time)}
                >
                  📅 Adicionar ao Calendário
                </button>
                <button
                  type="button"
                  style={{ background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', marginTop: '4px' }}
                  onClick={() => setPopupStep(3)}
                >
                  Pular
                </button>
              </div>
            )}

            {status.type === 'success' && popupStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' }}>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=-23.5336266,-46.4917648"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', width: '100%', display: 'inline-flex', justifyContent: 'center' }}
                  onClick={() => setStatus({ type: "idle", message: "" })}
                >
                  📍 Ver como chegar
                </a>
                <button
                  type="button"
                  style={{ background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', marginTop: '4px' }}
                  onClick={() => setStatus({ type: "idle", message: "" })}
                >
                  Fechar janela
                </button>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </section>
  );
}