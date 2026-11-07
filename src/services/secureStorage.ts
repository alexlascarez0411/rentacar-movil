
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'rentacar.auth.access_token';

// Laravel genera tokens válidos por 30 minutos.
// Aplicamos un minuto de margen de seguridad.
const TOKEN_LIFETIME_MS = 29 * 60 * 1000;

interface StoredToken {
    token: string;
    expiresAt: number;
}

// En navegador, el token permanece únicamente en memoria.
let webToken: StoredToken | null = null;

let blocked = false;
let knownExpiry: number | null = null;

// Comprueba si el token aún es válido localmente.
export function hasUnexpiredToken(): boolean {

    return !blocked &&
        knownExpiry !== null &&
        Date.now() < knownExpiry;
}

// Verifica la estructura del dato almacenado.
function isStoredToken(value: unknown): value is StoredToken {

    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const record = value as Record<string, unknown>;

    return typeof record.token === 'string' &&
        record.token.length > 0 &&
        typeof record.expiresAt === 'number' &&
        Number.isFinite(record.expiresAt);
}

// Guardar el token.
export async function saveAuthToken(
    token: string,
    issuedAt = Date.now()
): Promise<void> {

    if (!token.trim()) {
        throw new Error('El servidor devolvió un token vacío.');
    }

    const record: StoredToken = {
        token,
        expiresAt: issuedAt + TOKEN_LIFETIME_MS
    };

    if (Capacitor.isNativePlatform()) {

        await SecureStorage.set(
            TOKEN_KEY,
            JSON.stringify(record)
        );

    } else {

        webToken = record;
    }

    knownExpiry = record.expiresAt;
    blocked = false;
}

// Recuperar el token almacenado.
export async function getAuthToken(): Promise<string | null> {

    if (blocked) {
        return null;
    }

    const stored: unknown = Capacitor.isNativePlatform()
        ? await SecureStorage.get(TOKEN_KEY)
        : webToken;

    let record: unknown = stored;

    // Convertir el contenido almacenado a objeto.
    if (typeof stored === 'string') {

        try {
            record = JSON.parse(stored) as unknown;
        } catch {
            return null;
        }
    }

    // Verificar formato y fecha de vencimiento.
    if (
        !isStoredToken(record) ||
        Date.now() >= record.expiresAt
    ) {
        knownExpiry = null;
        return null;
    }

    knownExpiry = record.expiresAt;

    return record.token;
}

// Eliminar el token al cerrar sesión.
export async function removeAuthToken(): Promise<void> {

    // Impide reutilizar el token durante esta ejecución.
    blocked = true;
    knownExpiry = null;
    webToken = null;

    if (Capacitor.isNativePlatform()) {
        await SecureStorage.remove(TOKEN_KEY);
    }
}
