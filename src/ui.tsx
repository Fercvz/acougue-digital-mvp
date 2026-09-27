import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Beef, Smartphone, X } from "lucide-react";
import type { ApiState, Order } from "./model";
export function Photo({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  ) : (
    <div
      className={`photo-empty ${className}`}
      role="img"
      aria-label={`Foto de ${alt} a cadastrar`}
    >
      <Beef size={36} />
      <span>Foto a cadastrar</span>
    </div>
  );
}
export function RecipePhoto({
  src,
  secondarySrc,
  alt,
  className = "",
}: {
  src?: string;
  secondarySrc?: string;
  alt: string;
  className?: string;
}) {
  if (!secondarySrc) return <Photo src={src} alt={alt} className={className} />;
  return (
    <div className={`recipe-photo-pair ${className}`}>
      <Photo src={src} alt={alt} />
      <Photo src={secondarySrc} alt={`Outro corte de ${alt}`} />
    </div>
  );
}
export function Brand({ state }: { state: ApiState }) {
  return (
    <div className="brand">
      {state.store.logo ? (
        <img src={state.store.logo} alt="" />
      ) : (
        <span className="brand-mark">
          <Beef size={29} />
        </span>
      )}
      <div>
        <strong>{state.store.name}</strong>
        <span>AÇOUGUE DIGITAL</span>
      </div>
    </div>
  );
}
export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const box = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const focusables = () =>
      Array.from(
        box.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, textarea, select, a[href]",
        ) || [],
      );
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const f = focusables();
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-shade"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={box}
      >
        <button
          className="icon-button close"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}
export const labels: Record<string, string> = {
  waiting: "Recebido",
  preparing: "Em preparo",
  ready: "Pronto para retirar",
  delivered: "Retirado",
  cancelled: "Cancelado",
};
export function Notification({ order }: { order: Order }) {
  const n = order.notification;
  if (!n) return null;
  return (
    <div className="notification-note">
      <Smartphone size={18} />
      <span>
        {n.message ||
          (
            {
              sent: "Aviso enviado pelo WhatsApp.",
              disabled: "Acompanhe pelo QR code ou pelo painel.",
              not_requested: "Acompanhe pelo QR code ou pelo painel.",
              pending: "Aviso aguardando envio.",
              unconfigured:
                "WhatsApp ainda não configurado. Acompanhe pelo QR code.",
              failed:
                "Não foi possível enviar o WhatsApp. Acompanhe pelo QR code.",
            } as Record<string, string>
          )[n.status] ||
          "Acompanhe seu pedido pelo QR code ou pelo painel."}
      </span>
    </div>
  );
}
