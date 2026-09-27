import { useId } from "react";
import { BadgePercent, Plus } from "lucide-react";
import { type Product } from "./model";
import { Photo } from "./ui";
import { Money } from "./Money";

export const isOnSale = (product: Product) =>
  Boolean(
    product.promotion &&
      product.promotion.oldPrice > product.price &&
      product.price >= 0,
  );
export function DiscountSeal({
  product,
  id,
}: {
  product: Product;
  id?: string;
}) {
  if (!isOnSale(product)) return null;
  return (
    <span id={id} className="discount-seal" aria-label="Em promoção">
      <strong>%</strong>
      <span>DESCONTO</span>
    </span>
  );
}
export function ProductPrice({ product }: { product: Product }) {
  return (
    <span className={`product-price ${isOnSale(product) ? "sale-price" : ""}`}>
      {isOnSale(product) && (
        <span className="previous-price">
          De{" "}
          <s>
            <Money value={product.promotion!.oldPrice} />
          </s>
        </span>
      )}
      <span className="current-price">
        <strong>
          <Money value={product.price} />
        </strong>
        <small>/kg</small>
      </span>
    </span>
  );
}
export function ProductCard({
  product,
  disabled,
  onSelect,
  featured = false,
}: {
  product: Product;
  disabled: boolean;
  onSelect: () => void;
  featured?: boolean;
}) {
  const priceId = useId();
  const discountId = `${priceId}-discount`;
  return (
    <button
      type="button"
      aria-describedby={`${priceId}${!featured && isOnSale(product) && product.available ? ` ${discountId}` : ""}`}
      className={`product-card ${featured ? "featured-offer" : ""} ${!product.available ? "unavailable" : ""}`}
      disabled={disabled || !product.available}
      onClick={onSelect}
      aria-label={`${featured ? "Oferta: " : "Escolher "}${product.name}`}
    >
      <span className="product-photo">
        <Photo src={product.image} alt={product.name} />
        {!featured && product.available && (
          <DiscountSeal product={product} id={discountId} />
        )}
        {!product.available && (
          <span className="unavailable-tag">Indisponível hoje</span>
        )}
      </span>
      <span className="product-copy">
        <strong className="product-name">{product.name}</strong>
        <span id={priceId} className="product-bottom">
          <ProductPrice product={product} />
          <span className="add-product" aria-hidden="true">
            <Plus size={23} />
          </span>
        </span>
      </span>
    </button>
  );
}
export function DailyOffers({
  products,
  disabled,
  onSelect,
}: {
  products: Product[];
  disabled: boolean;
  onSelect: (product: Product) => void;
}) {
  const offers = products
    .filter((p) => p.available && isOnSale(p))
    .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
    .slice(0, 3);
  if (!offers.length) return null;
  return (
    <section className="daily-offers" aria-label="Promoções do dia">
      <div className="daily-offers-heading">
        <span className="offer-heading-icon">
          <BadgePercent size={32} />
        </span>
        <h1>
          Promoções <span>do dia</span>
        </h1>
      </div>
      <div className="daily-offers-grid">
        {offers.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            featured
            disabled={disabled}
            onSelect={() => onSelect(product)}
          />
        ))}
      </div>
    </section>
  );
}
