
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'rentacar.auth.access_token';

// En navegador se mantiene únicamente en memoria.
// No se guarda en localStorage ni en Preferences.
let webMemoryToken: string | null = null;

// Identifica si estamos ejecutando una aplicación nativa.
export function usesNativeEncryption(): boolean {
    return Capacitor.isNativePlatform();
}

// Guardar el token.
export async function saveAuthToken(
    token: string
): Promise<void> {

    if (!token.trim()) {
        throw new Error('El token recibido está vacío.');
    }

    if (usesNativeEncryption()) {

        await SecureStorage.set(TOKEN_KEY, token);

    } else {

        // Solo para desarrollo en navegador.
        webMemoryToken = token;

    }
}

// Recuperar el token.
export async function getAuthToken(): Promise<string | null> {

    if (!usesNativeEncryption()) {
        return webMemoryToken;
    }

    const token = await SecureStorage.get(TOKEN_KEY);

    if (token === null) {
        return null;
    }

    if (typeof token !== 'string') {
        throw new Error('El token almacenado no es válido.');
    }

    return token;
}

// Eliminar el token al cerrar sesión.
export async function removeAuthToken(): Promise<void> {

    webMemoryToken = null;

    if (usesNativeEncryption()) {
        await SecureStorage.remove(TOKEN_KEY);
    }
}
