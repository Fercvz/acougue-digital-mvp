import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Beef,
  Check,
  CheckCheck,
  ChefHat,
  Clock3,
  Flame,
  Heart,
  Plus,
  ShoppingBag,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { Brand, Modal, Notification, RecipePhoto } from "./ui";
import { ChickenIcon, PigIcon, SausageIcon } from "./CategoryIcons";
import { DailyOffers, ProductCard } from "./ProductOffers";
import { Checkout, ProductConfig, type Receipt } from "./OrderForms";
import RecipeDetail from "./RecipeDetail";
import { Money } from "./Money";
import {
  newId,
  itemWeight,
  weightLabel,
  type ApiState,
  type CartItem,
  type Product,
  type Recipe,
  type Selection,
} from "./model";
const categories = [
  { id: "all", name: "Todos", icon: ShoppingBasket },
  { id: "bovina", name: "Bovina", icon: Beef },
  { id: "frango", name: "Frango", icon: ChickenIcon },
  { id: "suina", name: "Suína", icon: PigIcon },
  { id: "embutidos", name: "Embutidos", icon: SausageIcon },
  { id: "miudos", name: "Miúdos", icon: Heart },
];
export default function Kiosk({
  state,
  refresh,
  connected,
}: {
  state: ApiState;
  refresh: () => Promise<void>;
  connected: boolean;
}) {
  const [page, setPage] = useState<"home" | "recipes" | "barbecue">("home"),
    [category, setCategory] = useState("all"),
    [cart, setCart] = useState<CartItem[]>([]),
    [selections, setSelections] = useState<Selection[]>([]),
    [config, setConfig] = useState<{
      product: Product;
      item?: CartItem;
    } | null>(null),
    [recipe, setRecipe] = useState<Recipe | null>(null),
    [checkout, setCheckout] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [toast, setToast] = useState(""),
    [cartOpen, setCartOpen] = useState(false),
    [inactive, setInactive] = useState(false);
  const lastActive = useRef(Date.now()),
    idempotency = useRef(newId());
  const closeConfig = useCallback(() => setConfig(null), []),
    closeCheckout = useCallback(() => setCheckout(false), []);
  const reset = useCallback(() => {
    setCart([]);
    setSelections([]);
    setConfig(null);
    setCheckout(false);
    setReceipt(null);
    setRecipe(null);
    setPage("home");
    setCartOpen(false);
    setInactive(false);
    lastActive.current = Date.now();
    idempotency.current = newId();
  }, []);
  useEffect(() => {
    const active = () => {
      lastActive.current = Date.now();
    };
    window.addEventListener("pointerdown", active);
    window.addEventListener("keydown", active);
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > 140000) reset();
      else if (
        Date.now() - lastActive.current > 120000 &&
        (cart.length > 0 || checkout || receipt)
      )
        setInactive(true);
    }, 1000);
    return () => {
      window.removeEventListener("pointerdown", active);
      window.removeEventListener("keydown", active);
      clearInterval(timer);
    };
  }, [cart.length, checkout, receipt, reset]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const total = cart.reduce((sum, item) => {
      const p = state.products.find((p) => p.id === item.productId);
      return sum + (p ? itemWeight(item, p) * p.price : 0);
    }, 0),
    valid = cart.every(
      (item) => state.products.find((p) => p.id === item.productId)?.available,
    );
  const changeCart = (next: CartItem[]) => {
      setCart(next);
      idempotency.current = newId();
    },
    saveItem = (item: CartItem) => {
      changeCart(
        config?.item
          ? cart.map((i) => (i.key === item.key ? item : i))
          : [...cart, item],
      );
      setConfig(null);
      setToast("Pronto! Item adicionado ao seu pedido.");
    },
    navigate = (next: typeof page) => {
      setPage(next);
      setRecipe(null);
      document.querySelector(".kiosk-main")?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    addRecipe = (items: CartItem[], selection: Selection) => {
      const selectionId = newId();
      changeCart([
        ...cart,
        ...items.map((i) => ({ ...i, recipeSelectionId: selectionId })),
      ]);
      setSelections([...selections, { ...selection, selectionId }]);
      setRecipe(null);
      setToast(
        "Ingredientes do açougue adicionados. Você pode continuar escolhendo.",
      );
    };
  if (receipt)
    return (
      <>
        <header className="shop-header">
          <Brand state={state} />
          <span className="header-note">
            <CheckCheck size={20} />
            Pedido confirmado
          </span>
        </header>
        <section className="receipt">
          <span className="receipt-check">
            <Check size={40} />
          </span>
          <p>Acompanhe seu pedido pelo número no painel ou no celular.</p>
          <div className="receipt-card">
            <div>
              <span>SEU PEDIDO</span>
              <strong className="receipt-number">{receipt.order.ticket}</strong>
              <p>
                Total estimado{" "}
                <b>
                  <Money value={receipt.order.estimatedTotal} />
                </b>
              </p>
              <small>O valor final será definido na pesagem.</small>
            </div>
            <div className="receipt-qr">
              <img
                src={receipt.qrDataUrl}
                alt={`QR code para acompanhar pedido ${receipt.order.ticket}`}
              />
              <strong>Escaneie e leve com você</strong>
              <span>Pedido, receitas e lista de compras</span>
              <a href={receipt.trackingUrl} target="_blank" rel="noreferrer">
                Abrir acompanhamento <ArrowRight size={15} />
              </a>
            </div>
          </div>
          <Notification order={receipt.order} />
          <button className="primary large" onClick={reset}>
            Concluir e liberar tablet <ArrowRight size={18} />
          </button>
          <p className="muted small">
            Na retirada, informe o número. O pagamento é no caixa do mercado.
          </p>
        </section>
      </>
    );
  return (
    <>
      <header className="shop-header">
        <Brand state={state} />
      </header>
      <div className="kiosk-layout">
        <aside className="side-menu">
          <div className="side-intro">
            O QUE VAI SER
            <br />
            <strong>HOJE?</strong>
          </div>
          <button
            className={page === "home" ? "active" : ""}
            onClick={() => navigate("home")}
          >
            <ShoppingBasket />
            <span>Escolher carnes</span>
          </button>
          <button
            className={page === "recipes" ? "active" : ""}
            onClick={() => navigate("recipes")}
          >
            <ChefHat />
            <span>O que cozinhar?</span>
          </button>
          <button
            className={page === "barbecue" ? "active" : ""}
            onClick={() => navigate("barbecue")}
          >
            <Flame />
            <span>Churrasco</span>
          </button>
        </aside>
        <main className="kiosk-main">
          {!state.store.kioskEnabled && (
            <div className="pause-banner">
              <Clock3 />
              <div>
                <strong>Novos pedidos estão pausados</strong>
                <p>
                  Você pode consultar os produtos. Para pedir, procure nossa
                  equipe.
                </p>
              </div>
            </div>
          )}
          {recipe ? (
            <RecipeDetail
              recipe={recipe}
              products={state.products}
              onBack={() => setRecipe(null)}
              onAdd={addRecipe}
              disabled={!connected || !state.store.kioskEnabled}
            />
          ) : (
            <>
              {page === "home" ? (
                <>
                  <DailyOffers
                    products={state.products}
                    disabled={!connected || !state.store.kioskEnabled}
                    onSelect={(product) => setConfig({ product })}
                  />
                  <div className="section-title">
                    <div>
                      <h2>Escolha suas carnes</h2>
                    </div>
                  </div>
                  <div
                    className="category-tabs"
                    aria-label="Categorias de carnes"
                  >
                    {categories.map((c) => (
                      <button
                        aria-pressed={category === c.id}
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                      >
                        <c.icon size={18} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <div className="product-grid">
                    {[...state.products]
                      .sort(
                        (a, b) =>
                          Number(Boolean(b.image)) - Number(Boolean(a.image)),
                      )
                      .filter(
                        (p) => category === "all" || p.category === category,
                      )
                      .map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          disabled={!connected || !state.store.kioskEnabled}
                          onSelect={() => setConfig({ product: p })}
                        />
                      ))}
                  </div>
                  <p className="photo-caption">
                    Fotos de referência. O corte e a apresentação podem variar.
                    Valores do pedido são estimativas.{" "}
                    <a
                      href="/fotos/creditos.html"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Créditos das fotos
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <h1 className="catalog-title">
                    {page === "barbecue"
                      ? "Escolha seu churrasco"
                      : "Escolha um prato"}
                  </h1>
                  <div
                    className={`recipe-grid ${page === "barbecue" ? "barbecue-grid" : ""}`}
                  >
                    {state.recipes
                      .filter(
                        (r) =>
                          r.active &&
                          (page === "barbecue"
                            ? r.category === "churrasco"
                            : r.category !== "churrasco"),
                      )
                      .sort((a, b) => {
                        if (page !== "barbecue") return 0;
                        const order = [
                          "churrasco-dia-a-dia",
                          "churrasco",
                          "churrasco-impressionar",
                        ];
                        const rank = (id: string) =>
                          order.includes(id) ? order.indexOf(id) : order.length;
                        return rank(a.id) - rank(b.id);
                      })
                      .map((r) => (
                        <button
                          className="recipe-card"
                          key={r.id}
                          aria-label={r.name}
                          onClick={() => {
                            setRecipe(r);
                            document
                              .querySelector(".kiosk-main")
                              ?.scrollTo({ top: 0 });
                            window.scrollTo({ top: 0 });
                          }}
                        >
                          <RecipePhoto
                            src={r.image}
                            secondarySrc={r.secondaryImage}
                            alt={r.name}
                          />
                          <div>
                            <h2>{r.name}</h2>
                          </div>
                        </button>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <aside className={`cart-panel ${cartOpen ? "cart-visible" : ""}`}>
          <div className="cart-head">
            <div>
              <ShoppingBag size={21} />
              <h2>Seu pedido</h2>
              <span>{cart.length}</span>
            </div>
            <button
              className="icon-button mobile-only"
              aria-label="Fechar pedido"
              onClick={() => setCartOpen(false)}
            >
              <X />
            </button>
          </div>
          {cart.length ? (
            <div className="cart-lines">
              {cart.map((item) => {
                const p = state.products.find((p) => p.id === item.productId);
                if (!p) return null;
                return (
                  <div className="cart-line" key={item.key}>
                    <div className="cart-line-title">
                      <strong>{p.name}</strong>
                      <button
                        aria-label={`Remover ${p.name}`}
                        onClick={() =>
                          changeCart(cart.filter((i) => i.key !== item.key))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span>
                      {item.unit === "unit"
                        ? `${item.amount} ${item.amount === 1 ? "bife" : "bifes"} · ≈ ${weightLabel(itemWeight(item, p))}`
                        : weightLabel(item.amount)}{" "}
                      · {item.prep}
                      {item.thickness ? ` · ${item.thickness}` : ""}
                    </span>
                    {item.notes && <small>{item.notes}</small>}
                    {!p.available && (
                      <small className="error-text">
                        Indisponível. Remova para continuar.
                      </small>
                    )}
                    <div className="cart-line-bottom">
                      <button onClick={() => setConfig({ product: p, item })}>
                        Editar
                      </button>
                      <b>
                        <Money value={itemWeight(item, p) * p.price} />
                      </b>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-cart">
              <div>
                <ShoppingBag size={36} />
                <span>
                  <Plus size={15} />
                </span>
              </div>
              <h3>Vamos começar?</h3>
              <p>
                Escolha suas carnes ou uma
                <br />
                receita para montar o pedido.
              </p>
            </div>
          )}
          <div className="cart-total">
            <div>
              <span>Total estimado</span>
              <strong>
                <Money value={total} />
              </strong>
            </div>
            <p>Os valores apresentados são estimativas.</p>
            <button
              className="primary"
              disabled={
                !cart.length ||
                !valid ||
                !connected ||
                !state.store.kioskEnabled
              }
              onClick={() => setCheckout(true)}
            >
              Continuar <ArrowRight size={19} />
            </button>
          </div>
        </aside>
      </div>
      <button
        className="mobile-cart primary"
        onClick={() => setCartOpen(!cartOpen)}
      >
        <ShoppingBag size={20} />
        <span>Ver pedido ({cart.length})</span>
        <b>
          <Money value={total} />
        </b>
      </button>
      {config && (
        <Modal title={`Preparar ${config.product.name}`} onClose={closeConfig}>
          <ProductConfig
            product={config.product}
            existing={config.item}
            onSave={saveItem}
          />
        </Modal>
      )}
      {checkout && (
        <Modal title="Finalizar pedido" onClose={closeCheckout}>
          <Checkout
            state={state}
            cart={cart}
            selections={selections.filter((s) =>
              cart.some(
                (i) =>
                  i.recipeSelectionId === s.selectionId &&
                  i.productId === s.productId,
              ),
            )}
            total={total}
            idempotencyKey={idempotency.current}
            connected={connected}
            onDone={(value) => {
              setReceipt(value);
              setCheckout(false);
              void refresh();
              window.scrollTo(0, 0);
            }}
          />
        </Modal>
      )}
      {inactive && (
        <Modal
          title="Continuar pedido"
          onClose={() => {
            lastActive.current = Date.now();
            setInactive(false);
          }}
        >
          <div className="inactivity">
            <Clock3 size={36} />
            <h2>Ainda está por aqui?</h2>
            <p>A sessão será encerrada para liberar o tablet.</p>
            <button
              className="primary"
              onClick={() => {
                lastActive.current = Date.now();
                setInactive(false);
              }}
            >
              Sim, continuar meu pedido
            </button>
            <button className="text-button" onClick={reset}>
              Encerrar
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
