import { currency } from "./model";

const number = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Money({ value }: { value: number }) {
  const [integer, cents] = number.format(value).split(",");
  return (
    <span className="money">
      <span className="sr-only">{currency(value)}</span>
      <span className="money-visual" aria-hidden="true">
        <span className="money-symbol">R$</span>
        <span className="money-integer">{integer}</span>
        <span className="money-cents">,{cents}</span>
      </span>
    </span>
  );
}
