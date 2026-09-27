import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleHelp,
  LoaderCircle,
  Minus,
  Plus,
  Smartphone,
} from "lucide-react";
import { Photo } from "./ui";
import { isPagesDemo } from "./environment";
import { Money } from "./Money";
import { isSteakPreparation } from "../shared/preparation";
import {
  newId,
  api,
  itemWeight,
  weightLabel,
  type ApiState,
  type CartItem,
  type Order,
  type Product,
  type Selection,
} from "./model";
export function ProductConfig({
  product,
  existing,
  onSave,
}: {
  product: Product;
  existing?: CartItem;
  onSave: (item: CartItem) => void;
}) {
  const steakPreps = product.preps.filter(isSteakPreparation);
  const canCountSteaks = steakPreps.length > 0 && product.unitWeight > 0;
  const existingIsValidQuantity =
    existing?.unit === "unit" &&
    canCountSteaks &&
    steakPreps.includes(existing.prep) &&
    Number.isInteger(existing.amount);
  // Preserve the estimated weight of older quantity orders for other preparations.
  const [unit, setUnit] = useState<"kg" | "unit">(
      existingIsValidQuantity ? "unit" : "kg",
    ),
    [amount, setAmount] = useState(
      existing?.unit === "unit" && !existingIsValidQuantity
        ? Number((existing.amount * product.unitWeight).toFixed(3))
        : existing?.amount || 0.5,
    ),
    [prep, setPrep] = useState(
      existing?.prep || product.preps[0] || "Peça inteira",
    ),
    [thickness, setThickness] = useState(existing?.thickness || "Médio"),
    [notes, setNotes] = useState(existing?.notes || "");
  const item: CartItem = {
    key: existing?.key || newId(),
    productId: product.id,
    amount,
    unit,
    prep,
    thickness: isSteakPreparation(prep) ? thickness : undefined,
    notes,
    recipeId: existing?.recipeId,
    recipeSelectionId: existing?.recipeSelectionId,
  };
  return (
    <div className="product-config">
      <div className="config-header">
        <Photo src={product.image} alt={product.name} />
        <div>
          <h2>{product.name}</h2>
          <strong>
            <Money value={product.price} /> <small>/kg</small>
          </strong>
        </div>
      </div>
      <div className="config-content">
        <div className="config-section">
          <h3>Quanto você quer?</h3>
          <div className="segmented">
            <button
              aria-pressed={unit === "kg"}
              onClick={() => {
                setUnit("kg");
                setAmount(0.5);
              }}
            >
              Por peso
            </button>
            {canCountSteaks && (
              <button
                aria-pressed={unit === "unit"}
                onClick={() => {
                  setUnit("unit");
                  setAmount(4);
                  setPrep(steakPreps.includes(prep) ? prep : steakPreps[0]);
                }}
              >
                Por quantidade
              </button>
            )}
          </div>
          <div className="quantity-row">
            <button
              aria-label="Diminuir quantidade"
              disabled={amount <= (unit === "kg" ? 0.1 : 1)}
              onClick={() =>
                setAmount(
                  Number(
                    Math.max(
                      unit === "kg" ? 0.1 : 1,
                      amount - (unit === "kg" ? 0.1 : 1),
                    ).toFixed(2),
                  ),
                )
              }
            >
              <Minus />
            </button>
            <div>
              <strong>
                {unit === "kg"
                  ? weightLabel(amount)
                  : `${amount} ${amount === 1 ? "bife" : "bifes"}`}
              </strong>
              {unit === "unit" && (
                <span>aprox. {weightLabel(amount * product.unitWeight)}</span>
              )}
            </div>
            <button
              aria-label="Aumentar quantidade"
              disabled={amount >= (unit === "kg" ? 30 : 100)}
              onClick={() =>
                setAmount(
                  Number((amount + (unit === "kg" ? 0.1 : 1)).toFixed(2)),
                )
              }
            >
              <Plus />
            </button>
          </div>
          <div className="quick-amounts">
            {(unit === "kg" ? [0.25, 0.5, 1, 2] : [2, 4, 6, 8]).map((q) => (
              <button
                key={q}
                aria-pressed={q === amount}
                onClick={() => setAmount(q)}
              >
                {unit === "kg" ? weightLabel(q) : `${q} bifes`}
              </button>
            ))}
          </div>
        </div>
        <div className="config-section">
          <h3>Como vamos preparar?</h3>
          <div className="choice-pills">
            {(unit === "unit" ? steakPreps : product.preps).map((p) => (
              <button
                key={p}
                aria-pressed={prep === p}
                onClick={() => setPrep(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {isSteakPreparation(prep) && (
            <>
              <label className="field-label">Espessura dos bifes</label>
              <div className="choice-pills">
                {["Fino", "Médio", "Grosso"].map((t) => (
                  <button
                    key={t}
                    aria-pressed={thickness === t}
                    onClick={() => setThickness(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <label className="field-label" htmlFor="item-notes">
          Observações
        </label>
        <textarea
          id="item-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: separar em duas embalagens, retirar a gordura…"
          maxLength={240}
        />
      </div>
      <div className="config-footer">
        <div>
          <span>Estimativa do item</span>
          <strong>
            <Money value={itemWeight(item, product) * product.price} />
          </strong>
        </div>
        <button
          className="primary"
          onClick={() => onSave(item)}
          disabled={!product.available}
        >
          {existing ? "Salvar item" : "Adicionar ao pedido"}
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
export interface Receipt {
  order: Order;
  trackingUrl: string;
  qrDataUrl: string;
}
export function Checkout({
  state,
  cart,
  selections,
  total,
  idempotencyKey,
  connected,
  onDone,
}: {
  state: ApiState;
  cart: CartItem[];
  selections: Selection[];
  total: number;
  idempotencyKey: string;
  connected: boolean;
  onDone: (value: Receipt) => void;
}) {
  const [phone, setPhone] = useState(""),
    [optIn, setOptIn] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      onDone(
        await api<Receipt>("/api/orders", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({
            phone: optIn ? phone : undefined,
            whatsappOptIn: optIn,
            items: cart.map(({ key, ...item }) => item),
            recipeSelections: selections,
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="checkout-form" onSubmit={submit}>
      <label className="whatsapp-choice">
        <input
          type="checkbox"
          checked={optIn}
          disabled={isPagesDemo}
          onChange={(e) => setOptIn(e.target.checked)}
        />
        <Smartphone size={22} />
        <span>
          <strong>Receber no WhatsApp quando estiver pronto</strong>
        </span>
      </label>
      {isPagesDemo && (
        <p className="privacy-note">
          Demonstração: nenhum telefone é coletado e nenhuma mensagem é enviada.
        </p>
      )}
      {optIn && (
        <>
          <label className="field-label" htmlFor="phone">
            WhatsApp com DDD
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/[^\d()+ -]/g, "").slice(0, 20))
            }
            inputMode="tel"
            autoComplete="off"
            placeholder="(11) 99999-9999"
            required
            minLength={10}
          />
          <small className="privacy-note">
            Ao confirmar, você autoriza mensagens sobre este pedido.
          </small>
          {!state.capabilities.whatsappConfigured && (
            <div className="setup-notice">
              <CircleHelp size={18} />
              <span>
                O WhatsApp desta demonstração ainda não está ativado. Nenhuma
                mensagem será enviada. Acompanhe pelo QR code ou pelo painel.
              </span>
            </div>
          )}
        </>
      )}
      <div className="checkout-total">
        <span>
          {cart.length} {cart.length === 1 ? "item" : "itens"} • Total estimado
        </span>
        <strong>
          <Money value={total} />
        </strong>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary large"
        disabled={pending || !connected || !state.store.kioskEnabled}
      >
        {pending ? (
          <>
            <LoaderCircle className="spin" size={19} />
            Confirmando…
          </>
        ) : (
          <>
            Confirmar pedido
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
