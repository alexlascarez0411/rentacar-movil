
import { reactive, readonly } from 'vue';

import { apiConfig } from '@/config/apiConfig';
import {
    apiRequest,
    ApiError,
    setUnauthorizedHandler
} from '@/services/api';
import {
    saveAuthToken,
    getAuthToken,
    removeAuthToken
} from '@/services/secureStorage';

// Estados posibles de la sesión.
export type SessionStatus =
    'checking' | 'authenticated' | 'guest';

const state = reactive<{
    status: SessionStatus;
}>({
    status: 'checking'
});

// Estado visible para otros componentes,
// pero no modificable directamente.
export const session = readonly(state);

let restoring: Promise<boolean> | null = null;
let loginPending = false;

// Función de navegación que registrará el Integrante 1.
let redirectToLogin:
    (() => Promise<unknown>) | null = null;

export function setLoginRedirect(
    callback: () => Promise<unknown>
): void {
    redirectToLogin = callback;
}

// Indica si el usuario tiene una sesión activa.
export function isAuthenticated(): boolean {
    return state.status === 'authenticated';
}

// Recuperar la sesión cuando se abre la aplicación.
export async function restoreSession(): Promise<boolean> {

    if (state.status !== 'checking') {
        return isAuthenticated();
    }

    if (restoring) {
        return restoring;
    }

    restoring = (async () => {

        try {

            const token = await getAuthToken();

            state.status = token
                ? 'authenticated'
                : 'guest';

        } catch {

            // Si falla el almacenamiento seguro,
            // no concedemos acceso privado.
            state.status = 'guest';
        }

        return isAuthenticated();

    })();

    try {

        return await restoring;

    } finally {

        restoring = null;
    }
}

// Extrae el token de la respuesta de la API.
function getTokenFromLoginResponse(
    response: unknown
): string | null {

    if (!response || typeof response !== 'object') {
        return null;
    }

    const data = response as Record<string, unknown>;

    const nested =
        data.data &&
        typeof data.data === 'object' &&
        !Array.isArray(data.data)
            ? data.data as Record<string, unknown>
            : {};

    const token =
        data.token ??
        data.access_token ??
        data.accessToken ??
        nested.token ??
        nested.access_token ??
        nested.accessToken;

    return typeof token === 'string' && token.trim()
        ? token
        : null;
}

// Iniciar sesión con las credenciales del usuario.
export async function login(
    identifier: string,
    password: string
): Promise<void> {

    if (!identifier.trim() || !password) {
        throw new Error('Debes ingresar usuario y contraseña.');
    }

    if (loginPending) {
        throw new Error('Ya se está iniciando sesión.');
    }

    loginPending = true;

    try {

        // El nombre del campo depende de la API real.
        const credentials = {
            [apiConfig.identifierField]: identifier.trim(),
            password
        };

        const response = await apiRequest<unknown>(
            apiConfig.loginPath,
            {
                method: 'POST',
                body: credentials,
                auth: false
            }
        );

        const token = getTokenFromLoginResponse(response);

        if (!token) {
            throw new ApiError(
                0,
                'El servidor no devolvió un token de autenticación válido.'
            );
        }

        // Solo se establece la sesión después
        // de almacenar correctamente el token.
        await saveAuthToken(token);

        state.status = 'authenticated';

    } finally {

        loginPending = false;
    }
}

// Cerrar la sesión.
export async function logout(): Promise<void> {

    // Invalidar el acceso inmediatamente.
    state.status = 'guest';

    try {

        await removeAuthToken();

    } finally {

        // El Integrante 1 conecta esta función al router.
        if (redirectToLogin) {
            await redirectToLogin();
        }
    }
}

// Manejo global del error 401.
setUnauthorizedHandler(logout);
