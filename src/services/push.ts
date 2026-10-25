/** Web não registra push nativo. */
export async function ativarPush(_solicitar = true): Promise<string> {
  return 'Para receber avisos com o aplicativo fechado, use o aplicativo Android instalado.';
}
export async function removerPush(): Promise<void> {}
export function cancelarRegistroPush(): void {}
export function observarPush(_recebida: () => void, _abrir: (data: Record<string, unknown>) => void): () => void { return () => {}; }
