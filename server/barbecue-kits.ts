import type { Recipe } from "../shared/types.js";

/** Editable examples for the store's first presentation. */
export const barbecueKits: Recipe[] = [
  {
    id: "churrasco-dia-a-dia",
    name: "Churrasco do dia a dia",
    description:
      "Alcatra, linguiça e frango, com molho de alho e acompanhamentos na lista de compras.",
    image: "/fotos/receitas/churrasco-dia-a-dia.jpg",
    category: "churrasco",
    baseServings: 4,
    active: true,
    variants: [
      {
        id: "dia-a-dia",
        name: "Alcatra, linguiça e frango",
        productIds: ["alcatra"],
        recommendedProductId: "alcatra",
        prep: "Bifes",
        gramsPerServing: 150,
        meatComponents: [
          { productId: "alcatra", gramsPerServing: 150, prep: "Bifes" },
          { productId: "linguica", gramsPerServing: 150, prep: "Inteira" },
          { productId: "coxa", gramsPerServing: 150, prep: "Peça inteira" },
        ],
        ingredients: [
          { name: "Molho de alho pronto", amount: 25, unit: "g" },
          { name: "Pão de alho", amount: 1, unit: "un" },
          { name: "Farofa", amount: 40, unit: "g" },
        ],
        instructions: [
          "Mantenha as carnes refrigeradas até a hora de preparar e tempere a gosto.",
          "Comece pelo frango e pela linguiça; asse completamente. Prepare a alcatra em seguida.",
          "Aqueça o pão de alho e sirva com a farofa e o molho de alho.",
        ],
      },
    ],
  },
  {
    id: "churrasco",
    name: "Churrasco de fim de semana",
    description:
      "Contrafilé, linguiça e frango, com vinagrete, molho de alho e acompanhamentos na lista de compras.",
    image: "/fotos/receitas/churrasco-fim-semana.jpg",
    category: "churrasco",
    baseServings: 6,
    active: true,
    variants: [
      {
        id: "classico",
        name: "Contrafilé, linguiça e frango",
        productIds: ["contrafile"],
        recommendedProductId: "contrafile",
        prep: "Bifes",
        gramsPerServing: 250,
        meatComponents: [
          { productId: "contrafile", gramsPerServing: 250, prep: "Bifes" },
          { productId: "linguica", gramsPerServing: 100, prep: "Inteira" },
          { productId: "coxa", gramsPerServing: 100, prep: "Peça inteira" },
        ],
        ingredients: [
          { name: "Vinagrete pronto", amount: 60, unit: "g" },
          { name: "Molho de alho pronto", amount: 25, unit: "g" },
          { name: "Pão de alho", amount: 1, unit: "un" },
          { name: "Farofa", amount: 40, unit: "g" },
        ],
        instructions: [
          "Mantenha as carnes refrigeradas até o preparo e tempere a gosto.",
          "Asse completamente o frango e a linguiça. Grelhe os bifes de contrafilé.",
          "Sirva com pão de alho aquecido, vinagrete, molho de alho e farofa.",
        ],
      },
    ],
  },
  {
    id: "churrasco-impressionar",
    name: "Quero impressionar",
    description:
      "Picanha, carré suíno e linguiça, com chimichurri, molho de alho e acompanhamentos na lista de compras.",
    image: "/fotos/receitas/churrasco-picanha.jpg",
    secondaryImage: "/fotos/receitas/churrasco-carre-suino.jpg",
    category: "churrasco",
    baseServings: 6,
    active: true,
    variants: [
      {
        id: "impressionar",
        name: "Picanha, carré suíno e linguiça",
        productIds: ["picanha"],
        recommendedProductId: "picanha",
        prep: "Bifes",
        gramsPerServing: 300,
        meatComponents: [
          { productId: "picanha", gramsPerServing: 300, prep: "Bifes" },
          {
            productId: "carre-suino",
            gramsPerServing: 150,
            prep: "Peça inteira",
          },
          { productId: "linguica", gramsPerServing: 100, prep: "Inteira" },
        ],
        ingredients: [
          { name: "Chimichurri pronto", amount: 20, unit: "g" },
          { name: "Molho de alho pronto", amount: 25, unit: "g" },
          { name: "Pão de alho", amount: 1, unit: "un" },
          { name: "Farofa", amount: 40, unit: "g" },
        ],
        instructions: [
          "Mantenha as carnes refrigeradas até o preparo. Tempere os bifes a gosto.",
          "Asse completamente o carré suíno e a linguiça. Prepare a picanha na grelha em seguida.",
          "Sirva as carnes com chimichurri e molho de alho, acompanhadas de pão de alho e farofa.",
        ],
      },
    ],
  },
];
