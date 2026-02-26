import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

// ─── Icons (inline SVG components) ────────────────────────────────────────
const Icon = {
    Send: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    Upload: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    ),
    Table: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
    ),
    Brain: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5" /><path d="M14.5 2.5S17 3 17 6.5c0 2-1 3-1 3s2 1 2 4-2 4-2 4H8s-2-1-2-4 2-4 2-4-1-1-1-3c0-3.5 2.5-4 2.5-4" />
        </svg>
    ),
    Shield: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    ),
    ChevronDown: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    ),
    Chart: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    ),
    Refresh: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    ),
    Star: () => (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
};

// ─── ThoughtStep component ─────────────────────────────────────────────────
function ThoughtStep({ step }) {
    const text = step.content || "";
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
        <div className={`thought-step ${step.type}`}>
            {parts.map((part, i) => {
                if (part.startsWith("```")) {
                    const inner = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
                    return <pre key={i}><code>{inner}</code></pre>;
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

// ─── ThoughtProcess accordion ──────────────────────────────────────────────
function ThoughtProcess({ steps, isLoading }) {
    const [open, setOpen] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (open && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [steps, open]);

    if (!steps?.length && !isLoading) return null;

    return (
        <div className="thought-process">
            <button
                className={`thought-toggle ${open ? "open" : ""}`}
                onClick={() => setOpen((o) => !o)}
                id="thought-toggle-btn"
            >
                🧠 Agent Thought Process ({steps.length} steps)
                <span className="chevron"><Icon.ChevronDown /></span>
            </button>
            {open && (
                <div className="thought-steps">
                    {steps.map((s, i) => <ThoughtStep key={i} step={s} />)}
                    {isLoading && (
                        <div className="thought-step chain_start" style={{ opacity: 0.6 }}>
                            ⏳ Processing…
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
}

// ─── Chat message ──────────────────────────────────────────────────────────
function Message({ msg }) {
    const isUser = msg.role === "user";
    return (
        <div className={`message ${isUser ? "user" : ""}`}>
            <div className={`avatar ${isUser ? "user" : "bot"}`}>
                {isUser ? "👤" : "📊"}
            </div>
            <div className="bubble-wrapper" style={{ maxWidth: "calc(100% - 50px)" }}>
                <div className={`bubble ${isUser ? "user" : "bot"}`}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    {msg.isTyping && (
                        <div className="typing-dots" style={{ marginTop: "6px" }}>
                            <span /><span /><span />
                        </div>
                    )}
                </div>
                {!isUser && (
                    <ThoughtProcess steps={msg.thoughts || []} isLoading={msg.isTyping} />
                )}
                {msg.chartUrl && (
                    <div className="chart-result">
                        <img
                            src={msg.chartUrl}
                            alt="Generated chart"
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <div className="chart-result-label">
                            <Icon.Chart />
                            AI-generated visualization
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── File upload zone ──────────────────────────────────────────────────────
function UploadZone({ onUpload }) {
    const [loading, setLoading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const { data } = await axios.post("/upload", fd);
            onUpload(data);
        } catch (err) {
            alert("Upload failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/csv": [".csv"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        },
        multiple: false,
    });

    return (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`} id="upload-dropzone">
            <input {...getInputProps()} id="file-input" />
            <span className="dropzone-icon">{loading ? "⏳" : "📂"}</span>
            <p className="dropzone-text">
                {loading ? (
                    "Uploading & analyzing…"
                ) : isDragActive ? (
                    <strong>Drop it here!</strong>
                ) : (
                    <><strong>Drag & drop</strong> your CSV or Excel file<br />or click to browse</>
                )}
            </p>
        </div>
    );
}

// ─── Data preview panel ────────────────────────────────────────────────────
function DataPreview({ preview }) {
    if (!preview) return null;
    const { rows, columns, column_names, head } = preview;
    return (
        <>
            <div className="stats-row">
                <div className="stat-chip">
                    <div className="stat-chip-val">{rows.toLocaleString()}</div>
                    <div className="stat-chip-label">Rows</div>
                </div>
                <div className="stat-chip">
                    <div className="stat-chip-val">{columns}</div>
                    <div className="stat-chip-label">Columns</div>
                </div>
                <div className="stat-chip">
                    <div className="stat-chip-val">{Object.keys(head[0] || {}).length}</div>
                    <div className="stat-chip-label">Features</div>
                </div>
            </div>
            <div className="data-preview">
                <table className="data-table">
                    <thead>
                        <tr>
                            {column_names.slice(0, 6).map((col) => (
                                <th key={col}>{col}</th>
                            ))}
                            {column_names.length > 6 && <th>…</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {head.slice(0, 5).map((row, ri) => (
                            <tr key={ri}>
                                {column_names.slice(0, 6).map((col) => (
                                    <td key={col} title={String(row[col] ?? "")}>
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]).slice(0, 20) : "—"}
                                    </td>
                                ))}
                                {column_names.length > 6 && <td>…</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// ─── Sample questions ──────────────────────────────────────────────────────
const SAMPLE_QUESTIONS = [
    "How many rows are in this dataset?",
    "What is the mean value of each numeric column?",
    "Plot a bar chart of the top 5 categories",
    "Show the correlation between numeric columns",
    "What are the top 10 rows sorted by the largest value?",
    "Plot the distribution of values in the first numeric column",
];

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
            ))}
        </div>
    );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
    const [sessionId, setSessionId] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [toasts, setToasts] = useState([]);
    const chatBottomRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
        }
    }, [input]);

    const addToast = (msg, type = "info", duration = 4000) => {
        const id = Date.now();
        setToasts((t) => [...t, { id, msg, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
    };

    const handleUpload = (data) => {
        setSessionId(data.session_id);
        setFileInfo({ name: data.filename, session_id: data.session_id });
        setPreview(data.preview);
        setMessages([
            {
                id: Date.now(),
                role: "bot",
                content: `✅ **File loaded successfully!**\n\nI've analyzed **${data.filename}** — it has **${data.preview.rows.toLocaleString()} rows** and **${data.preview.columns} columns**.\n\nAsk me anything about your data!`,
                thoughts: [],
            },
        ]);
        addToast("File uploaded successfully!", "success");
    };

    const handleReset = () => {
        setSessionId(null);
        setFileInfo(null);
        setPreview(null);
        setMessages([]);
        setInput("");
    };

    const sendMessage = async (question) => {
        const q = (question || input).trim();
        if (!q || !sessionId || isAnalyzing) return;
        setInput("");
        setIsAnalyzing(true);
        const userMsg = { id: Date.now(), role: "user", content: q };
        const botMsgId = Date.now() + 1;
        const botMsg = { id: botMsgId, role: "bot", content: "", isTyping: true, thoughts: [], chartUrl: null };
        setMessages((prev) => [...prev, userMsg, botMsg]);

        try {
            const fd = new FormData();
            fd.append("session_id", sessionId);
            fd.append("question", q);
            const response = await fetch("/analyze/stream", { method: "POST", body: fd });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Analysis failed");
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const raw = line.slice(5).trim();
                    if (raw === "[DONE]") break;
                    try {
                        const event = JSON.parse(raw);
                        if (event.type === "result") {
                            setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, content: event.answer, isTyping: false, chartUrl: event.chart_url } : m));
                        } else {
                            setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, thoughts: [...(m.thoughts || []), event] } : m));
                        }
                    } catch { }
                }
            }
        } catch (err) {
            setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, content: `❌ **Error:** ${err.message}`, isTyping: false } : m));
            addToast(err.message, "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="app-shell">
            <header className="header">
                <a href="/" className="header-brand" id="brand-link">
                    <div className="header-logo">📊</div>
                    <span className="header-title">StatBot Pro</span>
                    <span className="header-badge">AI Analyst</span>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="security-badge"><Icon.Shield /> Sandboxed Environment</div>
                    {fileInfo && (
                        <button id="reset-btn" onClick={handleReset} className="question-chip" style={{ width: "auto", margin: 0 }}>
                            <Icon.Refresh /> New File
                        </button>
                    )}
                </div>
            </header>
            <div className="main-content">
                <aside className="side-panel">
                    <div className="card">
                        <p className="card-title"><Icon.Upload /> Data Source</p>
                        {fileInfo ? (
                            <div className="file-info" id="file-info">
                                <span className="file-info-icon">📄</span>
                                <div><div className="file-info-name">{fileInfo.name}</div><div className="file-info-meta">Session active</div></div>
                            </div>
                        ) : <UploadZone onUpload={handleUpload} />}
                    </div>
                    {preview && <div className="card"><p className="card-title"><Icon.Table /> Data Preview</p><DataPreview preview={preview} /></div>}
                    {sessionId && <div className="card"><p className="card-title"><Icon.Star /> Quick Questions</p>{SAMPLE_QUESTIONS.map((q, i) => <button key={i} className="question-chip" id={`sample-q-${i}`} onClick={() => sendMessage(q)} disabled={isAnalyzing}>{q}</button>)}</div>}
                    {!sessionId && <div className="card"><p className="card-title"><Icon.Brain /> How It Works</p><div style={{ fontSize: "0.82rem", color: "var(--clr-text-dim)", lineHeight: 1.7 }}><p>1️⃣ Upload CSV/Excel</p><p>2️⃣ Ask questions</p><p>3️⃣ AI writes code</p><p>4️⃣ Watch thoughts</p></div></div>}
                </aside>
                <section className="chat-panel">
                    {messages.length === 0 ? <div className="empty-state"><div className="empty-glow">📊</div><h2>StatBot Pro</h2><p>Upload a file to start.</p></div>
                        : <div className="chat-messages" id="chat-messages">{messages.map((msg) => <Message key={msg.id} msg={msg} />)}<div ref={chatBottomRef} /></div>}
                    <div className="chat-input-area">
                        <div className="input-wrapper" id="input-wrapper">
                            <textarea ref={textareaRef} className="chat-textarea" id="chat-input" placeholder={!sessionId ? "Upload a file first..." : "Ask about your data..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={!sessionId || isAnalyzing} rows={1} />
                            <button className="send-btn" id="send-btn" onClick={() => sendMessage()} disabled={!sessionId || isAnalyzing || !input.trim()}><Icon.Send /></button>
                        </div>
                        <p style={{ fontSize: "0.72rem", color: "var(--clr-text-muted)", marginTop: "0.5rem", textAlign: "center" }}>Powered by Gemini 1.5 Pro + LangChain</p>
                    </div>
                </section>
            </div>
            <Toast toasts={toasts} />
        </div>
    );
}
