
export const apiConfig = {

    // Dirección principal del backend Laravel.
    baseUrl: (
        import.meta.env.VITE_API_BASE_URL || '/api'
    ).replace(/\/+$/, ''),

    // Endpoints reales de autenticación.
    loginPath: '/login',

    userPath: '/user',

    logoutPath: '/logout'

} as const;
