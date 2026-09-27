import QRCode from "qrcode";
import { seedState } from "../../shared/seed";
import credits from "../../public/fotos/creditos-fontes.json";
import { setDemoPhotos } from "../environment";
import { BrowserRepository } from "./repository";
import { createDemoApi } from "./api";

const baseUrl = new URL(import.meta.env.BASE_URL, location.origin).href;
const repository = new BrowserRepository(
  `acougue-pages-v1:${import.meta.env.BASE_URL}`,
  () => {
    const state = seedState(baseUrl);
    state.media = credits.map((photo) => ({
      id: photo.path,
      name: photo.path.split("/").at(-1)!,
      folder: photo.path.slice("/fotos/".length, photo.path.lastIndexOf("/")),
      url: photo.path,
      createdAt: Date.parse(photo.verifiedAt),
    }));
    return { state, images: {} };
  },
);
export const demoApi = createDemoApi({
  repository,
  baseUrl,
  onImages: setDemoPhotos,
  qr: (value) =>
    QRCode.toDataURL(value, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    }),
});
