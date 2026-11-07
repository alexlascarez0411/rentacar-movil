import { watch } from 'vue';

import { apiConfig } from '@/config/apiConfig';
import { session } from '@/services/auth';
import { getAuthToken } from '@/services/secureStorage';

export interface VehiculoListado {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anno: number;
  precio_diario: number;
  estado: string | null;
}

export interface PaginaVehiculos {
  data: VehiculoListado[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface CacheVehiculos extends PaginaVehiculos {
  actualizadoEn: number;
}

let claveSesion: string | null = null;
let revisionSesion = 0;

watch(
  () => session.status,
  (estado) => {
    if (estado !== 'guest') return;

    revisionSesion++;
    eliminarCacheVehiculos(claveSesion);
    claveSesion = null;
  },
  { flush: 'sync' },
);

export async function obtenerClaveCacheVehiculos(): Promise<string | null> {
  try {
    const revision = revisionSesion;
    const token = await getAuthToken();
    if (revision !== revisionSesion || session.status === 'guest' || !token || !globalThis.crypto?.subtle) return null;

    const servidor = new URL(apiConfig.baseUrl, globalThis.location.href).href;
    const datos = new TextEncoder().encode(JSON.stringify([servidor, token]));
    const huella = await globalThis.crypto.subtle.digest('SHA-256', datos);
    const identificador = Array.from(new Uint8Array(huella), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const clave = `rentacar.vehiculos.v1.${identificador}`;
    if (revision !== revisionSesion) {
      eliminarCacheVehiculos(clave);
      return null;
    }
    claveSesion = clave;
    return clave;
  } catch {
    return null;
  }
}

export function leerCacheVehiculos(clave: string | null): CacheVehiculos | null {
  if (!clave) return null;
  try {
    const guardado = localStorage.getItem(clave);
    if (!guardado) return null;
    const cache = JSON.parse(guardado) as CacheVehiculos;
    if (
      !Array.isArray(cache.data) ||
      !Number.isFinite(cache.actualizadoEn) ||
      !Number.isInteger(cache.meta?.current_page) ||
      !Number.isInteger(cache.meta?.last_page) ||
      !Number.isInteger(cache.meta?.total)
    )
      return null;
    return cache;
  } catch {
    return null;
  }
}

export function guardarCacheVehiculos(clave: string | null, cache: CacheVehiculos): void {
  if (!clave) return;
  try {
    localStorage.setItem(clave, JSON.stringify(cache));
  } catch {
    // El listado sigue disponible en memoria si el almacenamiento no está disponible.
  }
}

export function eliminarCacheVehiculos(clave: string | null): void {
  if (!clave) return;
  try {
    localStorage.removeItem(clave);
  } catch {
    // La pantalla descarta su copia en memoria aunque falle el almacenamiento.
  }
}
