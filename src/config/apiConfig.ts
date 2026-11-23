const configuredBaseUrl = (
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    (import.meta.env.MODE === 'test' ? 'http://127.0.0.1/api' : '')
);

if (!configuredBaseUrl) {
    throw new Error('Falta VITE_API_BASE_URL para este entorno.');
}

if (import.meta.env.PROD && !configuredBaseUrl.startsWith('https://')) {
    throw new Error('La aplicación de producción requiere una API HTTPS.');
}

export const apiConfig = {
    // Dirección principal del backend Laravel.
    baseUrl: configuredBaseUrl.replace(/\/+$/, ''),

    // Endpoints reales de autenticación.
    loginPath: '/login',
    userPath: '/user',
    logoutPath: '/logout'
} as const;
