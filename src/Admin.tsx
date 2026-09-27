import { useState } from "react";
import { api as request } from "./model";
import { isPagesDemo, photoUrl } from "./environment";
import "./admin.css";

type AdminProps = { state: any; onRefresh: () => void };
type Tab = "products" | "recipes" | "media" | "store";
type IngredientDraft = { name: string; amount: string; unit: string };
type ComponentDraft = { productId: string; grams: string; prep: string };
type VariantDraft = {
  id: string;
  name: string;
  recommendedProductId: string;
  image: string;
  productIds: string[];
  prep: string;
  grams: string;
  ingredients: IngredientDraft[];
  instructions: string;
  meatComponents: ComponentDraft[];
};
type RecipeDraft = {
  secondaryImage: string;
  id?: string;
  name: string;
  description: string;
  image: string;
  category: string;
  baseServings: number;
  active: boolean;
  variants: VariantDraft[];
};

const categories = [
  { id: "bovina", name: "Bovina" },
  { id: "frango", name: "Frango" },
  { id: "suina", name: "Suína" },
  { id: "embutidos", name: "Embutidos" },
  { id: "miudos", name: "Miúdos" },
];
const folders = [
  { id: "produtos/bovina", name: "Produtos / Bovina" },
  { id: "produtos/frango", name: "Produtos / Frango" },
  { id: "produtos/suina", name: "Produtos / Suína" },
  { id: "produtos/embutidos", name: "Produtos / Embutidos" },
  { id: "produtos/miudos", name: "Produtos / Miúdos" },
  { id: "receitas", name: "Receitas e pratos" },
  { id: "marca", name: "Marca da loja" },
  { id: "promocoes", name: "Promoções" },
];
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value || 0,
  );
const quantity = (value: number) => String(Math.round(value * 1000) / 1000);
const numeric = (value: string) => Number(String(value).replace(",", "."));

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    products: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10",
    recipes:
      "M4 4h6c2 0 2 1 2 2 0-1 0-2 2-2h6v16h-6c-2 0-2 1-2 1s0-1-2-1H4V4zm8 2v15",
    media: "M3 4h18v16H3V4zm0 12 6-6 5 5 3-3 4 4M15 8h.01",
    store:
      "M3 9l2-5h14l2 5M3 9v3c0 2 4 2 4 0 0 2 5 2 5 0 0 2 5 2 5 0 0 2 4 2 4 0V9M5 14v6h14v-6M9 20v-5h6v5",
    plus: "M12 5v14M5 12h14",
    upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.products} />
    </svg>
  );
}

async function api(path: string, method: string, body: any) {
  return request(path, {
    method,
    body: JSON.stringify(body),
  });
}

function Photo({
  src,
  label,
  className = "",
}: {
  src?: string;
  label: string;
  className?: string;
}) {
  return src ? (
    <img
      className={`admin-photo ${className}`}
      src={photoUrl(src)}
      alt={label}
    />
  ) : (
    <div className={`admin-photo admin-photo-empty ${className}`}>
      <Icon name="media" />
      <span>Adicionar foto</span>
    </div>
  );
}

