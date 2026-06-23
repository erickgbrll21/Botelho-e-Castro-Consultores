import { formatCepDisplay } from "@/lib/cliente-endereco";
import type { ViaCepNormalized } from "@/lib/viacep";

function setInputValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!el || el instanceof RadioNodeList) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
  }
}

export function applyViaCepToForm(
  form: HTMLFormElement,
  data: ViaCepNormalized
) {
  setInputValue(form, "cep", formatCepDisplay(data.cep));
  if (data.logradouro) setInputValue(form, "logradouro", data.logradouro);
  if (data.complemento) setInputValue(form, "complemento", data.complemento);
  if (data.bairro) setInputValue(form, "bairro", data.bairro);
  if (data.cidade) setInputValue(form, "cidade", data.cidade);
  if (data.estado) setInputValue(form, "estado", data.estado);
}
