import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface UbicacionActual {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type CodigoErrorUbicacion =
  | 'PERMISO_DENEGADO'
  | 'SERVICIO_DESACTIVADO'
  | 'TIEMPO_AGOTADO'
  | 'PERMISOS_NO_DECLARADOS'
  | 'NO_DISPONIBLE';

export class UbicacionError extends Error {
  constructor(
    public readonly codigo: CodigoErrorUbicacion,
    message: string,
  ) {
    super(message);
    this.name = 'UbicacionError';
  }
}

function permisoConcedido(estado: {
  location?: string;
  coarseLocation?: string;
}): boolean {
  return estado.location === 'granted' || estado.coarseLocation === 'granted';
}

async function asegurarPermiso(): Promise<void> {
  // En web, el navegador solicita el permiso al pedir la ubicación.
  if (!Capacitor.isNativePlatform()) return;

  const actual = await Geolocation.checkPermissions();
  if (permisoConcedido(actual)) return;

  const solicitado = await Geolocation.requestPermissions({
    permissions: ['location'],
  });

  if (!permisoConcedido(solicitado)) {
    throw new UbicacionError(
      'PERMISO_DENEGADO',
      'No se concedió el permiso de ubicación.',
    );
  }
}

function normalizarError(error: unknown): UbicacionError {
  if (error instanceof UbicacionError) return error;

  const codigo =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (codigo) {
    case 'OS-PLUG-GLOC-0003':
      return new UbicacionError(
        'PERMISO_DENEGADO',
        'El permiso de ubicación fue denegado.',
      );
    case 'OS-PLUG-GLOC-0007':
    case 'OS-PLUG-GLOC-0009':
    case 'OS-PLUG-GLOC-0017':
      return new UbicacionError(
        'SERVICIO_DESACTIVADO',
        'Activa la ubicación del dispositivo e intenta de nuevo.',
      );
    case 'OS-PLUG-GLOC-0010':
      return new UbicacionError(
        'TIEMPO_AGOTADO',
        'No fue posible obtener la ubicación a tiempo. Intenta nuevamente.',
      );
    case 'OS-PLUG-GLOC-0018':
      return new UbicacionError(
        'PERMISOS_NO_DECLARADOS',
        'La aplicación no tiene declarados los permisos de ubicación.',
      );
    default:
      return new UbicacionError(
        'NO_DISPONIBLE',
        'No fue posible obtener la ubicación actual.',
      );
  }
}

export async function obtenerUbicacionActual(): Promise<UbicacionActual> {
  try {
    await asegurarPermiso();

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 10_000,
      enableLocationFallback: true,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error) {
    throw normalizarError(error);
  }
}
