import { BadRequestException, Injectable } from '@nestjs/common';
import { LEGAL_POLICY_VERSION } from '../../domain/constants/legal-policy.constants';
import {
  ConsentAcknowledgments,
  ConsentStore,
} from '../../infrastructure/auth/consent.store';

@Injectable()
export class LoginConsentUseCase {
  constructor(private readonly consents: ConsentStore) {}

  getLoginConsentInfo() {
    return {
      policyVersion: LEGAL_POLICY_VERSION,
      legalBasis:
        'Execução de contrato ou procedimentos preliminares (LGPD art. 7º, V) e consentimento para tratamentos adicionais descritos na Política de Privacidade.',
      purposes: [
        'Autenticação na plataforma App Audit',
        'Controle de acesso baseado em papéis (RBAC)',
        'Prestação do serviço de auditoria conforme credenciais fornecidas pela organização',
      ],
    };
  }

  getConsentRequiredStatus(required: boolean) {
    return {
      required,
      policyVersion: LEGAL_POLICY_VERSION,
    };
  }

  async recordLoginConsent(
    userId: string,
    acknowledgments: ConsentAcknowledgments,
    meta: { ip?: string; userAgent?: string },
  ): Promise<void> {
    if (!(await this.isConsentRequired(userId))) {
      return;
    }

    this.validateLoginAcknowledgments(acknowledgments);
    await this.consents.createCompleted(
      'email_login',
      userId,
      acknowledgments,
      meta,
    );
  }

  async isConsentRequired(userId: string): Promise<boolean> {
    const accepted = await this.consents.hasActiveConsent(userId, 'email_login');
    return !accepted;
  }

  private validateLoginAcknowledgments(ack: ConsentAcknowledgments): void {
    if (!ack.termsAccepted || !ack.privacyAccepted) {
      throw new BadRequestException(
        'É necessário aceitar o Termo de Uso e a Política de Privacidade.',
      );
    }
  }
}
