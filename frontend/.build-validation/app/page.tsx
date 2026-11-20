"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Calculation = {
  id: number;
  expression: string;
  result: string;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const keys = [
  { label: "AC", kind: "utility" },
  { label: "±", kind: "utility" },
  { label: "%", kind: "utility" },
  { label: "÷", kind: "operator" },
  { label: "7", kind: "number" },
  { label: "8", kind: "number" },
  { label: "9", kind: "number" },
  { label: "×", kind: "operator" },
  { label: "4", kind: "number" },
  { label: "5", kind: "number" },
  { label: "6", kind: "number" },
  { label: "−", kind: "operator" },
  { label: "1", kind: "number" },
  { label: "2", kind: "number" },
  { label: "3", kind: "number" },
  { label: "+", kind: "operator" },
  { label: "0", kind: "number wide" },
  { label: ".", kind: "number" },
  { label: "=", kind: "equals" },
];

function toApiExpression(value: string) {
  return value.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
}

export default function Home() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<Calculation[]>([]);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const justCalculated = useRef(false);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/history?limit=20`);
      if (!response.ok) throw new Error("Could not load calculation history.");
      setHistory(await response.json());
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const clear = useCallback(() => {
    setExpression("");
    setResult(null);
    setError("");
    justCalculated.current = false;
  }, []);

  const calculate = useCallback(async () => {
    if (!expression.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: toApiExpression(expression) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Something went wrong.");
      }
      setResult(data.result);
      setHistory((previous) => [data, ...previous].slice(0, 20));
      justCalculated.current = true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reach the calculator API.");
    } finally {
      setLoading(false);
    }
  }, [expression, loading]);

  const press = useCallback(
    (label: string) => {
      setError("");
      if (label === "AC") {
        clear();
        return;
      }
      if (label === "=") {
        void calculate();
        return;
      }
      if (label === "±") {
        setExpression((current) => {
          const match = current.match(/(-?\d*\.?\d+)$/);
          if (!match || match.index === undefined) return current ? `−(${current})` : "−";
          const number = match[0];
          return `${current.slice(0, match.index)}${number.startsWith("-") ? number.slice(1) : `−${number}`}`;
        });
        setResult(null);
        justCalculated.current = false;
        return;
      }
      if (label === "%") {
        setExpression((current) => {
          const match = current.match(/(\d*\.?\d+)$/);
          if (!match || match.index === undefined) return current;
          const percent = String(Number(match[0]) / 100);
          return `${current.slice(0, match.index)}${percent}`;
        });
        setResult(null);
        justCalculated.current = false;
        return;
      }
      if (justCalculated.current && /[0-9.]/.test(label)) {
        setExpression(label === "." ? "0." : label);
        setResult(null);
        justCalculated.current = false;
        return;
      }
      if (justCalculated.current && /[+−×÷]/.test(label) && result !== null) {
        setExpression(result + label);
        setResult(null);
        justCalculated.current = false;
        return;
      }
      setExpression((current) => {
        const next = current + label;
        if (label === "." && /(?:^|[+−×÷])[^+−×÷]*\.$/.test(next)) return current;
        if (/[+−×÷]/.test(label) && /[+−×÷]$/.test(current)) {
          return current.slice(0, -1) + label;
        }
        return next;
      });
      setResult(null);
      justCalculated.current = false;
    },
    [calculate, clear, result],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9.]$/.test(event.key)) press(event.key);
      else if (event.key === "Enter" || event.key === "=") press("=");
      else if (event.key === "Backspace") {
        setExpression((current) => current.slice(0, -1));
        setResult(null);
      } else if (event.key === "Escape") clear();
      else if (event.key === "+") press("+");
      else if (event.key === "-") press("−");
      else if (event.key === "*") press("×");
      else if (event.key === "/") {
        event.preventDefault();
        press("÷");
      } else if (event.key === "%") press("%");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clear, press]);

  const displayExpression = expression || "0";
  const displayResult = result ?? (expression ? " " : "0");

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Calcu home">
          <span className="brand-mark">c</span>
          <span>calcu<span className="brand-dot">.</span></span>
        </a>
        <span className="topbar-note"><span className="status-dot" /> your everyday calculator</span>
      </header>

      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">A LITTLE CLARITY, IN EVERY CALCULATION</p>
          <h1>Numbers, meet<br /><span>their match.</span></h1>
          <p className="intro-copy">A calm space to work it out.<br />No clutter, just the answer.</p>
          <div className="keyboard-hint"><span className="keycap">↵</span> works with your keyboard</div>
        </div>

        <div className="calculator-card">
          <div className="calculator-top">
            <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span className="calculator-label">CALCULATOR <span>•</span> BASIC</span>
            <button className="history-toggle" onClick={() => setHistoryOpen((open) => !open)} aria-label="Toggle calculation history" title="History">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></svg>
            </button>
          </div>

          <div className="display" aria-live="polite">
            <div className="expression-line">{displayExpression}</div>
            <div className={`result-line${error ? " error" : ""}`}>{error || displayResult}</div>
          </div>

          <div className="keypad">
            {keys.map(({ label, kind }) => (
              <button
                key={label}
                className={`calc-key ${kind}${label === "AC" ? " clear-key" : ""}`}
                onClick={() => press(label)}
                aria-label={label === "AC" ? "All clear" : label}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="card-footer"><span>MADE FOR THE MOMENT</span><span>{loading ? "WORKING…" : "⌘  ·  ↵"}</span></div>

          {historyOpen && (
            <aside className="history-panel" aria-label="Calculation history">
              <div className="history-heading"><span>Recent calculations</span><button onClick={() => setHistoryOpen(false)} aria-label="Close history">×</button></div>
              {history.length === 0 ? (
                <p className="empty-history">Your calculations will show up here.</p>
              ) : (
                <ul>
                  {history.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => { setExpression(item.expression.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")); setResult(item.result); justCalculated.current = true; }}>
                        <span>{item.expression.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")}</span>
                        <strong>{item.result}</strong>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      </section>

      <footer className="page-footer"><span>TAKE YOUR TIME.</span><span>ONE THING AT A TIME.</span></footer>
    </main>
  );
}
