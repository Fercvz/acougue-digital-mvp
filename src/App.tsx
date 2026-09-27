import { useCallback, useEffect, useState } from "react";
import {
  Beef,
  LoaderCircle,
  Monitor,
  Settings2,
  Smartphone,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import Admin from "./Admin";
import Kiosk from "./Kiosk";
import { Butcher, Board, Tracking } from "./Operations";
import { api, type ApiState } from "./model";
import { isPagesDemo } from "./environment";
type Area = "tablet" | "butcher" | "board" | "manager";
export default function App() {
  const [state, setState] = useState<ApiState | null>(null),
    [connected, setConnected] = useState(true),
    [area, setArea] = useState<Area>(
      (location.hash.slice(2) || "tablet") as Area,
    );
  const refresh = useCallback(async () => {
    try {
      setState(await api<ApiState>("/api/state"));
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);
  useEffect(() => {
    if (location.pathname.startsWith("/acompanhar/")) return;
    void refresh();
    const t = setInterval(() => void refresh(), 3000),
      f = () => setArea((location.hash.slice(2) || "tablet") as Area);
    window.addEventListener("hashchange", f);
    return () => {
      clearInterval(t);
      window.removeEventListener("hashchange", f);
    };
  }, [refresh]);
  const token =
    location.pathname.match(/^\/acompanhar\/([^/]+)/)?.[1] ||
    area.match(/^acompanhar\/([^/]+)/)?.[1];
  if (token) return <Tracking token={token} />;
  if (!state)
    return (
      <div className="loading-screen">
        <Beef size={48} />
        <h1>Açougue Digital</h1>
        {connected ? (
          <>
            <LoaderCircle className="spin" />
            <p>Preparando o balcão…</p>
          </>
        ) : (
          <>
            <WifiOff />
            <p>
              {isPagesDemo
                ? "Não foi possível abrir os dados locais. Permita o armazenamento deste site no navegador."
                : "Estamos sem conexão com o açougue."}
            </p>
            <button className="primary" onClick={() => void refresh()}>
              Tentar novamente
            </button>
          </>
        )}
      </div>
    );
  return (
    <div
      className={`app-shell ${!["manager", "butcher", "board"].includes(area) ? "kiosk-app" : ""}`}
    >
      <div className="presentation-bar">
        <div className="presentation-label">
          <span className="live-dot" />{" "}
          {isPagesDemo ? "DEMONSTRAÇÃO" : "APRESENTAÇÃO"}{" "}
          <span>
            {isPagesDemo ? "• Dados neste navegador" : "• Açougue Digital"}
          </span>
        </div>
        <nav aria-label="Telas da apresentação">
          {(
            [
              { id: "tablet", label: "Cliente", icon: Smartphone },
              { id: "butcher", label: "Açougueiro", icon: Utensils },
              { id: "board", label: "Painel TV", icon: Monitor },
              { id: "manager", label: "Gestão", icon: Settings2 },
            ] as const
          ).map((v) => (
            <a
              className={area === v.id ? "selected" : ""}
              href={`#/${v.id}`}
              key={v.id}
            >
              <v.icon size={15} />
              {v.label}
            </a>
          ))}
        </nav>
        <span className={`connection ${connected ? "" : "lost"}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>
            {connected
              ? isPagesDemo
                ? "Demonstração local"
                : "Conectado"
              : "Sem conexão"}
          </span>
        </span>
      </div>
      {isPagesDemo && (
        <div className="pages-demo-notice">
          Demonstração: pedidos e alterações ficam apenas neste navegador. Sem
          envio de WhatsApp.
        </div>
      )}
      {!connected && (
        <div className="offline-banner" role="alert">
          <WifiOff size={20} />
          <div>
            <strong>Sem conexão com o açougue.</strong> Os pedidos estão
            pausados até a conexão voltar. Procure nossa equipe.
          </div>
        </div>
      )}
      {area === "manager" ? (
        <Admin state={state} onRefresh={() => void refresh()} />
      ) : area === "butcher" ? (
        <Butcher state={state} refresh={refresh} connected={connected} />
      ) : area === "board" ? (
        <Board state={state} />
      ) : (
        <Kiosk state={state} refresh={refresh} connected={connected} />
      )}
    </div>
  );
}
