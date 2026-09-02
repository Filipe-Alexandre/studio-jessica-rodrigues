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

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${STUDIO_NAME}//Agendamento//PT
BEGIN:VEVENT
SUMMARY:Agendamento: ${servico}
DTSTART;TZID=America/Sao_Paulo:${startDate}
DTEND;TZID=America/Sao_Paulo:${endDate}
LOCATION:${STUDIO_LOCATION}
DESCRIPTION:Seu momento de cuidado e bem-estar no ${STUDIO_NAME}.
END:VEVENT
END:VCALENDAR`;

    // 1. Plano A: Tenta abrir a bandeja nativa (Exclusivo para Produção/HTTPS)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([icsContent], 'Agendamento.ics', { type: 'text/calendar' });
      
      if (navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Agendamento Confirmado',
        }).catch((err) => console.log("Ação nativa cancelada.", err));
        return; // Interrompe aqui se a bandeja abrir com sucesso
      }
    }

    // 2. Plano B: Força o download clássico do .ics (Funciona no Teste Local/HTTP e em PCs)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Agendamento_${STUDIO_NAME.replace(/\s/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100); // Limpa a memória

  } catch (error) {
    console.error("Erro ao gerar calendário", error);
    alert("Ocorreu um erro ao gerar o convite do calendário.");
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

  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });

  const [popupStep, setPopupStep] = useState<1 | 2>(1);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<{ servico: string, date: string, time: string } | null>(null);
  const [waLinkStr, setWaLinkStr] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (status.message && status.type === 'error') {
      const timer = setTimeout(() => {
        setStatus({ type: "idle", message: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status.message, status.type]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/availability");
        const data = await response.json();
        const fetchedSlots = data.slots ?? [];
        setSlots(fetchedSlots);
        setProcedimentos(data.procedimentos ?? []);

        if (data.procedimentos?.length > 0) {
          setFormData(current => ({ ...current, servico: data.procedimentos[0] }));
        }
        if (fetchedSlots.length > 0) {
          setSelectedMonth(getMonthName(fetchedSlots[0].date));
        }
      } catch {
        setSlots([]);
      }
    };
    fetchData();
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

  const handleBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlotId) {
      setStatus({ type: "error", message: "Selecione um horário disponível." });
      return;
    }

    if (!formData.nome.trim() || formData.telefone.replace(/\D/g, "").length < 10) {
      setStatus({ type: "error", message: "Preencha o nome e um telefone válido." });
      return;
    }

    if (!isValidCpf(formData.cpf)) {
      setStatus({ type: "error", message: "Por favor, insira um CPF válido." });
      return;
    }

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

      const remainingSlots = slots.filter((slot) => slot.id !== selectedSlotId);
      setSlots(remainingSlots);

      const currentMonthStillHasSlots = remainingSlots.some(slot => getMonthName(slot.date) === selectedMonth);
      if (!currentMonthStillHasSlots && remainingSlots.length > 0) {
        setSelectedMonth(getMonthName(remainingSlots[0].date));
      }

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
        <div className="available-panel glass-panel">
          <h3 style={{ margin: "0 0 14px 0" }}>Horários disponíveis</h3>

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
      </div>

      {isMounted && status.message && createPortal(
        <div
          className="popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (status.type === 'error' || (status.type === 'success' && popupStep === 2)) {
                setStatus({ type: "idle", message: "" });
              }
            }
          }}
        >
          <div className={`popup-content white-theme ${status.type}`}>
            <div className="status-icon-container">
              {status.type === 'error' && <div className="spinner-ring"></div>}
              <div className="status-icon">
                {status.type === 'error' ? '✖' : '✔'}
              </div>
            </div>

            <p>{status.type === 'success' && popupStep === 2 ? "Tudo certo! Para não esquecer, adicione à sua agenda:" : status.message}</p>

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
                  className="btn btn-secondary"
                  style={{ background: 'transparent', color: '#666', border: 'none', boxShadow: 'none' }}
                  onClick={() => setStatus({ type: "idle", message: "" })}
                >
                  Fechar Janela
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