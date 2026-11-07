import type { PluginListenerHandle } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { onBeforeUnmount } from 'vue';

export function useNetwork(alCambiar: (conectado: boolean | undefined) => void): {
  iniciar: () => Promise<void>;
  detener: () => void;
} {
  let observacion: AbortController | undefined;
  let listener: PluginListenerHandle | undefined;

  function detener(): void {
    observacion?.abort();
    observacion = undefined;
    void listener?.remove().catch(() => undefined);
    listener = undefined;
  }

  async function iniciar(): Promise<void> {
    detener();
    const actual = new AbortController();
    observacion = actual;
    let ultimoEstado: boolean | undefined;
    let recibioEstado = false;

    function publicar(conectado: boolean | undefined) {
      if (actual.signal.aborted || (recibioEstado && conectado === ultimoEstado)) return;
      recibioEstado = true;
      ultimoEstado = conectado;
      alCambiar(conectado);
    }

    try {
      const handle = await Network.addListener('networkStatusChange', ({ connected }) => publicar(connected));
      if (actual.signal.aborted) {
        await handle.remove();
        return;
      }
      listener = handle;
    } catch {
      // La lectura inicial sigue siendo útil aunque falle el listener.
    }

    if (actual.signal.aborted) return;
    try {
      const estado = await Network.getStatus();
      if (!recibioEstado) publicar(estado.connected);
    } catch {
      if (!recibioEstado) publicar(undefined);
    }
  }

  onBeforeUnmount(detener);
  return { iniciar, detener };
}