function ImagePicker({
  value,
  onChange,
  media,
  kind,
}: {
  value: string;
  onChange: (value: string) => void;
  media: any[];
  kind: string;
}) {
  const relevant = media.filter((item) =>
    kind === "produto"
      ? item.folder?.startsWith("produtos/")
      : kind === "receita"
        ? item.folder === "receitas"
        : item.folder === "marca",
  );
  const choices = [
    ...relevant,
    ...media.filter((item) => !relevant.some((photo) => photo.id === item.id)),
  ];
  return (
    <div className="admin-image-picker">
      <Photo src={value} label="Foto selecionada" />
      <div>
        <label className="admin-field">
          <span>Foto da biblioteca</span>
          <select
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Sem foto</option>
            {value && !choices.some((item) => item.url === value) && (
              <option value={value}>Foto atual</option>
            )}
            {choices.map((item) => (
              <option key={item.id} value={item.url}>
                {item.name} · {item.folder}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-help">
          Envie e organize suas imagens na aba Fotos. Depois, escolha a imagem
          aqui.
        </p>
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  media,
  onSave,
  onCancel,
  saving,
}: {
  product: any;
  media: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState({
    name: product?.name || "",
    category: product?.category || "bovina",
    price: String(product?.price ?? ""),
    available: product?.available ?? true,
    image: product?.image || "",
    description: product?.description || "",
    preps:
      product?.preps?.join(", ") || "Peça inteira, Bifes, Cubos, Tiras, Moído",
    unitGrams: String(Math.round((product?.unitWeight ?? 0.15) * 1000)),
    promotionLabel: product?.promotion?.label || "",
    oldPrice: String(product?.promotion?.oldPrice ?? ""),
  });
  const change = (name: string, value: any) =>
    setDraft((current) => ({ ...current, [name]: value }));
  return (
    <form
      className="admin-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: draft.name.trim(),
          category: draft.category,
          price: numeric(draft.price),
          available: draft.available,
          image: draft.image,
          description: draft.description.trim(),
          preps: draft.preps
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean),
          unitWeight: numeric(draft.unitGrams) / 1000,
          promotion: draft.promotionLabel.trim()
            ? {
                label: draft.promotionLabel.trim(),
                oldPrice: draft.oldPrice ? numeric(draft.oldPrice) : undefined,
              }
            : null,
        });
      }}
    >
      <div className="admin-editor-heading">
        <div>
          <p className="admin-eyebrow">CATÁLOGO DA LOJA</p>
          <h3>{product?.id ? "Editar produto" : "Novo produto"}</h3>
        </div>
        <button
          type="button"
          className="admin-close"
          onClick={onCancel}
          aria-label="Fechar edição"
        >
          ×
        </button>
      </div>
      <div className="admin-form-grid">
        <label className="admin-field admin-span-2">
          <span>Nome do produto</span>
          <input
            required
            maxLength={80}
            value={draft.name}
            onChange={(event) => change("name", event.target.value)}
            placeholder="Ex.: Patinho"
          />
        </label>
        <label className="admin-field">
          <span>Categoria</span>
          <select
            value={draft.category}
            onChange={(event) => change("category", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Preço por kg (R$)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={draft.price}
            onChange={(event) => change("price", event.target.value)}
            placeholder="39,90"
          />
        </label>
        <label className="admin-field admin-span-2">
          <span>Descrição para o cliente</span>
          <input
            maxLength={180}
            value={draft.description}
            onChange={(event) => change("description", event.target.value)}
            placeholder="Explique o corte de forma simples"
          />
        </label>
        <label className="admin-field">
          <span>Peso médio por unidade (g)</span>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={draft.unitGrams}
            onChange={(event) => change("unitGrams", event.target.value)}
          />
          <small>Usado apenas para estimar pedidos por quantidade.</small>
        </label>
        <label className="admin-field">
          <span>Preparos disponíveis</span>
          <input
            required
            value={draft.preps}
            onChange={(event) => change("preps", event.target.value)}
            placeholder="Bifes, Cubos, Moído"
          />
          <small>Separe as opções por vírgulas.</small>
        </label>
      </div>
      <ImagePicker
        value={draft.image}
        onChange={(value) => change("image", value)}
        media={media}
        kind="produto"
      />
      <div className="admin-form-grid admin-promo-fields">
        <label className="admin-field">
          <span>
            Selo de promoção <small>opcional</small>
          </span>
          <input
            maxLength={35}
            value={draft.promotionLabel}
            onChange={(event) => change("promotionLabel", event.target.value)}
            placeholder="Ex.: Oferta do dia"
          />
        </label>
        <label className="admin-field">
          <span>Preço anterior por kg (R$)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required={!!draft.promotionLabel.trim()}
            value={draft.oldPrice}
            onChange={(event) => change("oldPrice", event.target.value)}
            placeholder="Usado no destaque de oferta"
          />
        </label>
      </div>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={draft.available}
          onChange={(event) => change("available", event.target.checked)}
        />
        <span>
          <strong>Disponível para novos pedidos</strong>
          <small>Desmarque quando este produto acabar.</small>
        </span>
      </label>
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-button secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="admin-button" disabled={saving} type="submit">
          {saving ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}

function newVariant(product: any, servings = 4): VariantDraft {
  const productId = product?.id || "";
  return {
    id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    recommendedProductId: productId,
    image: "",
    productIds: productId ? [productId] : [],
    prep: product?.preps?.[0] || "Peça inteira",
    grams: String(150 * servings),
    ingredients: [{ name: "", amount: "", unit: "g" }],
    instructions: "",
    meatComponents: [],
  };
}

function toRecipeDraft(recipe: any, products: any[]): RecipeDraft {
  const baseServings = recipe?.baseServings || 4;
  return {
    id: recipe?.id,
    name: recipe?.name || "",
    description: recipe?.description || "",
    image: recipe?.image || "",
    secondaryImage: recipe?.secondaryImage || "",
    category: recipe?.category || "dia-a-dia",
    baseServings,
    active: recipe?.active ?? true,
    variants: recipe?.variants?.length
      ? recipe.variants.map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          image: variant.image || "",
          recommendedProductId:
            variant.recommendedProductId || variant.productIds?.[0] || "",
          productIds: variant.productIds || [],
          prep: variant.prep || "",
          grams: quantity((variant.gramsPerServing || 0) * baseServings),
          ingredients: (variant.ingredients || []).map((ingredient: any) => ({
            name: ingredient.name,
            amount: quantity(ingredient.amount * baseServings),
            unit: ingredient.unit,
          })),
          instructions: (variant.instructions || []).join("\n"),
          meatComponents: (variant.meatComponents || []).map(
            (component: any) => ({
              productId: component.productId,
              grams: quantity(component.gramsPerServing * baseServings),
              prep: component.prep || "",
            }),
          ),
        }))
      : [newVariant(products[0])],
  };
}

