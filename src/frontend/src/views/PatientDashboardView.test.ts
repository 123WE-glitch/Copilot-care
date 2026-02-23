import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { defineComponent } from 'vue';
import PatientDashboardView from './PatientDashboardView.vue';

const repositoryMocks = vi.hoisted(() => ({
  fetchPatientRecord: vi.fn(),
}));

const chartMocks = vi.hoisted(() => {
  const setOption = vi.fn();
  const resize = vi.fn();
  const dispose = vi.fn();

  return {
    setOption,
    resize,
    dispose,
    init: vi.fn(() => ({
      setOption,
      resize,
      dispose,
    })),
    use: vi.fn(),
  };
});

vi.mock('../features/patient/repository', () => ({
  createPatientDashboardRepository: vi.fn(() => ({
    fetchPatientRecord: repositoryMocks.fetchPatientRecord,
  })),
}));

vi.mock('echarts/core', () => ({
  init: chartMocks.init,
  use: chartMocks.use,
}));

vi.mock('echarts/charts', () => ({
  LineChart: {},
}));

vi.mock('echarts/components', () => ({
  GridComponent: {},
  LegendComponent: {},
  TooltipComponent: {},
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}));

function createRecord() {
  return {
    patient: {
      patientId: 'patient-777',
      name: 'Patient 777',
      sex: 'male',
      age: 48,
      chiefComplaint: 'Headache with fluctuating blood pressure.',
      chronicDiseases: ['Hypertension'],
      medicationHistory: ['Amlodipine'],
      lifestyleTags: ['Sedentary'],
    },
    insights: ['Risk remains moderate.'],
    observationBundle: {
      resourceType: 'Bundle' as const,
      type: 'searchset',
      total: 2,
      entry: [
        {
          resource: {
            resourceType: 'Observation' as const,
            id: 'obs-1',
            status: 'final',
            code: { text: 'Systolic blood pressure' },
            effectiveDateTime: '2026-02-01T08:00:00.000Z',
            valueQuantity: { value: 134 },
          },
        },
        {
          resource: {
            resourceType: 'Observation' as const,
            id: 'obs-2',
            status: 'final',
            code: { text: 'Diastolic blood pressure' },
            effectiveDateTime: '2026-02-01T08:00:00.000Z',
            valueQuantity: { value: 86 },
          },
        },
      ],
    },
    fallbackVitals: [
      {
        timestamp: '2026-02-01T08:00:00.000Z',
        systolicBP: 134,
        diastolicBP: 86,
      },
    ],
    consultationHistory: [
      {
        id: 'consult-1',
        date: '2026-02-01T08:00:00.000Z',
        conclusion: 'Continue monitoring and follow-up in one week.',
        department: 'Cardiology',
        status: 'OUTPUT' as const,
        triageLevel: 'medium' as const,
      },
    ],
  };
}

async function mountView(routePath: string = '/patient/patient-777') {
  const routes = [
    {
      path: '/',
      component: defineComponent({
        template: '<div>consultation</div>',
      }),
    },
    {
      path: '/patient/:id?',
      component: PatientDashboardView,
    },
  ];

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  await router.push(routePath);
  await router.isReady();

  const wrapper = mount(PatientDashboardView, {
    global: {
      plugins: [router],
    },
  });

  await flushPromises();

  return { wrapper, router };
}

describe('PatientDashboardView interactions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositoryMocks.fetchPatientRecord.mockResolvedValue(createRecord());
  });

  it('navigates to consultation with patientId from route', async () => {
    const { wrapper, router } = await mountView('/patient/patient-777');
    const pushSpy = vi.spyOn(router, 'push');

    await wrapper.find('.page-hero .primary-btn').trigger('click');

    expect(pushSpy).toHaveBeenCalledWith({
      path: '/',
      query: { patientId: 'patient-777' },
    });
  });

  it('opens consultation detail navigation from history item', async () => {
    const { wrapper, router } = await mountView('/patient/patient-777');
    const pushSpy = vi.spyOn(router, 'push');

    await wrapper.find('.history-item').trigger('click');

    expect(pushSpy).toHaveBeenCalledWith({
      path: '/',
      query: {
        patientId: 'patient-777',
        consultationId: 'consult-1',
      },
    });
  });

  it('falls back to a successful snapshot when initial fetch fails', async () => {
    repositoryMocks.fetchPatientRecord
      .mockRejectedValueOnce(new Error('gateway timeout'))
      .mockResolvedValueOnce(createRecord());

    const { wrapper } = await mountView('/patient/patient-777');

    expect(repositoryMocks.fetchPatientRecord.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.text()).toContain('Patient 777');
    expect(wrapper.find('.history-item').exists()).toBe(true);
  });
});
