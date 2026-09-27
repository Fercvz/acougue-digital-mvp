import { useEffect, useState } from "react";
import {
  Beef,
  CheckCheck,
  Clock3,
  ShoppingBag,
  Utensils,
  Wifi,
} from "lucide-react";
import { Brand, labels, Modal, Notification } from "./ui";
import { api, currency, weightLabel, type ApiState, type Order } from "./model";
import { isPagesDemo } from "./environment";
export function Butcher({
  state,
  refresh,
  connected,
}: {
  state: ApiState;
  refresh: () => Promise<void>;
  connected: boolean;
}) {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [reject, setReject] = useState<{ order: Order; itemId: string } | null>(
      null,
    ),
    [reason, setReason] = useState("Produto indisponível");
  const act = async (path: string, value: object) => {
    setBusy(path);
    setError("");
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(value) });
      setReject(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const completed = state.orders.filter((o) => o.status === "delivered"),
    revenue = completed.reduce((sum, o) => sum + o.estimatedTotal, 0);
  return (
    <main className="operations">
      <header className="operations-head">
        <div>
          <p className="eyebrow">AÇOUGUE • FILA DIGITAL</p>
          <h1>Pedidos</h1>
        </div>
        <button
          className={state.store.kioskEnabled ? "secondary" : "primary"}
          disabled={!!busy || !connected}
          onClick={() =>
            void act("/api/store", { kioskEnabled: !state.store.kioskEnabled })
          }
        >
          {state.store.kioskEnabled
            ? "Pausar novos pedidos"
            : "Reativar pedidos"}
        </button>
      </header>
      <div className="operation-stats">
        {["waiting", "preparing", "ready"].map((s) => (
          <div key={s}>
            <span>{labels[s]}</span>
            <strong>{state.orders.filter((o) => o.status === s).length}</strong>
          </div>
        ))}
        <div>
          <span>Venda estimada • retirados</span>
          <strong>{currency(revenue)}</strong>
          <small>Itens recusados desconsiderados</small>
        </div>
      </div>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <div className="order-columns">
        {["waiting", "preparing", "ready"].map((status) => (
          <section className={`order-column ${status}`} key={status}>
            <h2>
              <span className="status-dot" />
              {labels[status]}
              <b>{state.orders.filter((o) => o.status === status).length}</b>
            </h2>
            {state.orders
              .filter((o) => o.status === status)
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-head">
                    <strong>{order.ticket}</strong>
                    <span>
                      <Clock3 size={13} />
                      {Math.max(
                        0,
                        Math.floor((Date.now() - order.createdAt) / 60000),
                      )}{" "}
                      min
                    </span>
                  </div>
                  {order.customer && (
                    <p className="order-customer">{order.customer}</p>
                  )}
                  <ul>
                    {order.items.map((item) => (
                      <li
                        className={item.status === "rejected" ? "rejected" : ""}
                        key={item.id}
                      >
                        <div>
                          <strong>
                            {item.unit === "unit"
                              ? `${item.amount} un.`
                              : weightLabel(item.amount)}{" "}
                            · {item.name}
                          </strong>
                          <span>
                            {item.prep}
                            {item.thickness ? ` · ${item.thickness}` : ""}
                          </span>
                          {item.notes && (
                            <p className="order-note">{item.notes}</p>
                          )}
                          {item.status === "rejected" && (
                            <span className="rejection-label">
                              Recusado: {item.rejectionReason}
                            </span>
                          )}
                        </div>
                        {item.status !== "rejected" && status !== "ready" && (
                          <button
                            className="reject-button"
                            disabled={!!busy || !connected}
                            onClick={() => {
                              setReject({ order, itemId: item.id });
                              setReason("Produto indisponível");
                            }}
                          >
                            Recusar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="order-estimate">
                    <span>Estimativa atual</span>
                    <strong>{currency(order.estimatedTotal)}</strong>
                  </div>
                  {status === "ready" && <Notification order={order} />}
                  <button
                    className={`primary ${status === "preparing" ? "green" : ""}`}
                    disabled={!!busy || !connected}
                    onClick={() =>
                      void act(`/api/orders/${order.id}`, {
                        status:
                          status === "waiting"
                            ? "preparing"
                            : status === "preparing"
                              ? "ready"
                              : "delivered",
                      })
                    }
                  >
                    {status === "waiting" ? (
                      <>
                        <Utensils size={17} />
                        Iniciar preparo
                      </>
                    ) : status === "preparing" ? (
                      <>
                        <CheckCheck size={18} />
                        Pedido pronto
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={17} />
                        Confirmar retirada
                      </>
                    )}
                  </button>
                </article>
              ))}
            {!state.orders.some((o) => o.status === status) && (
              <div className="empty-column">
                <CheckCheck size={26} />
                <p>Nenhum pedido por aqui.</p>
              </div>
            )}
          </section>
        ))}
      </div>
      <details className="history">
        <summary>
          Retirados e cancelados (
          {
            state.orders.filter((o) =>
              ["delivered", "cancelled"].includes(o.status),
            ).length
          }
          )
        </summary>
        {state.orders
          .filter((o) => ["delivered", "cancelled"].includes(o.status))
          .map((o) => (
            <div key={o.id}>
              <strong>{o.ticket}</strong>
              <span>{labels[o.status]}</span>
              <b>{currency(o.estimatedTotal)}</b>
            </div>
          ))}
      </details>
      {reject && (
        <Modal title="Recusar item" onClose={() => setReject(null)}>
          <form
            className="reject-form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                `/api/orders/${reject.order.id}/items/${reject.itemId}`,
                { status: "rejected", rejectionReason: reason },
              );
            }}
          >
            <p className="eyebrow">PEDIDO {reject.order.ticket}</p>
            <h2>Recusar este item?</h2>
            <p>
              {reject.order.items.find((i) => i.id === reject.itemId)?.name}
            </p>
            <label className="field-label" htmlFor="reason">
              Motivo mostrado ao cliente
            </label>
            <input
              id="reason"
              value={reason}
              required
              maxLength={180}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="muted">
              Os outros itens continuam no pedido. Se todos forem recusados, o
              pedido será cancelado.
            </p>
            <button className="primary" disabled={!!busy}>
              Confirmar recusa
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
export function Board({ state }: { state: ApiState }) {
  return (
    <main className="tv-board">
      <header>
        <Brand state={state} />
        <div>
          <Clock3 size={22} />
          {new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </header>
      <div className="tv-columns">
        <section className="tv-preparing">
          <h2>
            <Utensils />
            Em preparo
          </h2>
          <div>
            {state.orders
              .filter((o) => ["waiting", "preparing"].includes(o.status))
              .map((o) => (
                <div className="tv-ticket" key={o.id}>
                  <strong>{o.ticket}</strong>
                  {o.items.some((i) => i.status === "rejected") && (
                    <span>Item indisponível • consulte seu pedido</span>
                  )}
                </div>
              ))}
            {!state.orders.some((o) =>
              ["waiting", "preparing"].includes(o.status),
            ) && <p>Aguardando novos pedidos</p>}
          </div>
        </section>
        <section className="tv-ready">
          <h2>
            <CheckCheck />
            Pronto para retirar
          </h2>
          <div>
            {state.orders
              .filter((o) => o.status === "ready")
              .map((o) => (
                <div className="tv-ticket" key={o.id}>
                  <strong>{o.ticket}</strong>
                  {o.items.some((i) => i.status === "rejected") && (
                    <span>Com item recusado • confira na retirada</span>
                  )}
                </div>
              ))}
            {!state.orders.some((o) => o.status === "ready") && (
              <p>Seu número aparecerá aqui</p>
            )}
          </div>
        </section>
      </div>
      {state.orders.some((o) => o.status === "cancelled") && (
        <div className="tv-cancelled">
          Pedidos cancelados por indisponibilidade:{" "}
          {state.orders
            .filter((o) => o.status === "cancelled")
            .slice(0, 8)
            .map((o) => o.ticket)
            .join(" · ")}
          . Consulte a equipe.
        </div>
      )}
      <footer>
        <ShoppingBag size={24} />
        <span>
          Retire pelo número no balcão.{" "}
          <strong>Pague no caixa do mercado.</strong>
        </span>
      </footer>
    </main>
  );
}
interface Tracked {
  order: Order;
  store?: { name: string };
  shoppingList: {
    name: string;
    amount: number;
    unit: string;
    section: string;
  }[];
  recipes: {
    name: string;
    variantName: string;
    servings: number;
    instructions: string[];
  }[];
}
export function Tracking({ token }: { token: string }) {
  const [data, setData] = useState<Tracked | null>(null),
    [offline, setOffline] = useState(false),
    [tab, setTab] = useState<"pedido" | "lista" | "receitas">("pedido");
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await api<Tracked>(`/api/track/${encodeURIComponent(token)}`);
        if (alive) {
          setData(d);
          setOffline(false);
        }
      } catch {
        if (alive) setOffline(true);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [token]);
  if (!data)
    return (
      <div className="loading-screen">
        <ShoppingBag size={40} />
        <h2>
          {offline
            ? "Não foi possível abrir o pedido."
            : "Carregando seu pedido…"}
        </h2>
        <p>
          {offline
            ? isPagesDemo
              ? "O pedido de demonstração fica apenas no navegador em que foi criado. Volte a esse navegador para acompanhar."
              : "Confira a conexão e o endereço do QR code."
            : "Só um instante."}
        </p>
      </div>
    );
  const order = data.order,
    list = data.shoppingList || [],
    recipes = data.recipes || [];
  return (
    <main className="tracking">
      {isPagesDemo && (
        <div className="pages-demo-notice">
          Demonstração: acompanhamento apenas neste navegador.
        </div>
      )}
      <header>
        <span className="brand-mark">
          <Beef />
        </span>
        <strong>{data.store?.name || "Açougue Digital"}</strong>
        <span>
          <Wifi size={14} />
          {offline ? "Sem conexão" : "Atualizando"}
        </span>
      </header>
      {offline && (
        <div className="offline-banner" role="alert">
          Sem conexão. As informações abaixo podem estar desatualizadas.
        </div>
      )}
      <div className="tracking-status">
        <span>SEU PEDIDO</span>
        <h1>{order.ticket}</h1>
        <span className={`status-pill ${order.status}`}>
          {labels[order.status]}
        </span>
        <p>
          {order.status === "ready"
            ? "Pode vir buscar! Informe seu número no balcão."
            : order.status === "cancelled"
              ? "Os itens ficaram indisponíveis. Procure a equipe para outras opções."
              : order.status === "delivered"
                ? "Pedido retirado. Bom apetite!"
                : "Continue suas compras. Esta página acompanha o preparo."}
        </p>
      </div>
      <nav className="tracking-tabs">
        {(["pedido", "lista", "receitas"] as const).map((t) => (
          <button aria-pressed={tab === t} key={t} onClick={() => setTab(t)}>
            {t === "pedido"
              ? "Meu pedido"
              : t === "lista"
                ? "Lista de compras"
                : "Receitas"}
          </button>
        ))}
      </nav>
      {tab === "pedido" ? (
        <section className="tracking-items">
          {order.items.map((i) => (
            <div
              className={i.status === "rejected" ? "rejected" : ""}
              key={i.id}
            >
              <strong>{i.name}</strong>
              <span>
                {i.unit === "unit" ? `${i.amount} un.` : weightLabel(i.amount)}{" "}
                · {i.prep}
              </span>
              {i.status === "rejected" ? (
                <b className="error-text">Recusado: {i.rejectionReason}</b>
              ) : (
                <b>{currency(i.estimatedWeight * i.unitPrice)}</b>
              )}
            </div>
          ))}
          <div className="tracking-total">
            <span>Total estimado atualizado</span>
            <strong>{currency(order.estimatedTotal)}</strong>
            <small>
              Itens recusados desconsiderados. Valor final na pesagem.
            </small>
          </div>
        </section>
      ) : tab === "lista" ? (
        <section className="shopping-list">
          <h2>Para completar sua compra</h2>
          {list.length ? (
            list.map((i, index) => (
              <label key={index}>
                <input type="checkbox" />
                <span>
                  {i.name}
                  <small>
                    {Number(i.amount.toFixed(2)).toLocaleString("pt-BR")}{" "}
                    {i.unit}
                    {i.section === "acougue" ? " • no pedido do açougue" : ""}
                  </small>
                </span>
              </label>
            ))
          ) : (
            <p>Seu pedido não tem receitas vinculadas.</p>
          )}
        </section>
      ) : (
        <section className="tracking-recipes">
          {recipes.length ? (
            recipes.map((r, index) => (
              <article key={index}>
                <h2>{r.name}</h2>
                <p>
                  {r.variantName} · {r.servings} porções
                </p>
                <ol>
                  {r.instructions.map((i, j) => (
                    <li key={j}>{i}</li>
                  ))}
                </ol>
              </article>
            ))
          ) : (
            <p>Nenhuma receita selecionada neste pedido.</p>
          )}
        </section>
      )}
      <footer>Retirada pelo número • Pagamento no caixa</footer>
    </main>
  );
}
