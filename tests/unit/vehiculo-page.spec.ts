import { flushPromises, mount } from '@vue/test-utils';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import { session } from '@/services/auth';
import VehiculoPage from '@/views/VehiculoPage.vue';

const { get, getStatus, addListener, remove, getAuthToken, logout } = vi.hoisted(() => ({
  get: vi.fn(),
  getStatus: vi.fn(),
  addListener: vi.fn(),
  remove: vi.fn(),
  getAuthToken: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('@capacitor/network', () => ({ Network: { getStatus, addListener } }));
vi.mock('@/services/secureStorage', () => ({ getAuthToken }));
vi.mock('@/services/auth', async () => {
  const { reactive } = await import('vue');
  const session = reactive({ user: { id: 1 } as { id: number } | null, status: 'authenticated' });
  return {
    session,
    isAuthenticated: () => session.status !== 'guest',
    hasRole: () => session.status === 'authenticated',
    logout,
  };
});
vi.mock('@/services/api', () => ({
  api: { get },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      mensaje: string,
    ) {
      super(mensaje);
    }
  },
}));

vi.mock('@ionic/vue', async (importOriginal) => {
  const ionic = await importOriginal<Record<string, unknown>>();
  const { onMounted } = await import('vue');
  return { ...ionic, onIonViewWillEnter: onMounted, onIonViewWillLeave: vi.fn() };
});

function pagina(actual: number, ids: number[], ultima = 2) {
  return {
    data: ids.map((id) => ({
      id,
      placa: `ABC${id}`,
      marca: 'Toyota',
      modelo: 'Yaris',
      anno: 2023,
      precio_diario: 20000,
      estado: 'Disponible',
    })),
    meta: { current_page: actual, last_page: ultima, total: ids.length },
  };
}

function montarListado() {
  return mount(VehiculoPage, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        IonPage: true,
        IonHeader: true,
        IonToolbar: true,
        IonTitle: true,
        IonContent: true,
        IonRefresher: true,
        IonRefresherContent: true,
        IonSpinner: true,
        IonList: true,
        IonItem: true,
        IonLabel: true,
        IonButton: true,
        IonButtons: true,
      },
    },
  });
}
function botonPorTexto(vista: ReturnType<typeof montarListado>, texto: string) {
  const boton = vista.findAllComponents({ name: 'IonButton' }).find((componente) => componente.text().includes(texto));
  if (!boton) throw new Error(`No se encontró el botón: ${texto}`);
  return boton;
}

