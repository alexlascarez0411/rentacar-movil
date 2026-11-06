
export const apiConfig = {

    // Dirección base de la API
    baseUrl: (
        import.meta.env.VITE_API_BASE_URL || '/api'
    ).replace(/\/+$/, ''),

    // Endpoint para iniciar sesión
    loginPath:
        import.meta.env.VITE_API_LOGIN_PATH || '/auth/login',

    // Campo utilizado para identificar al usuario
    identifierField:
        import.meta.env.VITE_API_LOGIN_FIELD === 'email'
            ? 'email'
            : 'username'

} as const;
