import { describe, expect, it } from 'vitest';

import { apiConfig } from '@/config/apiConfig';

describe('Configuración base de la app móvil', () => {
  it('define las rutas de autenticación de la API', () => {
    expect(apiConfig.loginPath).toBe('/login');
    expect(apiConfig.userPath).toBe('/user');
    expect(apiConfig.logoutPath).toBe('/logout');
  });
});
