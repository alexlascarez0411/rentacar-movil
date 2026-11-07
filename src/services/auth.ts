
import { reactive, readonly } from 'vue';

import { apiConfig } from '@/config/apiConfig';
import {
    api,
    ApiError,
    setUnauthorizedHandler
} from '@/services/api';
import {
    getAuthToken,
    hasUnexpiredToken,
    removeAuthToken,
    saveAuthToken
} from '@/services/secureStorage';

// Posibles estados de la sesión.
export type SessionStatus =
    'checking' | 'authenticated' | 'offline' | 'guest';

// Usuario devuelto por GET /api/user.
export interface AuthUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

interface SessionState {
    status: SessionStatus;
    user: AuthUser | null;
}

// Estado reactivo de autenticación.
const state = reactive<SessionState>({
    status: 'checking',
    user: null
});

export const session = readonly(state);

let restoring: Promise<boolean> | null = null;
let loginPending = false;

// El router registrará aquí su redirección.
let redirectToLogin:
    (() => Promise<unknown>) | null = null;

export function setLoginRedirect(
    callback: () => Promise<unknown>
): void {

    redirectToLogin = callback;
}

// Indica si existe una sesión reconocida.
// En modo offline solo debe consultarse información en caché.
export function isAuthenticated(): boolean {

    return (
        state.status === 'authenticated' ||
        state.status === 'offline'
    ) && hasUnexpiredToken();
}

// Consultar los permisos del usuario.
export function hasRole(role: string): boolean {

    return state.status === 'authenticated' &&
        (state.user?.roles.includes(role) ?? false);
}

// Comprobar nuevamente la sesión cuando regrese internet.
export async function revalidateSession(): Promise<boolean> {

    if (!isAuthenticated()) {
        return false;
    }

    try {

        state.user = await getAuthenticatedUser();
        state.status = 'authenticated';

        return true;

    } catch (error) {

        if (error instanceof ApiError && error.status === 0) {

            state.status = 'offline';
            return true;
        }

        if (error instanceof ApiError && error.status === 401) {
            return false;
        }

        throw error;
    }
}

// Consultar y validar el usuario real de Laravel.
async function getAuthenticatedUser(): Promise<AuthUser> {

    const response = await api.get<{ data: AuthUser }>(
        apiConfig.userPath
    );

    const user = response?.data;

    if (
        !user ||
        typeof user.id !== 'number' ||
        typeof user.email !== 'string' ||
        typeof user.name !== 'string' ||
        !Array.isArray(user.roles) ||
        !user.roles.every(
            (role) => typeof role === 'string'
        )
    ) {

        throw new Error(
            'La API devolvió un usuario con formato inesperado.'
        );
    }

    return user;
}

// Invalidar la sesión local.
async function clearLocalSession(): Promise<void> {

    const checking = state.status === 'checking';

    state.status = 'guest';
    state.user = null;

    try {

        await removeAuthToken();

    } finally {

        // Durante el arranque, el guardián
        // de rutas administra la redirección.
        if (!checking && redirectToLogin) {
            await redirectToLogin();
        }
    }
}

// Ante 401, eliminar el token local.
// No llamar /logout porque el token ya fue rechazado.
setUnauthorizedHandler(clearLocalSession);

// Recuperar sesión al abrir la aplicación.
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

            if (!token) {

                state.status = 'guest';
                return false;
            }

            try {

                // Verificar token contra el servidor.
                state.user = await getAuthenticatedUser();

                state.status = 'authenticated';

                return true;

            } catch (error) {

                // Sin internet: permitir modo caché
                // únicamente mientras el token local siga vigente.
                if (
                    error instanceof ApiError &&
                    error.status === 0
                ) {

                    state.user = null;
                    state.status = 'offline';

                    return true;
                }

                state.status = 'guest';
                return false;
            }

        } catch {

            state.status = 'guest';
            return false;
        }

    })();

    try {

        return await restoring;

    } finally {

        restoring = null;
    }
}

// Iniciar sesión en Laravel.
export async function login(
    email: string,
    password: string
): Promise<void> {

    if (!email.trim() || !password) {

        throw new Error(
            'Ingresa correo y contraseña.'
        );
    }

    if (loginPending) {

        throw new Error(
            'Ya se está iniciando sesión.'
        );
    }

    loginPending = true;

    const startedAt = Date.now();

    try {

        // POST /api/login
        const response = await api.post<{ token: string }>(
            apiConfig.loginPath,
            {
                email: email.trim(),
                password
            },
            {
                auth: false
            }
        );

        // Validar respuesta de Laravel Sanctum.
        if (
            !response ||
            typeof response.token !== 'string' ||
            !response.token.trim()
        ) {

            throw new Error(
                'La API no devolvió un token válido.'
            );
        }

        // Guardar el token de forma segura.
        await saveAuthToken(
            response.token,
            startedAt
        );

        try {

            // GET /api/user
            // Obtener información y roles del usuario.
            state.user = await getAuthenticatedUser();

            state.status = 'authenticated';

        } catch (error) {

            // No dejar una sesión incompleta.
            await clearLocalSession();

            throw error;
        }

    } finally {

        loginPending = false;
    }
}

// Resultado del cierre de sesión.
export interface LogoutResult {
    serverRevoked: boolean;
}

// Cerrar sesión en Laravel y Android.
export async function logout(): Promise<LogoutResult> {

    let serverRevoked = false;

    try {

        // POST /api/logout
        // Revocar el token actual en Laravel.
        await api.post(
            apiConfig.logoutPath,
            undefined,
            {
                skipUnauthorizedHandler: true
            }
        );

        serverRevoked = true;

    } catch (error) {

        // Un token rechazado con 401
        // ya no es válido para el servidor.
        if (
            error instanceof ApiError &&
            error.status === 401
        ) {
            serverRevoked = true;
        }

    } finally {

        // Eliminar la sesión local incluso
        // si el servidor está desconectado.
        await clearLocalSession();
    }

    return { serverRevoked };
}
