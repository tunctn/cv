export interface FontOption {
  family: string;
  id: string;
  name: string;
}

/** Fonts a CV can use. All are static (non-variable) so PDFs embed real TrueType text. */
export const FONTS: FontOption[] = [
  { id: "inter", name: "Inter", family: '"Inter", sans-serif' },
  {
    id: "ibm-plex-sans",
    name: "IBM Plex Sans",
    family: '"IBM Plex Sans", sans-serif',
  },
  { id: "dm-sans", name: "DM Sans", family: '"DM Sans", sans-serif' },
  {
    id: "source-serif-4",
    name: "Source Serif",
    family: '"Source Serif 4", Georgia, serif',
  },
  { id: "lora", name: "Lora", family: '"Lora", Georgia, serif' },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    family: '"IBM Plex Mono", monospace',
  },
];

export function fontFamily(id: string) {
  return (FONTS.find((f) => f.id === id) ?? FONTS[0]).family;
}

export const ACCENTS = [
  "#0a0a0a",
  "#1f3a5f",
  "#2f5d50",
  "#7a2e2e",
  "#5b3f8c",
  "#b4532a",
];