describe('Listado de vehículos', () => {
  let cambiarConexion: (estado: { connected: boolean }) => void;

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    Object.assign(session, { user: { id: 1 }, status: 'authenticated' });
    getAuthToken.mockResolvedValue('sesion-de-prueba-a');
    getStatus.mockResolvedValue({ connected: true });
    addListener.mockImplementation((_evento, callback) => {
      cambiarConexion = callback;
      return Promise.resolve({ remove: remove.mockResolvedValue(undefined) });
    });
    vi.stubGlobal('crypto', {
      subtle: {
        digest: (_algoritmo: string, datos: Uint8Array) => Promise.resolve(createHash('sha256').update(datos).digest()),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('muestra los datos, enlaza al detalle y pagina sin duplicados', async () => {
    get.mockResolvedValueOnce(pagina(1, [1])).mockResolvedValueOnce(pagina(2, [1, 2, 2]));
    const vista = montarListado();
    await flushPromises();

    expect(vista.text()).toContain('Toyota Yaris');
    expect(vista.text()).toContain('Placa ABC1 · Año 2023');
    expect(vista.text()).toContain('Estado: Disponible');
    expect(vista.text()).toContain(
      new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(20000),
    );
    expect(vista.getComponent({ name: 'IonItem' }).props('routerLink')).toBe('/vehiculos/1');
    await botonPorTexto(vista, 'Cargar más').trigger('click');
    await flushPromises();

    expect(get.mock.calls.map(([ruta]) => ruta)).toEqual(['/vehiculos?page=1&limit=10', '/vehiculos?page=2&limit=10']);
    expect(vista.findAllComponents({ name: 'IonItem' })).toHaveLength(2);
    expect(vista.text()).not.toContain('Cargar más');
    vista.unmount();
  });

  it('conserva la lista y reintenta la página que falló', async () => {
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockRejectedValueOnce(new ApiError(500, 'Servidor no disponible'))
      .mockResolvedValueOnce(pagina(2, [2]));
    const vista = montarListado();
    await flushPromises();

    await botonPorTexto(vista, 'Cargar más').trigger('click');
    await flushPromises();
    expect(vista.get('[role="alert"]').text()).toContain('Servidor no disponible');
    expect(vista.text()).toContain('ABC1');

    await botonPorTexto(vista, 'Reintentar').trigger('click');
    await flushPromises();
    expect(get.mock.calls[2]?.[0]).toBe('/vehiculos?page=2&limit=10');
    expect(vista.text()).toContain('ABC2');
    vista.unmount();
  });

  it('conserva los datos si falla la recarga y muestra el vacío tras reintentar', async () => {
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockRejectedValueOnce(new ApiError(500, 'Falló la recarga'))
      .mockResolvedValueOnce(pagina(1, [], 1));
    const vista = montarListado();
    await flushPromises();

    const complete = vi.fn();
    vista.getComponent({ name: 'IonRefresher' }).vm.$emit('ionRefresh', { target: { complete } });
    await flushPromises();

    expect(complete).toHaveBeenCalledOnce();
    expect(vista.get('[role="alert"]').text()).toContain('Falló la recarga');
    expect(vista.text()).toContain('ABC1');
    await botonPorTexto(vista, 'Reintentar').trigger('click');
    await flushPromises();

    expect(get.mock.calls[2]?.[0]).toBe('/vehiculos?page=1&limit=10');
    expect(vista.text()).toContain('No hay vehículos disponibles');
    expect(vista.text()).not.toContain('ABC1');
    vista.unmount();
  });

  it('descarta una página que llega después de una recarga', async () => {
    let resolverPaginaAnterior!: (respuesta: ReturnType<typeof pagina>) => void;
    const paginaAnterior = new Promise<ReturnType<typeof pagina>>((resolve) => {
      resolverPaginaAnterior = resolve;
    });
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockReturnValueOnce(paginaAnterior)
      .mockResolvedValueOnce(pagina(1, [3], 1));
    const vista = montarListado();
    await flushPromises();

    await botonPorTexto(vista, 'Cargar más').trigger('click');
    const complete = vi.fn();
    vista.getComponent({ name: 'IonRefresher' }).vm.$emit('ionRefresh', { target: { complete } });
    await flushPromises();
    expect(get.mock.calls[1]?.[1].signal.aborted).toBe(true);
    expect(complete).toHaveBeenCalledOnce();

    resolverPaginaAnterior(pagina(2, [2]));
    await flushPromises();
    expect(vista.text()).toContain('ABC3');
    expect(vista.text()).not.toContain('ABC1');
    expect(vista.text()).not.toContain('ABC2');
    vista.unmount();
  });

  it('muestra caché al perder conexión y consulta una vez al recuperarla', async () => {
    get.mockResolvedValueOnce(pagina(1, [1])).mockResolvedValueOnce(pagina(1, [2]));
    const vista = montarListado();
    await flushPromises();

    cambiarConexion({ connected: false });
    await flushPromises();
    expect(vista.text()).toContain('Dispositivo sin conexión');
    expect(vista.text()).toContain('Información desactualizada');
    expect(vista.text()).toContain('Última actualización');
    expect(vista.text()).toContain('ABC1');
    expect(vista.text()).not.toContain('Cargar más');

    cambiarConexion({ connected: true });
    cambiarConexion({ connected: true });
    await flushPromises();
    expect(get).toHaveBeenCalledTimes(2);
    expect(vista.text()).toContain('ABC2');
    expect(vista.text()).not.toContain('desactualizada');
    vista.unmount();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('restaura sin usuario la caché de la sesión y aísla otra cuenta', async () => {
    get.mockResolvedValueOnce(pagina(1, [1]));
    const primeraVista = montarListado();
    await flushPromises();
    primeraVista.unmount();

    expect(JSON.stringify(localStorage)).not.toContain('sesion-de-prueba-a');
    Object.assign(session, { user: null, status: 'offline' });
    getStatus.mockResolvedValue({ connected: false });
    const vistaOffline = montarListado();
    await flushPromises();
    expect(vistaOffline.text()).toContain('ABC1');
    expect(get).toHaveBeenCalledOnce();

    getAuthToken.mockResolvedValue('sesion-de-prueba-b');
    Object.assign(session, { user: { id: 2 }, status: 'authenticated' });
    await flushPromises();
    expect(vistaOffline.text()).not.toContain('ABC1');
    expect(vistaOffline.text()).toContain('No hay información disponible sin conexión');
    expect(get).toHaveBeenCalledOnce();
    vistaOffline.unmount();
  });

  it('distingue Laravel inaccesible y descarta la caché cuando recibe 403', async () => {
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockRejectedValueOnce(new ApiError(0, 'Sin respuesta'))
      .mockRejectedValueOnce(new ApiError(403, 'Sin permisos'));
    const primeraVista = montarListado();
    await flushPromises();
    primeraVista.unmount();

    const vista = montarListado();
    await flushPromises();
    expect(vista.text()).toContain('El servidor Laravel no responde');
    expect(vista.text()).toContain('ABC1');
    expect(vista.text()).not.toContain('Dispositivo sin conexión');

    await botonPorTexto(vista, 'Reintentar').trigger('click');
    await flushPromises();
    expect(vista.get('[role="alert"]').text()).toContain('Sin permisos');
    expect(vista.text()).not.toContain('ABC1');
    expect(localStorage.length).toBe(0);
    vista.unmount();
  });

  it('borra solo la caché de la sesión que cierra, incluso al salir del listado', async () => {
    get.mockResolvedValueOnce(pagina(1, [1])).mockResolvedValueOnce(pagina(1, [2]));
    const primeraVista = montarListado();
    await flushPromises();
    primeraVista.unmount();
    const claveOtraCuenta = localStorage.key(0)!;
    const datosOtraCuenta = localStorage.getItem(claveOtraCuenta);

    getAuthToken.mockResolvedValue('sesion-de-prueba-b');
    Object.assign(session, { user: { id: 2 }, status: 'authenticated' });
    const segundaVista = montarListado();
    await flushPromises();
    segundaVista.unmount();
    expect(localStorage.length).toBe(2);

    getAuthToken.mockResolvedValue(null);
    Object.assign(session, { status: 'guest', user: null });

    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(claveOtraCuenta)).toBe(datosOtraCuenta);
  });

  it('conserva la caché al pasar a offline y la elimina al cerrar esa sesión', async () => {
    get.mockResolvedValueOnce(pagina(1, [1]));
    const vista = montarListado();
    await flushPromises();
    const clave = localStorage.key(0)!;
    const datos = localStorage.getItem(clave);

    Object.assign(session, { status: 'offline' });
    cambiarConexion({ connected: false });
    await flushPromises();

    expect(localStorage.getItem(clave)).toBe(datos);
    expect(vista.text()).toContain('ABC1');
    expect(vista.text()).toContain('Información desactualizada');

    getAuthToken.mockResolvedValue(null);
    Object.assign(session, { status: 'guest', user: null });
    await flushPromises();
    expect(localStorage.getItem(clave)).toBeNull();
    expect(vista.text()).not.toContain('ABC1');
    vista.unmount();
  });
});
