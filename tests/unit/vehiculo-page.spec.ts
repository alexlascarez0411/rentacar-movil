import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import VehiculoPage from '@/views/VehiculoPage.vue';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ api: { get }, ApiError: Error }));

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
      },
    },
  });
}

describe('Listado de vehículos', () => {
  beforeEach(() => get.mockReset());

  it('muestra los datos, enlaza al detalle y pagina sin duplicados', async () => {
    get.mockResolvedValueOnce(pagina(1, [1])).mockResolvedValueOnce(pagina(2, [1, 2, 2]));
    const vista = montarListado();
    await nextTick();
    expect(vista.get('[role="status"]').text()).toContain('Cargando vehículos');
    await flushPromises();

    expect(vista.text()).toContain('Toyota Yaris');
    expect(vista.text()).toContain('Placa ABC1 · Año 2023');
    expect(vista.text()).toContain('Estado: Disponible');
    expect(vista.text()).toContain(
      new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(20000),
    );
    expect(vista.getComponent({ name: 'IonItem' }).props('routerLink')).toBe('/vehiculos/1');
    await vista.getComponent({ name: 'IonButton' }).trigger('click');
    await flushPromises();

    expect(get.mock.calls.map(([ruta]) => ruta)).toEqual(['/vehiculos?page=1&limit=10', '/vehiculos?page=2&limit=10']);
    expect(vista.findAllComponents({ name: 'IonItem' })).toHaveLength(2);
    expect(vista.text()).not.toContain('Cargar más');
    vista.unmount();
  });

  it('conserva la lista y reintenta la página que falló', async () => {
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockRejectedValueOnce(new Error('Servidor no disponible'))
      .mockResolvedValueOnce(pagina(2, [2]));
    const vista = montarListado();
    await flushPromises();

    await vista.getComponent({ name: 'IonButton' }).trigger('click');
    await flushPromises();
    expect(vista.get('[role="alert"]').text()).toContain('Servidor no disponible');
    expect(vista.text()).toContain('ABC1');

    await vista.getComponent({ name: 'IonButton' }).trigger('click');
    await flushPromises();
    expect(get.mock.calls[2]?.[0]).toBe('/vehiculos?page=2&limit=10');
    expect(vista.text()).toContain('ABC2');
    vista.unmount();
  });

  it('conserva los datos si falla la recarga y muestra el vacío tras reintentar', async () => {
    get
      .mockResolvedValueOnce(pagina(1, [1]))
      .mockRejectedValueOnce(new Error('Falló la recarga'))
      .mockResolvedValueOnce(pagina(1, [], 1));
    const vista = montarListado();
    await flushPromises();

    const complete = vi.fn();
    vista.getComponent({ name: 'IonRefresher' }).vm.$emit('ionRefresh', { target: { complete } });
    await flushPromises();

    expect(complete).toHaveBeenCalledOnce();
    expect(vista.get('[role="alert"]').text()).toContain('Falló la recarga');
    expect(vista.text()).toContain('ABC1');
    await vista.getComponent({ name: 'IonButton' }).trigger('click');
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

    await vista.getComponent({ name: 'IonButton' }).trigger('click');
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
});
