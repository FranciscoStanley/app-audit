import { describe, expect, it } from 'vitest';
import {
  completionMessageForTask,
  resolveTaskOutcomeFromJob,
} from './background-task-outcome';
import type { BackgroundTask } from '@/stores/background-tasks-store';

describe('background-task-outcome', () => {
  it('marca remediação parcial como warning', () => {
    expect(
      resolveTaskOutcomeFromJob({
        id: 'job-1',
        type: 'remediation_apply',
        status: 'completed',
        label: 'Remediação',
        createdAt: '',
        updatedAt: '',
        result: {
          success: false,
          message: 'Remediação parcial — 1 passo(s) falharam',
          appliedSteps: ['Fixar GitHub Action por SHA'],
        },
      }),
    ).toBe('warning');
  });

  it('marca remediação totalmente falha como error', () => {
    expect(
      resolveTaskOutcomeFromJob({
        id: 'job-2',
        type: 'remediation_apply',
        status: 'completed',
        label: 'Remediação',
        createdAt: '',
        updatedAt: '',
        result: {
          success: false,
          message: 'Falha total',
          appliedSteps: [],
        },
      }),
    ).toBe('error');
  });

  it('marca lote parcial como warning', () => {
    expect(
      resolveTaskOutcomeFromJob({
        id: 'job-3',
        type: 'remediation_apply_all',
        status: 'completed',
        label: 'Lote',
        createdAt: '',
        updatedAt: '',
        result: { succeeded: 16, failed: 45, total: 61 },
      }),
    ).toBe('warning');
  });

  it('extrai mensagem de tarefa em warning', () => {
    const task: BackgroundTask = {
      id: 't-1',
      type: 'remediation-single',
      label: 'Remediação da vulnerabilidade abc',
      status: 'warning',
      error: 'Remediação parcial — 1 passo(s) falharam',
      result: {
        remediationResult: {
          success: false,
          message: 'Remediação parcial — 1 passo(s) falharam',
          appliedSteps: ['Fixar GitHub Action por SHA'],
          requiresManualSteps: ['Entrega (commit/push): auth'],
        },
      },
      startedAt: '',
      completedAt: '',
    };

    expect(completionMessageForTask(task)).toBe(
      'Remediação parcial — 1 passo(s) falharam',
    );
  });
});
