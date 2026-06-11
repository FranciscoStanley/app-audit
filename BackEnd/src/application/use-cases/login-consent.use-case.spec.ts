import { BadRequestException } from '@nestjs/common';
import { LoginConsentUseCase } from './login-consent.use-case';
import { ConsentStore } from '../../infrastructure/auth/consent.store';

describe('LoginConsentUseCase', () => {
  let consents: jest.Mocked<Pick<ConsentStore, 'createCompleted'>>;
  let useCase: LoginConsentUseCase;

  beforeEach(() => {
    consents = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    useCase = new LoginConsentUseCase(consents as unknown as ConsentStore);
  });

  it('registra consentimento de login válido', async () => {
    await useCase.recordLoginConsent(
      'user-1',
      { termsAccepted: true, privacyAccepted: true },
      { ip: '127.0.0.1' },
    );
    expect(consents.createCompleted).toHaveBeenCalledWith(
      'email_login',
      'user-1',
      expect.objectContaining({ termsAccepted: true }),
      expect.any(Object),
    );
  });

  it('rejeita aceite incompleto', async () => {
    await expect(
      useCase.recordLoginConsent(
        'user-1',
        { termsAccepted: true, privacyAccepted: false },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
