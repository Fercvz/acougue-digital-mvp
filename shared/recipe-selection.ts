import type { RecipeVariant } from "./types.js";

/** The first meat is the customer's selected cut; the rest belong to the kit. */
export function recipeMeats(
  variant: RecipeVariant,
  productId: string,
  servings: number,
) {
  const components = variant.meatComponents?.length
    ? variant.meatComponents
    : [
        {
          productId,
          gramsPerServing: variant.gramsPerServing,
          prep: variant.prep,
        },
      ];
  return components.map((component, index) => ({
    productId: index === 0 ? productId : component.productId,
    amount: Number(((component.gramsPerServing * servings) / 1000).toFixed(3)),
    unit: "kg" as const,
    prep: component.prep,
  }));
}
