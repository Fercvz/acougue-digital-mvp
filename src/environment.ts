export const isPagesDemo = import.meta.env.MODE === "pages";
const demoPhotos = new Map<string, string>();

export function setDemoPhotos(images: Record<string, string>) {
  demoPhotos.clear();
  for (const [path, data] of Object.entries(images)) demoPhotos.set(path, data);
}

export function photoUrl(path?: string) {
  if (!path) return path;
  return (
    demoPhotos.get(path) ||
    (path.startsWith("/fotos/")
      ? `${import.meta.env.BASE_URL}${path.slice(1)}`
      : path)
  );
}
