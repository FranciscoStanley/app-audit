import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LEGAL_POLICY_VERSION,
  DEFAULT_PRIVACY_CONTACT_EMAIL,
} from '../../domain/constants/legal-policy.constants';
import {
  REMEDIATION_ACTIONS,
  REMEDIATION_CONSENT_POLICY_VERSION,
  REMEDIATION_LEGAL_BASIS,
  REMEDIATION_RISKS,
} from '../../domain/constants/remediation-consent.constants';
import {
  ConsentAcknowledgments,
  ConsentStore,
} from '../../infrastructure/auth/consent.store';

@Injectable()
export class RemediationConsentUseCase {
  constructor(
    private readonly consents: ConsentStore,
    private readonly config: ConfigService,
  ) {}

  async getConsentStatus(userId: string) {
    const accepted = await this.consents.hasActiveConsent(
      userId,
      'remediation',
    );
    return {
      policyVersion: REMEDIATION_CONSENT_POLICY_VERSION,
      controllerName:
        this.config.get<string>('DATA_CONTROLLER_NAME') ?? 'App Audit',
      contactEmail:
        this.config.get<string>('PRIVACY_CONTACT_EMAIL') ??
        DEFAULT_PRIVACY_CONTACT_EMAIL,
      actions: REMEDIATION_ACTIONS,
      risks: REMEDIATION_RISKS,
      legalBasis: REMEDIATION_LEGAL_BASIS,
      accepted,
    };
  }

  async acceptConsent(
    userId: string,
    acknowledgments: ConsentAcknowledgments,
    meta: { ip?: string; userAgent?: string },
  ) {
    this.validateRemediationAcknowledgments(acknowledgments);
    await this.consents.createCompleted(
      'remediation',
      userId,
      acknowledgments,
      meta,
    );
    return { accepted: true, policyVersion: LEGAL_POLICY_VERSION };
  }

  async assertRemediationConsent(userId: string): Promise<void> {
    const accepted = await this.consents.hasActiveConsent(
      userId,
      'remediation',
    );
    if (!accepted) {
      throw new ForbiddenException(
        'Consentimento de remediação automática necessário. Aceite os termos específicos antes de aplicar correções.',
      );
    }
  }

  private validateRemediationAcknowledgments(
    ack: ConsentAcknowledgments,
  ): void {
    const required: (keyof ConsentAcknowledgments)[] = [
      'termsAccepted',
      'privacyAccepted',
      'remediationAcknowledged',
      'risksAcknowledged',
    ];
    const missing = required.filter((k) => !ack[k]);
    if (missing.length > 0) {
      throw new BadRequestException(
        'É necessário aceitar os termos, política de privacidade, autorização de remediação e ciência dos riscos.',
      );
    }
  }
}
