import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = Object.assign(vi.fn(() => 'toast-default'), {
  success: vi.fn(() => 'toast-success'),
  error: vi.fn(() => 'toast-error'),
  warning: vi.fn(() => 'toast-warning'),
  info: vi.fn(() => 'toast-info'),
  loading: vi.fn(() => 'toast-loading'),
  update: vi.fn(),
  dismiss: vi.fn(),
});

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expõe métodos de toast', async () => {
    const { notificationService } = await import('./notification.service');

    notificationService.success('OK');
    notificationService.error('Erro');
    notificationService.warning('Atenção');
    notificationService.loading('Aguarde', { toastId: 'task-1' });
    notificationService.updateWarning('task-1', 'Parcial');
    notificationService.dismiss('task-1');

    expect(toastMock).toHaveBeenCalledWith('OK', expect.objectContaining({ type: 'success' }));
    expect(toastMock).toHaveBeenCalledWith('Erro', expect.objectContaining({ type: 'error' }));
    expect(toastMock).toHaveBeenCalledWith('Atenção', expect.objectContaining({ type: 'warning' }));
    expect(toastMock.loading).toHaveBeenCalledWith(
      'Aguarde',
      expect.objectContaining({ toastId: 'task-1', autoClose: false }),
    );
    expect(toastMock.update).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ type: 'warning', isLoading: false }),
    );
    expect(toastMock.dismiss).toHaveBeenCalledWith('task-1');
  });
});
