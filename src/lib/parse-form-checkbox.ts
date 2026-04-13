/**
 * Interpreta checkbox em FormData de Server Actions.
 * O valor padrão do HTML é "on"; outras pilhas podem enviar "true", "1", etc.
 */
export function parseFormCheckbox(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  if (v == null) return false;
  if (typeof v !== "string") return false;
  const s = v.toLowerCase();
  return s === "on" || s === "true" || s === "1" || s === "yes";
}
