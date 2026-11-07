
import { apiConfig } from '@/config/apiConfig';
import { getAuthToken } from '@/services/secureStorage';

export type ApiMethod =
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
    method?: ApiMethod;
    body?: unknown;
    headers?: HeadersInit;
    signal?: AbortSignal;
    auth?: boolean;
    skipUnauthorizedHandler?: boolean;
}

// Error personalizado para respuestas HTTP.
export class ApiError extends Error {

    constructor(
        public readonly status: number,
        message: string,
        public readonly data: unknown = null
    ) {
        super(message);
        this.name = 'ApiError';
    }

    // Errores de validación de Laravel (422).
    get fieldErrors(): Record<string, string[]> {

        const result: Record<string, string[]> = {};

        if (!this.data || typeof this.data !== 'object') {
            return result;
        }

        const errors =
            (this.data as Record<string, unknown>).errors;

        if (
            !errors ||
            typeof errors !== 'object' ||
            Array.isArray(errors)
        ) {
            return result;
        }

        for (const [field, value] of Object.entries(errors)) {

            if (Array.isArray(value)) {

                result[field] = value.filter(
                    (text): text is string =>
                        typeof text === 'string'
                );

            } else if (typeof value === 'string') {

                result[field] = [value];
            }
        }

        return result;
    }
}

// Función que ejecutará auth.ts cuando haya un 401.
let unauthorizedHandler:
    (() => Promise<void>) | null = null;

let unauthorizedPromise: Promise<void> | null = null;

export function setUnauthorizedHandler(
    handler: () => Promise<void>
): void {
    unauthorizedHandler = handler;
}

// Evitar procesar varias veces el mismo cierre de sesión.
async function notifyUnauthorized(): Promise<void> {

    if (!unauthorizedHandler) {
        return;
    }

    if (unauthorizedPromise) {
        return unauthorizedPromise;
    }

    const pending = Promise.resolve().then(
        () => unauthorizedHandler?.()
    );

    unauthorizedPromise = pending
        .then(() => undefined)
        .finally(() => {
            unauthorizedPromise = null;
        });

    return unauthorizedPromise;
}

// Construir la URL completa del endpoint.
function buildUrl(endpoint: string): string {

    if (
        !endpoint.startsWith('/') ||
        endpoint.startsWith('//') ||
        endpoint.includes('\\')
    ) {
        throw new Error('La ruta de la API no es válida.');
    }

    return `${apiConfig.baseUrl}${endpoint}`;
}

// Leer el contenido de la respuesta.
async function readBody(response: Response): Promise<unknown> {

    if (
        response.status === 204 ||
        response.status === 205
    ) {
        return null;
    }

    const text = await response.text();

    if (!text) {
        return null;
    }

    if (response.headers.get('content-type')?.includes('json')) {

        try {
            return JSON.parse(text) as unknown;
        } catch {
            throw new ApiError(
                response.status,
                'El servidor devolvió JSON no válido.'
            );
        }
    }

    return text;
}

// Mensajes generales de error.
function errorMessage(
    status: number,
    data: unknown
): string {

    if (data && typeof data === 'object') {

        const message =
            (data as Record<string, unknown>).message;

        if (typeof message === 'string' && message) {
            return message;
        }
    }

    switch (status) {

        case 401:
            return 'Sesión expirada o inválida.';

        case 403:
            return 'No tienes permisos para esta operación.';

        case 404:
            return 'No se encontró el recurso.';

        case 422:
            return 'Revisa los datos ingresados.';

        case 429:
            return 'Demasiados intentos. Intenta más tarde.';

        default:
            return status >= 500
                ? 'Error del servidor.'
                : `Error HTTP ${status}.`;
    }
}

// Función centralizada para todas las solicitudes.
export async function apiRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {

    const {
        method = 'GET',
        body,
        headers: extras,
        signal,
        auth = true,
        skipUnauthorizedHandler = false
    } = options;

    const headers = new Headers(extras);

    headers.set('Accept', 'application/json');

    // El token se administra exclusivamente aquí.
    headers.delete('Authorization');

    let requestBody: BodyInit | undefined;

    if (body !== undefined && body !== null) {

        if (body instanceof FormData) {

            requestBody = body;
            headers.delete('Content-Type');

        } else {

            requestBody = JSON.stringify(body);
            headers.set('Content-Type', 'application/json');
        }
    }

    let token: string | null = null;

    // Adjuntar token automáticamente.
    if (auth) {

        token = await getAuthToken();

        if (!token) {

            if (!skipUnauthorizedHandler) {
                await notifyUnauthorized();
            }

            throw new ApiError(
                401,
                'No hay una sesión válida.'
            );
        }

        headers.set(
            'Authorization',
            `Bearer ${token}`
        );
    }

    let response: Response;

    try {

        response = await fetch(buildUrl(endpoint), {
            method,
            headers,
            body: requestBody,
            signal
        });

    } catch (error) {

        if (
            error instanceof Error &&
            error.name === 'AbortError'
        ) {
            throw error;
        }

        throw new ApiError(
            0,
            'No hay conexión con el servidor.'
        );
    }

    // Si Laravel rechaza el token, invalidar sesión.
    if (
        response.status === 401 &&
        auth &&
        !skipUnauthorizedHandler
    ) {

        const currentToken = await getAuthToken();

        // No cerrar una sesión nueva por una petición vieja.
        if (
            currentToken === token ||
            currentToken === null
        ) {

            try {
                await notifyUnauthorized();
            } catch {
                // El error HTTP se informa igualmente.
            }
        }
    }

    const data = await readBody(response);

    if (!response.ok) {

        throw new ApiError(
            response.status,
            errorMessage(response.status, data),
            data
        );
    }

    return data as T;
}

// Métodos públicos para los demás integrantes.
export const api = {

    get<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {

        return apiRequest<T>(endpoint, {
            ...options,
            method: 'GET'
        });
    },

    post<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {

        return apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body
        });
    },

    put<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {

        return apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body
        });
    },

    patch<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {

        return apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body
        });
    },

    delete<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {

        return apiRequest<T>(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }
};
