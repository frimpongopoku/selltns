// Products may have no name. These are the only ways to show one, so a
// nameless product reads "Item #42" (or just "#42") instead of "Untitled".
type Named = { title: string; number: number };

export const hasName = (p: Named) => p.title.trim() !== "";

export const productNumber = (p: Pick<Named, "number">) => `#${p.number}`;

export function productName(p: Named): string {
  return p.title.trim() || `Item #${p.number}`;
}
