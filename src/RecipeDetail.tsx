import { useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Photo, RecipePhoto } from "./ui";
import { Money } from "./Money";
import { recipeMeats } from "../shared/recipe-selection";
import {
  newId,
  weightLabel,
  type CartItem,
  type Product,
  type Recipe,
  type Selection,
} from "./model";
import "./recipes.css";

export default function RecipeDetail({
  recipe,
  products,
  onBack,
  onAdd,
  disabled,
}: {
  recipe: Recipe;
  products: Product[];
  onBack: () => void;
  onAdd: (items: CartItem[], selection: Selection) => void;
  disabled: boolean;
}) {
  const [variantId, setVariantId] = useState(recipe.variants[0]?.id);
  const [servings, setServings] = useState(recipe.baseServings || 2);
  const [productId, setProductId] = useState(
    recipe.variants[0]?.recommendedProductId,
  );
  const variant =
    recipe.variants.find((v) => v.id === variantId) || recipe.variants[0];
  if (!variant) return <p>Esta receita ainda não tem opções cadastradas.</p>;
  const isBarbecue = recipe.category === "churrasco";
  const choices = products.filter((p) => variant.productIds.includes(p.id));
  const items: CartItem[] = recipeMeats(variant, productId, servings).map(
    (item) => ({
      ...item,
      key: newId(),
      notes: `${recipe.name} · ${servings} ${recipe.id === "hamburguer" ? "hambúrgueres" : "pessoas"}`,
      recipeId: recipe.id,
    }),
  );
  const total = items.reduce(
    (sum, item) =>
      sum +
      (products.find((p) => p.id === item.productId)?.price || 0) * item.amount,
    0,
  );
  const available = items.every(
    (item) => products.find((p) => p.id === item.productId)?.available,
  );
  const mainWeight = items[0]?.amount || 0;
  const totalWeight = items.reduce((sum, item) => sum + item.amount, 0);
  const servingLabel = recipe.id === "hamburguer" ? "hambúrgueres" : "pessoas";

  const groceries = (
    <section className="dish-groceries">
      <div className="dish-groceries-heading">
        <h2>
          {isBarbecue ? "Molhos e acompanhamentos" : "Outros ingredientes"}
        </h2>
        <span>Na lista de compras</span>
      </div>
      <ul>
        {variant.ingredients.map((ingredient, index) => (
          <li key={index}>
            <span>{ingredient.name}</span>
            <b>
              {Number((ingredient.amount * servings).toFixed(2)).toLocaleString(
                "pt-BR",
              )}{" "}
              {ingredient.unit}
            </b>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <section
      className={`recipe-experience ${isBarbecue ? "barbecue-experience" : ""}`}
    >
      <div className="recipe-navigation">
        <button
          className="back-button"
          aria-label={
            isBarbecue ? "Voltar aos churrascos" : "Voltar aos pratos"
          }
          onClick={onBack}
        >
          <ArrowLeft size={22} />
          {isBarbecue ? "Voltar aos churrascos" : "Voltar aos pratos"}
        </button>
        <h1>{recipe.name}</h1>
      </div>
      <div className="dish-layout">
        <div className="dish-story">
          <RecipePhoto
            secondarySrc={recipe.secondaryImage}
            src={variant.image || recipe.image}
            alt={`${recipe.name} · ${variant.name}`}
            className="dish-hero"
          />
          {isBarbecue && groceries}
          <section className="dish-method" aria-label="Modo de preparo">
            <h2>{isBarbecue ? "Na churrasqueira" : "Modo de preparo"}</h2>
            <ol>
              {variant.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </section>
          {!isBarbecue && groceries}
        </div>
        <div className="dish-order">
          <div className="dish-servings">
            <h2>
              {recipe.id === "hamburguer"
                ? "Quantos hambúrgueres?"
                : "Para quantas pessoas?"}
            </h2>
            <div className="stepper">
              <button
                aria-label="Diminuir porções"
                disabled={servings <= 1}
                onClick={() => setServings(servings - 1)}
              >
                <Minus size={18} />
              </button>
              <strong aria-live="polite">{servings}</strong>
              <button
                aria-label="Aumentar porções"
                disabled={servings >= 50}
                onClick={() => setServings(servings + 1)}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          {recipe.variants.length > 1 && (
            <div
              className="dish-variants segmented"
              aria-label="Versão do prato"
            >
              {recipe.variants.map((v) => (
                <button
                  key={v.id}
                  aria-pressed={v.id === variant.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setProductId(v.recommendedProductId);
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
          {(!isBarbecue || choices.length > 1) && (
            <section className="dish-cut-section">
              <h2>{isBarbecue ? "Corte principal" : "Escolha a carne"}</h2>
              <div className="dish-cuts">
                {choices.map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={p.id === productId}
                    disabled={!p.available}
                    onClick={() => setProductId(p.id)}
                  >
                    <Photo src={p.image} alt={p.name} />
                    <span>
                      <strong>{p.name}</strong>
                      <span>
                        {p.available ? (
                          <Money value={p.price * mainWeight} />
                        ) : (
                          "Indisponível"
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {isBarbecue && (
            <section className="dish-meats">
              <h2>Carnes do seu kit</h2>
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div className="dish-meat" key={`${item.productId}-${index}`}>
                    <Photo
                      src={product?.image}
                      alt={product?.name || "Carne"}
                    />
                    <span>
                      <strong>{product?.name || "Produto indisponível"}</strong>
                      <small>
                        {item.prep}
                        {!product?.available && " · Indisponível"}
                      </small>
                    </span>
                    <b>{weightLabel(item.amount)}</b>
                  </div>
                );
              })}
            </section>
          )}
          <div className="dish-purchase">
            <div>
              <span>
                Total estimado
                <small>
                  {weightLabel(totalWeight)} de carne · {servings}{" "}
                  {servingLabel}
                </small>
              </span>
              <strong>
                <Money value={total} />
              </strong>
            </div>
            {!available && (
              <p className="form-error" role="status">
                Uma das carnes está indisponível. Escolha outra opção.
              </p>
            )}
            <button
              className="primary"
              disabled={disabled || !available}
              onClick={() =>
                onAdd(items, {
                  recipeId: recipe.id,
                  variantId: variant.id,
                  servings,
                  productId,
                })
              }
            >
              {isBarbecue ? "Adicionar carnes do kit" : "Adicionar ao pedido"}
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
