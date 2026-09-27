import { barbecueKits } from "./barbecue-kits.js";
import { products } from "./catalog.js";
import type { DatabaseState, Recipe } from "../shared/types.js";

const recipes: Recipe[] = [
  {
    id: "estrogonofe",
    name: "Estrogonofe",
    description:
      "Um clássico cremoso para o almoço. Você escolhe carne ou frango.",
    image: "/fotos/receitas/estrogonofe-bovino.png",
    category: "dia-a-dia",
    baseServings: 4,
    active: true,
    variants: [
      {
        id: "carne",
        name: "De carne",
        image: "/fotos/receitas/estrogonofe-bovino.png",
        productIds: ["alcatra", "patinho", "contrafile"],
        recommendedProductId: "alcatra",
        prep: "Tiras",
        gramsPerServing: 150,
        ingredients: [
          { name: "Creme de leite", amount: 50, unit: "g" },
          { name: "Cebola", amount: 0.25, unit: "un" },
          { name: "Molho de tomate", amount: 30, unit: "g" },
          { name: "Arroz", amount: 60, unit: "g" },
          { name: "Batata palha", amount: 25, unit: "g" },
        ],
        instructions: [
          "Doure a cebola e a carne em uma panela com um fio de óleo.",
          "Junte o molho de tomate e cozinhe a carne completamente.",
          "Abaixe o fogo, acrescente o creme de leite e misture.",
          "Prepare o arroz conforme a embalagem e sirva com a batata palha.",
        ],
      },
      {
        id: "frango",
        name: "De frango",
        image: "/fotos/receitas/estrogonofe-frango.jpg",
        productIds: ["peito-frango"],
        recommendedProductId: "peito-frango",
        prep: "Cubos",
        gramsPerServing: 150,
        ingredients: [
          { name: "Creme de leite", amount: 50, unit: "g" },
          { name: "Cebola", amount: 0.25, unit: "un" },
          { name: "Molho de tomate", amount: 30, unit: "g" },
          { name: "Arroz", amount: 60, unit: "g" },
          { name: "Batata palha", amount: 25, unit: "g" },
        ],
        instructions: [
          "Doure a cebola e o frango em uma panela com um fio de óleo.",
          "Junte o molho e cozinhe completamente o frango.",
          "Abaixe o fogo, acrescente o creme de leite e misture.",
          "Sirva com arroz e batata palha.",
        ],
      },
    ],
  },
  {
    id: "hamburguer",
    name: "Hambúrguer em casa",
    description:
      "Carne moída para você modelar e caprichar nos acompanhamentos.",
    image: "/fotos/receitas/hamburguer-bovino.jpg",
    category: "dia-a-dia",
    baseServings: 4,
    active: true,
    variants: [
      {
        id: "bovino",
        name: "Bovino",
        image: "/fotos/receitas/hamburguer-bovino.jpg",
        productIds: ["patinho", "alcatra"],
        recommendedProductId: "patinho",
        prep: "Moído",
        gramsPerServing: 150,
        ingredients: [
          { name: "Pão de hambúrguer", amount: 1, unit: "un" },
          { name: "Queijo", amount: 25, unit: "g" },
          { name: "Tomate", amount: 0.25, unit: "un" },
          { name: "Alface", amount: 2, unit: "folhas" },
        ],
        instructions: [
          "Divida a carne em porções e modele os hambúrgueres.",
          "Tempere a gosto e cozinhe completamente os dois lados.",
          "Acrescente o queijo e monte no pão com os vegetais lavados.",
        ],
      },
      {
        id: "frango",
        name: "De frango",
        image: "/fotos/receitas/hamburguer-frango.jpg",
        productIds: ["peito-frango"],
        recommendedProductId: "peito-frango",
        prep: "Moído",
        gramsPerServing: 150,
        ingredients: [
          { name: "Pão de hambúrguer", amount: 1, unit: "un" },
          { name: "Queijo", amount: 25, unit: "g" },
          { name: "Tomate", amount: 0.25, unit: "un" },
          { name: "Alface", amount: 2, unit: "folhas" },
        ],
        instructions: [
          "Tempere o frango moído a gosto e modele os discos.",
          "Cozinhe completamente os hambúrgueres em frigideira untada.",
          "Monte no pão com queijo e vegetais lavados.",
        ],
      },
    ],
  },
  ...barbecueKits,
];

export function seedState(): DatabaseState {
  return {
    store: {
      id: "bom-corte",
      name: "Bom Corte",
      tagline: "Seu açougue, do seu jeito.",
      logo: "",
      publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:3000",
      kioskEnabled: true,
      returnAfterMinutes: null,
    },
    products: structuredClone(products),
    recipes: structuredClone(recipes),
    orders: [],
    media: [],
    nextTicket: 1,
  };
}
