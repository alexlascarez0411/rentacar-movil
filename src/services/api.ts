
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
}

// Error personalizado para las solicitudes HTTP.
export class ApiError extends Error {

    constructor(
        public readonly status: number,
        message: string,
        public readonly data: unknown = null
    ) {
        super(message);
        this.name = 'ApiError';
    }

    // Obtiene los errores de validación por campo (422).
    get fieldErrors(): Record<string, string[]> {

        const result: Record<string, string[]> = {};

        if (!this.data || typeof this.data !== 'object') {
            return result;
        }

        const response = this.data as Record<string, unknown>;
        const errors = response.errors;

        if (!errors || typeof errors !== 'object') {
            return result;
        }

        for (const [field, value] of Object.entries(errors)) {

            if (Array.isArray(value)) {
                result[field] = value.filter(
                    (item): item is string =>
                        typeof item === 'string'
                );
            } else if (typeof value === 'string') {
                result[field] = [value];
            }
        }

        return result;
    }
}

// Mensajes de error según el código HTTP.
function getErrorMessage(
    status: number,
    data: unknown
): string {

    if (data && typeof data === 'object') {

        const response = data as Record<string, unknown>;

        if (typeof response.message === 'string') {
            return response.message;
        }
    }

    switch (status) {
        case 401:
            return 'La sesión ha expirado o las credenciales son incorrectas.';

        case 403:
            return 'No tienes permiso para realizar esta operación.';

        case 404:
            return 'No se encontró el recurso solicitado.';

        case 422:
            return 'Verifica los datos ingresados.';

        default:
            return status >= 500
                ? 'Ocurrió un error en el servidor.'
                : `Error en la solicitud (${status}).`;
    }
}

// Permite que auth.ts gestione el cierre de sesión
// sin importar directamente el router.
let unauthorizedHandler: (() => Promise<void>) | null = null;
let unauthorizedPromise: Promise<void> | null = null;

export function setUnauthorizedHandler(
    handler: () => Promise<void>
): void {
    unauthorizedHandler = handler;
}

async function handleUnauthorized(): Promise<void> {

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

// Solo permite rutas relativas a la API configurada.
function buildUrl(endpoint: string): string {

    if (
        !endpoint.startsWith('/') ||
        endpoint.startsWith('//') ||
        endpoint.includes('\\')
    ) {
        throw new Error('La ruta de API no es válida.');
    }

    return `${apiConfig.baseUrl}${endpoint}`;
}

// Convierte la respuesta a JSON o texto.
async function readResponse(
    response: Response
): Promise<unknown> {

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    const contentType =
        response.headers.get('content-type') || '';

    if (
        contentType.includes('application/json') ||
        contentType.includes('+json')
    ) {
        return response.json();
    }

    const text = await response.text();

    return text || null;
}

// Punto único de comunicación con la API.
export async function apiRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {

    const {
        method = 'GET',
        body,
        headers: extraHeaders,
        signal,
        auth = true
    } = options;

    const headers = new Headers(extraHeaders);

    headers.set('Accept', 'application/json');

    let requestBody: BodyInit | undefined;

    if (body !== undefined && body !== null) {

        if (body instanceof FormData) {

            requestBody = body;

        } else {

            requestBody = JSON.stringify(body);
            headers.set('Content-Type', 'application/json');

        }
    }

    // Evita que otra pantalla agregue un token manual.
    headers.delete('Authorization');

    // Intercepción automática del token.
    if (auth) {

        const token = await getAuthToken();

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
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
            'No se pudo conectar con el servidor. Revisa la conexión.'
        );
    }

    // Se gestiona el 401 antes de leer el cuerpo:
    // incluso si el JSON viene incorrecto, se cierra sesión.
    if (response.status === 401 && auth) {

        try {
            await handleUnauthorized();
        } catch {
            // El error HTTP original se informa igualmente.
        }
    }

    let data: unknown;

    try {

        data = await readResponse(response);

    } catch {

        throw new ApiError(
            response.status,
            'El servidor devolvió una respuesta no válida.'
        );
    }

    if (!response.ok) {

        throw new ApiError(
            response.status,
            getErrorMessage(response.status, data),
            data
        );
    }

    return data as T;
}

// Métodos reutilizables para todas las pantallas.
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

