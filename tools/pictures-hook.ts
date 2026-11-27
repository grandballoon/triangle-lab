// The module hook tools/pictures.ts registers: a picture's import is a module
// whose default export is the picture's URL. Everything else loads as usual.

const PICTURE = /\.(svg|png|jpe?g|webp|avif)$/;

interface Loaded {
  format: string;
  source: string;
  shortCircuit: true;
}

export async function load(url: string, context: unknown, next: (url: string, context: unknown) => Promise<unknown>): Promise<unknown> {
  if (!PICTURE.test(new URL(url).pathname)) return next(url, context);
  const loaded: Loaded = { format: "module", source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
  return loaded;
}
