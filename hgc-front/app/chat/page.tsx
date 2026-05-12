"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Paperclip, Database, MessageCircle,
  Loader2, Image as ImageIcon, FileText, X
} from "lucide-react";

const API = "http://localhost:8001";

type Mode = "chat" | "db";
type AttachType = "image" | "document" | null;

interface Attachment {
  file: File;
  type: AttachType;
  preview?: string; // data URL for images
}

interface Message {
  role: "user" | "bot";
  content: string;
  mode?: Mode;
  sql?: string;
  rows?: number;
  attachmentName?: string;
  attachmentType?: AttachType;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content:
        "¡Hola! Soy tu asistente HGC con IA local (Ollama · phi3:mini).\n\n" +
        "💬 Modo Chat — preguntas generales sobre HGC y analytics.\n" +
        "🗄️ Modo Base de Datos — consultas directas a Snowflake.\n" +
        "📎 Adjuntar — sube imágenes (PNG/JPG) o documentos (PDF, Word, TXT) para analizarlos.\n\n" +
        "También puedes pegar imágenes directamente con Ctrl+V.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Pegar imagen desde portapapeles (Ctrl+V) ──────────────────────────────
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () =>
            setAttachment({ file, type: "image", preview: reader.result as string });
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // ── Seleccionar archivo desde disco ──────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isDoc = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type)
      || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt");

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () =>
        setAttachment({ file, type: "image", preview: reader.result as string });
      reader.readAsDataURL(file);
    } else if (isDoc) {
      setAttachment({ file, type: "document" });
    } else {
      alert("Formato no soportado. Usa PNG, JPG, PDF, DOCX o TXT.");
    }
    e.target.value = "";
  };

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasFile = attachment !== null;
    if ((!hasText && !hasFile) || isLoading) return;

    const userContent = input.trim() || (attachment?.type === "image" ? "Analiza esta imagen" : "Resume este documento");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userContent,
        mode,
        attachmentName: attachment?.file.name,
        attachmentType: attachment?.type,
      },
    ]);
    setInput("");
    setIsLoading(true);

    const currentAttachment = attachment;
    setAttachment(null);

    try {
      let botMsg: Message = { role: "bot", mode };

      if (currentAttachment) {
        const formData = new FormData();
        formData.append("file", currentAttachment.file);
        if (hasText) formData.append("question", input.trim());

        const endpoint = currentAttachment.type === "image" ? "/chat/vision" : "/chat/document";
        const res = await fetch(`${API}${endpoint}`, { method: "POST", body: formData });
        const data = await res.json();

        if (data.error) {
          botMsg.content = `❌ ${data.error}${data.tip ? "\n\n💡 " + data.tip : ""}`;
        } else {
          botMsg.content = data.analysis;
          if (data.chars_extracted) {
            botMsg.content += `\n\n_(${data.chars_extracted.toLocaleString()} caracteres extraídos del documento)_`;
          }
        }
      } else if (mode === "db") {
        const res = await fetch(`${API}/smart/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userContent }),
        });
        const data = await res.json();
        if (data.error) {
          botMsg.content = `❌ Error al consultar Snowflake:\n${data.error}\n\n💡 ${data.tip || ""}`;
        } else {
          botMsg.content = data.summary;
          botMsg.sql = data.sql;
          botMsg.rows = data.rows;
        }
      } else {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userContent }),
        });
        const data = await res.json();
        botMsg.content = data.response || `Error: ${data.error}`;
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "❌ Error de conexión. Verifica que la chat-api (puerto 8001) esté corriendo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Asistente HGC</h1>
              <p className="text-xs text-slate-400">Ollama · phi3:mini + moondream · IA local</p>
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${mode === "chat" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
            <button
              onClick={() => setMode("db")}
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${mode === "db" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <Database className="h-3.5 w-3.5" /> Base de Datos
            </button>
          </div>
        </div>

        {/* Mode hint */}
        <div className={`px-4 py-1.5 text-xs text-center font-medium ${mode === "db"
            ? "bg-cyan-900/40 text-cyan-300 border-b border-cyan-800/50"
            : "bg-blue-900/20 text-blue-300 border-b border-blue-900/30"
          }`}>
          {mode === "db"
            ? "🗄️ Modo Base de Datos — Pregunta en español sobre tus datos de Snowflake"
            : "💬 Modo Chat — Preguntas generales · Sube imágenes o documentos con 📎 o Ctrl+V"}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[85%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user"
                    ? msg.mode === "db" ? "bg-cyan-600" : "bg-blue-600"
                    : "bg-slate-700"
                  }`}>
                  {msg.role === "user"
                    ? msg.mode === "db" ? <Database className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />
                    : <Bot className="h-4 w-4 text-slate-300" />}
                </div>
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${msg.role === "user"
                    ? msg.mode === "db" ? "bg-cyan-700 text-white" : "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100 border border-slate-700"
                  }`}>
                  {/* Attachment badge */}
                  {msg.attachmentName && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs opacity-80">
                      {msg.attachmentType === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      <span>{msg.attachmentName}</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {/* SQL badge */}
                  {msg.sql && (
                    <details className="mt-3">
                      <summary className="text-xs text-cyan-300 cursor-pointer hover:text-cyan-200 font-mono">
                        Ver SQL generado ({msg.rows} filas)
                      </summary>
                      <pre className="mt-2 text-xs bg-slate-900 rounded-lg p-3 text-emerald-300 overflow-x-auto border border-slate-700">
                        {msg.sql}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
                  <Bot className="h-4 w-4 text-slate-300" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-slate-400">
                    {isLoading && attachment?.type === "image" ? "Analizando imagen..." :
                      isLoading && attachment?.type === "document" ? "Leyendo documento..." :
                        mode === "db" ? "Consultando Snowflake..." : "Procesando..."}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Attachment preview */}
        {attachment && (
          <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
            {attachment.type === "image" && attachment.preview
              ? <img src={attachment.preview} alt="preview" className="h-12 w-12 rounded-lg object-cover border border-slate-600" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                <FileText className="h-5 w-5 text-slate-300" />
              </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{attachment.file.name}</p>
              <p className="text-[10px] text-slate-500">
                {attachment.type === "image" ? "Imagen · moondream la analizará" : "Documento · phi3:mini lo leerá"}
              </p>
            </div>
            <button onClick={() => setAttachment(null)} className="text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-700 bg-slate-800 px-4 py-3">
          <form onSubmit={sendMessage} className="flex gap-2 items-center">
            {/* Adjuntar archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Subir imagen o documento"
              className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                attachment
                  ? "Pregunta algo sobre el archivo (opcional)..."
                  : mode === "db"
                    ? "¿Cuáles son las sucursales con mayor venta?"
                    : "Escribe o pega una imagen con Ctrl+V..."
              }
              className="flex-1 rounded-xl border border-slate-600 bg-slate-700 px-4 py-2.5
                         text-sm text-slate-100 placeholder:text-slate-500
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachment)}
              className={`flex items-center justify-center rounded-xl p-2.5 text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed ${mode === "db" ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-slate-600">
            PDF · Word · TXT · Imágenes (pegar Ctrl+V o subir) · Snowflake BD
          </p>
        </div>
      </div>
    </div>
  );
}