function RecipeEditor({
  recipe,
  products,
  media,
  onSave,
  onCancel,
  saving,
}: {
  recipe: any;
  products: any[];
  media: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    toRecipeDraft(recipe, products),
  );
  const [variantIndex, setVariantIndex] = useState(0);
  const [validation, setValidation] = useState("");
  const variant = draft.variants[variantIndex];
  const recommended = products.find(
    (product) => product.id === variant.recommendedProductId,
  );
  const change = (name: string, value: any) =>
    setDraft((current) => ({ ...current, [name]: value }));
  const updateVariant = (name: keyof VariantDraft, value: any) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((item, index) =>
        index === variantIndex
          ? {
              ...item,
              [name]: value,
              ...(name === "grams" && item.meatComponents.length
                ? {
                    meatComponents: item.meatComponents.map(
                      (component, index) =>
                        index === 0
                          ? { ...component, grams: value }
                          : component,
                    ),
                  }
                : {}),
            }
          : item,
      ),
    }));
  const updateIngredient = (
    index: number,
    field: keyof IngredientDraft,
    value: string,
  ) =>
    updateVariant(
      "ingredients",
      variant.ingredients.map((ingredient, current) =>
        current === index ? { ...ingredient, [field]: value } : ingredient,
      ),
    );
  const updateComponent = (
    index: number,
    field: keyof ComponentDraft,
    value: string,
  ) =>
    updateVariant(
      "meatComponents",
      variant.meatComponents.map((component, current) =>
        current === index
          ? {
              ...component,
              [field]: value,
              ...(field === "productId"
                ? {
                    prep:
                      products.find((product) => product.id === value)
                        ?.preps?.[0] || "",
                  }
                : {}),
            }
          : component,
      ),
    );
  const selectRecommended = (id: string) => {
    const product = products.find((item) => item.id === id);
    const prep = product?.preps?.includes(variant.prep)
      ? variant.prep
      : product?.preps?.[0] || "";
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((item, index) =>
        index === variantIndex
          ? {
              ...item,
              recommendedProductId: id,
              prep,
              productIds: [
                ...new Set([
                  id,
                  ...item.productIds.filter((productId) =>
                    products
                      .find((option) => option.id === productId)
                      ?.preps.includes(prep),
                  ),
                ]),
              ],
              meatComponents: item.meatComponents.map((component, index) =>
                index === 0 ? { ...component, productId: id, prep } : component,
              ),
            }
          : item,
      ),
    }));
  };
  const selectPrep = (prep: string) =>
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((item, index) =>
        index === variantIndex
          ? {
              ...item,
              prep,
              productIds: item.productIds.filter((id) =>
                products
                  .find((product) => product.id === id)
                  ?.preps.includes(prep),
              ),
              meatComponents: item.meatComponents.map((component, index) =>
                index === 0 ? { ...component, prep } : component,
              ),
            }
          : item,
      ),
    }));
  const addMeatComponent = () => {
    const extraProduct =
      products.find((product) => product.id !== variant.recommendedProductId) ||
      products[0];
    updateVariant("meatComponents", [
      ...(variant.meatComponents.length
        ? variant.meatComponents
        : [
            {
              productId: variant.recommendedProductId,
              grams: variant.grams,
              prep: variant.prep,
            },
          ]),
      {
        productId: extraProduct?.id || "",
        grams: String(100 * draft.baseServings),
        prep: extraProduct?.preps?.[0] || "",
      },
    ]);
  };
  const validateDraft = () => {
    for (const [index, item] of draft.variants.entries()) {
      let issue = "";
      if (!item.name.trim()) issue = "Dê um nome para esta versão.";
      else if (!item.recommendedProductId)
        issue = "Escolha a carne recomendada.";
      else if (!(numeric(item.grams) > 0))
        issue = "Informe uma quantidade de carne maior que zero.";
      else if (!item.instructions.trim())
        issue = "Escreva pelo menos uma etapa do modo de preparo.";
      else if (
        item.ingredients.some(
          (ingredient) =>
            ingredient.name.trim() &&
            (!(numeric(ingredient.amount) > 0) || !ingredient.unit.trim()),
        )
      )
        issue = "Confira a quantidade e a unidade de cada ingrediente.";
      else if (
        item.meatComponents.some(
          (component) =>
            !component.productId ||
            !(numeric(component.grams) > 0) ||
            !component.prep,
        )
      )
        issue = "Confira os produtos e as quantidades da combinação de carnes.";
      if (issue) {
        setVariantIndex(index);
        setValidation(`Versão ${index + 1}: ${issue}`);
        return false;
      }
    }
    setValidation("");
    return true;
  };
  const setServings = (value: number) => {
    if (!Number.isFinite(value) || value < 1 || value > 100) return;
    setDraft((current) => ({
      ...current,
      baseServings: value,
      variants: current.variants.map((item) => ({
        ...item,
        grams: quantity((numeric(item.grams) * value) / current.baseServings),
        ingredients: item.ingredients.map((ingredient) => ({
          ...ingredient,
          amount: ingredient.amount
            ? quantity(
                (numeric(ingredient.amount) * value) / current.baseServings,
              )
            : "",
        })),
        meatComponents: item.meatComponents.map((component) => ({
          ...component,
          grams: quantity(
            (numeric(component.grams) * value) / current.baseServings,
          ),
        })),
      })),
    }));
  };
  return (
    <form
      className="admin-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!validateDraft()) return;
        onSave({
          name: draft.name.trim(),
          description: draft.description.trim(),
          image: draft.image,
          secondaryImage: draft.secondaryImage,
          category: draft.category,
          baseServings: draft.baseServings,
          active: draft.active,
          variants: draft.variants.map((item) => ({
            id: item.id,
            name: item.name.trim() || "Sugestão da casa",
            image: item.image,
            recommendedProductId: item.recommendedProductId,
            productIds: [
              ...new Set(
                [item.recommendedProductId, ...item.productIds].filter(Boolean),
              ),
            ],
            prep: item.prep.trim(),
            gramsPerServing: numeric(item.grams) / draft.baseServings,
            ingredients: item.ingredients
              .filter((ingredient) => ingredient.name.trim())
              .map((ingredient) => ({
                name: ingredient.name.trim(),
                amount: numeric(ingredient.amount),
                unit: ingredient.unit.trim(),
              }))
              .map((ingredient) => ({
                ...ingredient,
                amount: ingredient.amount / draft.baseServings,
              })),
            instructions: item.instructions
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            ...(item.meatComponents.length
              ? {
                  meatComponents: item.meatComponents.map((component) => ({
                    productId: component.productId,
                    gramsPerServing:
                      numeric(component.grams) / draft.baseServings,
                    prep: component.prep,
                  })),
                }
              : {}),
          })),
        });
      }}
    >
      <div className="admin-editor-heading">
        <div>
          <p className="admin-eyebrow">RECEITAS DO MERCADO</p>
          <h3>{recipe?.id ? "Editar receita" : "Nova receita"}</h3>
        </div>
        <button
          className="admin-close"
          type="button"
          onClick={onCancel}
          aria-label="Fechar receita"
        >
          ×
        </button>
      </div>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Nome do prato</span>
          <input
            required
            maxLength={80}
            value={draft.name}
            onChange={(event) => change("name", event.target.value)}
            placeholder="Ex.: Estrogonofe"
          />
        </label>
        <label className="admin-field">
          <span>Seção</span>
          <select
            value={draft.category}
            onChange={(event) => change("category", event.target.value)}
          >
            <option value="dia-a-dia">Receitas para o dia a dia</option>
            <option value="churrasco">Churrasco</option>
          </select>
        </label>
        <label className="admin-field admin-span-2">
          <span>Apresentação do prato</span>
          <input
            maxLength={180}
            value={draft.description}
            onChange={(event) => change("description", event.target.value)}
            placeholder="Uma frase curta para ajudar o cliente a escolher"
          />
        </label>
      </div>
      <ImagePicker
        value={draft.image}
        onChange={(value) => change("image", value)}
        media={media}
        kind="receita"
      />
      {draft.category === "churrasco" && (
        <>
          <h4>Segunda foto do kit</h4>
          <ImagePicker
            value={draft.secondaryImage}
            onChange={(value) =>
              setDraft((current) => ({ ...current, secondaryImage: value }))
            }
            media={media}
            kind="receita"
          />
          <p className="admin-help">
            Use para destacar outro corte no card. Sem uma segunda foto, o card
            usa apenas a imagem principal.
          </p>
        </>
      )}

      <div className="admin-servings">
        <label className="admin-field">
          <span>Receita para quantas pessoas?</span>
          <input
            type="number"
            min="1"
            max="100"
            required
            value={draft.baseServings}
            onChange={(event) => setServings(Number(event.target.value))}
          />
        </label>
        <p>
          Cadastre as quantidades para{" "}
          <strong>{draft.baseServings} pessoas</strong>. O aplicativo ajusta a
          lista quando o cliente muda o número de porções.
        </p>
      </div>
      <div className="admin-variant-tabs" aria-label="Versões da receita">
        {draft.variants.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={variantIndex === index ? "active" : ""}
            onClick={() => setVariantIndex(index)}
          >
            {item.name || `Versão ${index + 1}`}
          </button>
        ))}
        <button
          type="button"
          className="admin-add-variant"
          disabled={draft.variants.length >= 12}
          onClick={() => {
            setDraft((current) => ({
              ...current,
              variants: [
                ...current.variants,
                {
                  ...newVariant(products[0], draft.baseServings),
                  grams: String(150 * draft.baseServings),
                },
              ],
            }));
            setVariantIndex(draft.variants.length);
          }}
        >
          <Icon name="plus" /> Nova versão
        </button>
      </div>
      <div className="admin-variant-panel">
        {validation && (
          <div className="admin-alert error" role="alert">
            {validation}
          </div>
        )}
        <div className="admin-variant-title">
          <h4>Versão {variantIndex + 1}</h4>
          {draft.variants.length > 1 && (
            <button
              type="button"
              className="admin-text-button danger"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  variants: current.variants.filter(
                    (_, index) => index !== variantIndex,
                  ),
                }));
                setVariantIndex(Math.max(0, variantIndex - 1));
              }}
            >
              Remover versão
            </button>
          )}
        </div>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nome da versão</span>
            <input
              required
              value={variant.name}
              onChange={(event) => updateVariant("name", event.target.value)}
              placeholder="Ex.: Carne bovina ou Frango"
            />
          </label>
          <label className="admin-field">
            <span>Carne recomendada</span>
            <select
              required
              value={variant.recommendedProductId}
              onChange={(event) => selectRecommended(event.target.value)}
            >
              <option value="">Escolha um produto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {!product.available ? " (indisponível)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>
              Quantidade de carne para {draft.baseServings} pessoas (g)
            </span>
            <input
              type="number"
              min="0.001"
              step="any"
              required
              value={variant.grams}
              onChange={(event) => updateVariant("grams", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Preparo sugerido ao açougue</span>
            <select
              required
              value={variant.prep}
              onChange={(event) => selectPrep(event.target.value)}
            >
              {(recommended?.preps || []).map((prep: string) => (
                <option key={prep} value={prep}>
                  {prep}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h4>Foto desta versão</h4>
        <ImagePicker
          value={variant.image}
          onChange={(value) => updateVariant("image", value)}
          media={media}
          kind="receita"
        />
        <p className="admin-help">
          Sem foto própria, esta versão usa a foto principal da receita.
        </p>
        <fieldset className="admin-alternatives">
          <legend>Outras carnes que o cliente pode escolher</legend>
          <p className="admin-help">
            Marque apenas alternativas adequadas para esta versão. A recomendada
            já está incluída.
          </p>
          <div>
            {products
              .filter(
                (product) =>
                  product.id !== variant.recommendedProductId &&
                  product.preps.includes(variant.prep),
              )
              .map((product) => (
                <label key={product.id}>
                  <input
                    type="checkbox"
                    checked={variant.productIds.includes(product.id)}
                    onChange={(event) =>
                      updateVariant(
                        "productIds",
                        event.target.checked
                          ? [...variant.productIds, product.id]
                          : variant.productIds.filter(
                              (id) => id !== product.id,
                            ),
                      )
                    }
                  />
                  <span>{product.name}</span>
                </label>
              ))}
          </div>
        </fieldset>
        <div className="admin-subsection-heading">
          <div>
            <h4>Ingredientes da lista de compras</h4>
            <p className="admin-help">
              Para {draft.baseServings} pessoas. A carne entra automaticamente
              no pedido.
            </p>
          </div>
          <button
            type="button"
            className="admin-button secondary compact"
            onClick={() =>
              updateVariant("ingredients", [
                ...variant.ingredients,
                { name: "", amount: "", unit: "g" },
              ])
            }
          >
            <Icon name="plus" /> Ingrediente
          </button>
        </div>
        <div className="admin-ingredient-rows">
          {variant.ingredients.map((ingredient, index) => (
            <div className="admin-ingredient-row" key={index}>
              <label className="admin-field">
                <span>Ingrediente</span>
                <input
                  value={ingredient.name}
                  onChange={(event) =>
                    updateIngredient(index, "name", event.target.value)
                  }
                  placeholder="Ex.: Creme de leite"
                />
              </label>
              <label className="admin-field">
                <span>Quantidade</span>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required={!!ingredient.name.trim()}
                  value={ingredient.amount}
                  onChange={(event) =>
                    updateIngredient(index, "amount", event.target.value)
                  }
                />
              </label>
              <label className="admin-field">
                <span>Unidade</span>
                <input
                  required={!!ingredient.name.trim()}
                  value={ingredient.unit}
                  onChange={(event) =>
                    updateIngredient(index, "unit", event.target.value)
                  }
                  placeholder="g, ml, un."
                />
              </label>
              <button
                type="button"
                className="admin-remove"
                aria-label={`Remover ingrediente ${index + 1}`}
                onClick={() =>
                  updateVariant(
                    "ingredients",
                    variant.ingredients.filter(
                      (_, current) => current !== index,
                    ),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="admin-field">
          <span>Modo de preparo</span>
          <textarea
            rows={4}
            required
            value={variant.instructions}
            onChange={(event) =>
              updateVariant("instructions", event.target.value)
            }
            placeholder={
              "Escreva um passo por linha.\nEx.: Doure a carne em uma frigideira."
            }
          />
          <small>Cada linha será uma etapa da receita.</small>
        </label>
        {(draft.category === "churrasco" ||
          variant.meatComponents.length > 0) && (
          <div className="admin-meat-composition">
            <div className="admin-subsection-heading">
              <div>
                <h4>Combinação de carnes</h4>
                <p className="admin-help">
                  A carne principal acompanha a recomendação acima. Inclua as
                  outras carnes e suas quantidades para {draft.baseServings}{" "}
                  pessoas.
                </p>
              </div>
              <button
                className="admin-button secondary compact"
                type="button"
                onClick={addMeatComponent}
              >
                <Icon name="plus" /> Carne
              </button>
            </div>
            {variant.meatComponents.length > 0 && (
              <button
                className="admin-text-button danger"
                type="button"
                onClick={() => updateVariant("meatComponents", [])}
              >
                Usar somente a carne recomendada
              </button>
            )}
            {variant.meatComponents.map((component, index) => (
              <div className="admin-component-row" key={index}>
                <label className="admin-field">
                  <span>Produto</span>
                  <select
                    required
                    disabled={index === 0}
                    value={component.productId}
                    onChange={(event) =>
                      updateComponent(index, "productId", event.target.value)
                    }
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Quantidade (g)</span>
                  <input
                    required
                    disabled={index === 0}
                    type="number"
                    min="0.001"
                    step="any"
                    value={component.grams}
                    onChange={(event) =>
                      updateComponent(index, "grams", event.target.value)
                    }
                  />
                </label>
                <label className="admin-field">
                  <span>Preparo</span>
                  <select
                    required
                    disabled={index === 0}
                    value={component.prep}
                    onChange={(event) =>
                      updateComponent(index, "prep", event.target.value)
                    }
                  >
                    {(
                      products.find(
                        (product) => product.id === component.productId,
                      )?.preps || []
                    ).map((prep: string) => (
                      <option key={prep} value={prep}>
                        {prep}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="admin-remove"
                  disabled={index === 0}
                  aria-label={`Remover carne ${index + 1}`}
                  onClick={() =>
                    updateVariant(
                      "meatComponents",
                      variant.meatComponents.filter(
                        (_, current) => current !== index,
                      ),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(event) => change("active", event.target.checked)}
        />
        <span>
          <strong>Exibir esta receita para os clientes</strong>
          <small>Você pode ocultar a receita sem perder o cadastro.</small>
        </span>
      </label>
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-button secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !products.length}
          className="admin-button"
        >
          {saving ? "Salvando…" : "Salvar receita"}
        </button>
      </div>
    </form>
  );
}

function StoreEditor({
  store,
  media,
  saving,
  onSave,
}: {
  store: any;
  media: any[];
  saving: boolean;
  onSave: (data: any) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: store.name || "",
    tagline: store.tagline || "",
    logo: store.logo || "",
    publicBaseUrl: store.publicBaseUrl || "",
    kioskEnabled: store.kioskEnabled !== false,
    autoReturn: !!store.returnAfterMinutes,
    returnAfterMinutes: String(store.returnAfterMinutes || 30),
  });
  const change = (name: string, value: any) =>
    setDraft((current) => ({ ...current, [name]: value }));
  return (
    <form
      className="admin-editor admin-store-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: draft.name.trim(),
          tagline: draft.tagline.trim(),
          logo: draft.logo,
          publicBaseUrl: draft.publicBaseUrl.trim(),
          kioskEnabled: draft.kioskEnabled,
          returnAfterMinutes: draft.autoReturn
            ? numeric(draft.returnAfterMinutes)
            : null,
        });
      }}
    >
      <div className="admin-editor-heading">
        <div>
          <p className="admin-eyebrow">DO JEITO DO SEU MERCADO</p>
          <h3>Identidade e atendimento</h3>
        </div>
      </div>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Nome do mercado</span>
          <input
            required
            maxLength={80}
            value={draft.name}
            onChange={(event) => change("name", event.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>Frase de apresentação</span>
          <input
            maxLength={140}
            value={draft.tagline}
            onChange={(event) => change("tagline", event.target.value)}
            placeholder="Ex.: Carne boa, do seu jeito."
          />
        </label>
      </div>
      <ImagePicker
        value={draft.logo}
        onChange={(value) => change("logo", value)}
        media={media}
        kind="marca"
      />
      <label className="admin-check">
        <input
          type="checkbox"
          checked={draft.kioskEnabled}
          onChange={(event) => change("kioskEnabled", event.target.checked)}
        />
        <span>
          <strong>Receber novos pedidos no tablet</strong>
          <small>
            Ao pausar, a tela do cliente informa que o atendimento digital está
            indisponível.
          </small>
        </span>
      </label>
      <div className="admin-settings-section">
        <h4>Acompanhamento pelo QR code</h4>
        <label className="admin-field">
          <span>
            {isPagesDemo
              ? "Endereço da demonstração"
              : "Endereço acessível pelo celular"}
          </span>
          <input
            type="url"
            required
            value={draft.publicBaseUrl}
            disabled={isPagesDemo}
            onChange={(event) => change("publicBaseUrl", event.target.value)}
            placeholder="https://pedidos.seumercado.com.br"
          />
          <small>
            {isPagesDemo
              ? "Cada navegador tem seus próprios pedidos. Acompanhe pelo link no mesmo navegador em que o pedido foi criado."
              : "O QR code usa este endereço. Para a apresentação, pode ser o endereço deste computador na rede Wi-Fi. Um endereço local só abre em aparelhos da mesma rede."}
          </small>
        </label>
      </div>
      <div className="admin-settings-section">
        <h4>Pedidos prontos sem retirada</h4>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.autoReturn}
            onChange={(event) => change("autoReturn", event.target.checked)}
          />
          <span>
            <strong>Retornar automaticamente para a fila</strong>
            <small>
              Regra opcional da loja. Desativada, o pedido permanece pronto até
              uma ação da equipe.
            </small>
          </span>
        </label>
        {draft.autoReturn && (
          <label className="admin-field admin-narrow">
            <span>Tempo de espera (minutos)</span>
            <input
              type="number"
              min="1"
              max="1440"
              required
              value={draft.returnAfterMinutes}
              onChange={(event) =>
                change("returnAfterMinutes", event.target.value)
              }
            />
          </label>
        )}
      </div>
      <div className="admin-form-actions">
        <button type="submit" disabled={saving} className="admin-button">
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}

export default function Admin({ state, onRefresh }: AdminProps) {
  const [tab, setTab] = useState<Tab>("products");
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [folder, setFolder] = useState("produtos/bovina");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const products = state.products || [];
  const recipes = state.recipes || [];
  const media = state.media || [];
  const store = state.store || {};
  const tabs: { id: Tab; title: string; label: string }[] = [
    { id: "products", title: "Produtos", label: "Preços e disponibilidade" },
    { id: "recipes", title: "Receitas", label: "Pratos e sugestões" },
    { id: "media", title: "Fotos", label: "Sua biblioteca organizada" },
    { id: "store", title: "Loja", label: "Identidade e atendimento" },
  ];
  const save = async (
    path: string,
    method: string,
    data: any,
    success: string,
    close = true,
  ) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api(path, method, data);
      onRefresh();
      if (close) setEditing(null);
      setMessage(success);
    } catch (failure: any) {
      setError(failure.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };
  const open = (item: any) => {
    setEditing(item);
    setMessage("");
    setError("");
  };
  const whatsappReady =
    state.capabilities?.whatsappConfigured === true ||
    state.capabilities?.whatsapp?.configured === true;
  return (
    <div className="admin">
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">GESTÃO DO MERCADO</p>
          <h2>Tudo pronto para vender melhor.</h2>
          <p>Cuide do catálogo, das receitas e da identidade da sua loja.</p>
        </div>
        <span className="admin-store-chip">
          <Icon name="store" />
          {store.name || "Seu mercado"}
        </span>
      </div>
      <nav className="admin-tabs" aria-label="Áreas da gestão">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "active" : ""}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => {
              setTab(item.id);
              setEditing(null);
              setError("");
              setMessage("");
            }}
          >
            <Icon name={item.id} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.label}</small>
            </span>
          </button>
        ))}
      </nav>
      {error && (
        <div className="admin-alert error" role="alert">
          <strong>Não foi possível concluir.</strong> {error}
        </div>
      )}
      {message && (
        <div className="admin-alert success" role="status">
          <Icon name="check" />
          {message}
        </div>
      )}
      {tab === "products" && (
        <>
          {editing ? (
            <ProductEditor
              key={editing.id || "new"}
              product={editing}
              media={media}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={(data) =>
                save(
                  editing.id ? `/api/products/${editing.id}` : "/api/products",
                  editing.id ? "PATCH" : "POST",
                  data,
                  "Produto salvo. O catálogo já foi atualizado.",
                )
              }
            />
          ) : (
            <>
              <div className="admin-section-heading">
                <div>
                  <h3>Seu catálogo</h3>
                  <p>
                    {products.length} produtos ·{" "}
                    {
                      products.filter((product: any) => product.available)
                        .length
                    }{" "}
                    disponíveis agora
                  </p>
                </div>
                <button
                  className="admin-button"
                  type="button"
                  onClick={() => open({})}
                >
                  <Icon name="plus" />
                  Novo produto
                </button>
              </div>
              <div className="admin-filter" aria-label="Filtrar produtos">
                <button
                  type="button"
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    className={filter === category.id ? "active" : ""}
                    onClick={() => setFilter(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="admin-product-grid">
                {products
                  .filter(
                    (product: any) =>
                      filter === "all" || product.category === filter,
                  )
                  .map((product: any) => (
                    <article className="admin-product-card" key={product.id}>
                      <div className="admin-product-image">
                        <Photo src={product.image} label={product.name} />
                        <span
                          className={`admin-status ${product.available ? "" : "unavailable"}`}
                        >
                          {product.available ? "Disponível" : "Indisponível"}
                        </span>
                      </div>
                      <div className="admin-product-body">
                        <span className="admin-category">
                          {
                            categories.find(
                              (category) => category.id === product.category,
                            )?.name
                          }
                        </span>
                        <h4>{product.name}</h4>
                        <p className="admin-price">
                          {money(product.price)}
                          <small>/kg</small>
                        </p>
                        <div className="admin-card-actions">
                          <button
                            type="button"
                            className="admin-button secondary"
                            onClick={() => open(product)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="admin-text-button"
                            disabled={saving}
                            onClick={() =>
                              save(
                                `/api/products/${product.id}`,
                                "PATCH",
                                { available: !product.available },
                                product.available
                                  ? `${product.name} não será oferecido em novos pedidos.`
                                  : `${product.name} voltou ao catálogo.`,
                              )
                            }
                          >
                            {product.available ? "Pausar" : "Disponibilizar"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!products.length && (
                <div className="admin-empty">
                  <Icon name="products" />
                  <h3>O catálogo começa aqui.</h3>
                  <p>Cadastre o primeiro produto com preço, preparo e foto.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
      {tab === "recipes" && (
        <>
          {editing ? (
            <RecipeEditor
              key={editing.id || "new"}
              recipe={editing}
              products={products}
              media={media}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={(data) =>
                save(
                  editing.id ? `/api/recipes/${editing.id}` : "/api/recipes",
                  editing.id ? "PATCH" : "POST",
                  data,
                  "Receita salva. As sugestões já estão atualizadas.",
                )
              }
            />
          ) : (
            <>
              <div className="admin-section-heading">
                <div>
                  <h3>Inspire a próxima refeição.</h3>
                  <p>
                    O mercado cadastra os pratos e escolhe as carnes
                    recomendadas.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-button"
                  disabled={!products.length}
                  onClick={() => open({})}
                >
                  <Icon name="plus" />
                  Nova receita
                </button>
              </div>
              {!products.length && (
                <p className="admin-alert">
                  Cadastre os produtos antes de criar receitas.
                </p>
              )}
              <div className="admin-recipe-grid">
                {recipes.map((recipe: any) => (
                  <article className="admin-recipe-card" key={recipe.id}>
                    <Photo src={recipe.image} label={recipe.name} />
                    <div className="admin-recipe-body">
                      <div className="admin-recipe-meta">
                        <span className="admin-category">
                          {recipe.category === "churrasco"
                            ? "Churrasco"
                            : "Dia a dia"}
                        </span>
                        <span
                          className={`admin-status ${recipe.active ? "" : "unavailable"}`}
                        >
                          {recipe.active ? "Visível" : "Oculta"}
                        </span>
                      </div>
                      <h4>{recipe.name}</h4>
                      <p>{recipe.description}</p>
                      <div className="admin-recipe-versions">
                        {(recipe.variants || []).map((variant: any) => (
                          <span key={variant.id}>{variant.name}</span>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="admin-button secondary"
                        onClick={() => open(recipe)}
                      >
                        Editar receita
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!recipes.length && (
                <div className="admin-empty">
                  <Icon name="recipes" />
                  <h3>Ajude o cliente a escolher.</h3>
                  <p>
                    Adicione receitas com versões de carne, porções e lista de
                    ingredientes.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
      {tab === "media" && (
        <>
          <div className="admin-section-heading">
            <div>
              <h3>Fotos que mostram a sua loja.</h3>
              <p>Organize os cortes, pratos e materiais da marca em pastas.</p>
            </div>
            <span className="admin-count">{media.length} imagens</span>
          </div>
          <div className="admin-media-layout">
            <aside className="admin-folder-nav" aria-label="Pastas de fotos">
              {folders.map((item) => (
                <button
                  key={item.id}
                  className={folder === item.id ? "active" : ""}
                  type="button"
                  onClick={() => setFolder(item.id)}
                >
                  <Icon name="media" />
                  <span>{item.name}</span>
                  <small>
                    {
                      media.filter((photo: any) => photo.folder === item.id)
                        .length
                    }
                  </small>
                </button>
              ))}
            </aside>
            <div>
              <form
                className="admin-upload"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!photoFile) return;
                  setSaving(true);
                  setError("");
                  setMessage("");
                  try {
                    const body = new FormData();
                    body.append("photo", photoFile);
                    body.append("folder", folder);
                    await request("/api/media", {
                      method: "POST",
                      body,
                    });
                    setPhotoFile(null);
                    (event.target as HTMLFormElement).reset();
                    onRefresh();
                    setMessage(
                      "Foto adicionada à biblioteca. Você já pode selecioná-la nos cadastros.",
                    );
                  } catch (failure: any) {
                    setError(failure.message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <div className="admin-upload-icon">
                  <Icon name="upload" />
                </div>
                <div className="admin-upload-fields">
                  <label className="admin-field">
                    <span>
                      Adicionar em{" "}
                      {folders.find((item) => item.id === folder)?.name}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      onChange={(event) =>
                        setPhotoFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <small>
                    JPG, PNG ou WebP, até 8 MB. Use fotos reais dos produtos e
                    fotos do prato pronto nas receitas.
                  </small>
                </div>
                <button
                  type="submit"
                  disabled={!photoFile || saving}
                  className="admin-button"
                >
                  {saving ? "Enviando…" : "Enviar foto"}
                </button>
              </form>
              <div className="admin-media-grid">
                {media
                  .filter((photo: any) => photo.folder === folder)
                  .map((photo: any) => (
                    <article className="admin-media-card" key={photo.id}>
                      <Photo src={photo.url} label={photo.name} />
                      <div>
                        <strong title={photo.name}>{photo.name}</strong>
                        <small>
                          {folders.find((item) => item.id === photo.folder)
                            ?.name || photo.folder}
                        </small>
                      </div>
                    </article>
                  ))}
              </div>
              {!media.some((photo: any) => photo.folder === folder) && (
                <div className="admin-empty">
                  <Icon name="media" />
                  <h3>Esta pasta está pronta para suas fotos.</h3>
                  <p>Selecione uma imagem acima para começar.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {tab === "store" && (
        <>
          <StoreEditor
            key={store.id || "store"}
            store={store}
            media={media}
            saving={saving}
            onSave={(data) =>
              save(
                "/api/store",
                "PATCH",
                data,
                "Configurações da loja salvas.",
                false,
              )
            }
          />
          <div className="admin-whatsapp">
            <div className="admin-whatsapp-mark">W</div>
            <div>
              <h3>Avisos pelo WhatsApp</h3>
              <span
                className={`admin-status ${whatsappReady ? "" : "pending"}`}
              >
                {isPagesDemo
                  ? "Disponível na versão com servidor"
                  : whatsappReady
                    ? "Integração configurada"
                    : "Aguardando configuração da conta"}
              </span>
              <p>
                {isPagesDemo
                  ? "Avisos reais e acompanhamento entre aparelhos usam a versão com servidor. Nesta apresentação, o fluxo é testado no navegador."
                  : whatsappReady
                    ? "A integração está configurada. O resultado de cada envio aparece no pedido; uma falha não impede o acompanhamento pelo QR code."
                    : "O mercado ainda precisa configurar uma conta oficial WhatsApp Business/Meta para ativar os avisos automáticos. Enquanto isso, o QR code permite acompanhar o pedido e consultar a lista de compras."}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
