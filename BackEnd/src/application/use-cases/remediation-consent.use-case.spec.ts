import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RemediationConsentUseCase } from './remediation-consent.use-case';
import { ConsentStore } from '../../infrastructure/auth/consent.store';

describe('RemediationConsentUseCase', () => {
  let consents: jest.Mocked<
    Pick<ConsentStore, 'hasActiveConsent' | 'createCompleted'>
  >;
  let useCase: RemediationConsentUseCase;

  beforeEach(() => {
    consents = {
      hasActiveConsent: jest.fn(),
      createCompleted: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new RemediationConsentUseCase(
      consents as unknown as ConsentStore,
      { get: () => 'App Audit' } as never,
    );
  });

  it('retorna status com accepted false quando não há consentimento', async () => {
    consents.hasActiveConsent.mockResolvedValue(false);
    const status = await useCase.getConsentStatus('user-1');
    expect(status.accepted).toBe(false);
    expect(status.actions.length).toBeGreaterThan(0);
  });

  it('registra consentimento quando acknowledgments são válidos', async () => {
    const result = await useCase.acceptConsent(
      'user-1',
      {
        termsAccepted: true,
        privacyAccepted: true,
        dataProcessingAccepted: true,
        remediationAcknowledged: true,
        risksAcknowledged: true,
      },
      { ip: '127.0.0.1' },
    );
    expect(result.accepted).toBe(true);
    expect(consents.createCompleted).toHaveBeenCalledWith(
      'remediation',
      'user-1',
      expect.objectContaining({ remediationAcknowledged: true }),
      expect.any(Object),
    );
  });

  it('rejeita aceite incompleto', async () => {
    await expect(
      useCase.acceptConsent(
        'user-1',
        {
          termsAccepted: true,
          privacyAccepted: true,
          dataProcessingAccepted: true,
          remediationAcknowledged: false,
          risksAcknowledged: true,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloqueia remediação sem consentimento ativo', async () => {
    consents.hasActiveConsent.mockResolvedValue(false);
    await expect(
      useCase.assertRemediationConsent('user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
