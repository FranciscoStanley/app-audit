import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DATA_PROCESSING_PURPOSES,
  GITHUB_OAUTH_POLICY_VERSION,
  GITHUB_OAUTH_RETENTION_SUMMARY,
  GITHUB_OAUTH_SCOPES,
  GITHUB_OAUTH_THIRD_PARTIES,
} from '../../domain/constants/github-oauth-consent.constants';
import {
  DATA_SUBJECT_RIGHTS,
  DEFAULT_PRIVACY_CONTACT_EMAIL,
  LEGAL_INTERNATIONAL_TRANSFER,
  LEGAL_POLICY_VERSION,
} from '../../domain/constants/legal-policy.constants';
import {
  ConsentAcknowledgments,
  ConsentStore,
} from '../../infrastructure/auth/consent.store';
import { GitHubOAuthService } from '../../infrastructure/auth/github-oauth.service';

export interface AcceptGitHubConsentInput {
  acknowledgments: ConsentAcknowledgments;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class GitHubConsentUseCase {
  constructor(
    private readonly consents: ConsentStore,
    private readonly oauth: GitHubOAuthService,
    private readonly config: ConfigService,
  ) {}

  getConsentInfo() {
    return {
      policyVersion: GITHUB_OAUTH_POLICY_VERSION,
      controllerName: this.config.get('DATA_CONTROLLER_NAME') ?? 'App Audit',
      contactEmail:
        this.config.get('PRIVACY_CONTACT_EMAIL') ??
        DEFAULT_PRIVACY_CONTACT_EMAIL,
      controllerAddress: this.config.get('DATA_CONTROLLER_ADDRESS') ?? null,
      scopes: GITHUB_OAUTH_SCOPES,
      purposes: DATA_PROCESSING_PURPOSES,
      dataSubjectRights: DATA_SUBJECT_RIGHTS,
      retentionSummary: GITHUB_OAUTH_RETENTION_SUMMARY,
      thirdParties: GITHUB_OAUTH_THIRD_PARTIES,
      internationalTransfer: LEGAL_INTERNATIONAL_TRANSFER,
      legalBasis:
        'Consentimento do titular (LGPD art. 7º, I) para autenticação via GitHub, varreduras de segurança e tratamentos correlatos descritos nesta política.',
    };
  }

  getLegalInfo() {
    return {
      policyVersion: LEGAL_POLICY_VERSION,
      termsUrl: '/legal/termos',
      privacyUrl: '/legal/privacidade',
      controllerName: this.config.get('DATA_CONTROLLER_NAME') ?? 'App Audit',
      contactEmail:
        this.config.get('PRIVACY_CONTACT_EMAIL') ??
        DEFAULT_PRIVACY_CONTACT_EMAIL,
      dpoEmail: this.config.get('DPO_CONTACT_EMAIL') ?? null,
    };
  }

  async acceptConsent(input: AcceptGitHubConsentInput) {
    this.validateGitHubAcknowledgments(input.acknowledgments);

    const scopes = GITHUB_OAUTH_SCOPES.map((s) => s.scope);
    const record = await this.consents.createPending(
      'github_oauth',
      input.acknowledgments,
      scopes,
      {
        ip: input.ip,
        userAgent: input.userAgent,
      },
    );

    const authorizeUrl = this.oauth.buildAuthorizeUrl(record.id);
    return {
      consentId: record.id,
      policyVersion: record.policyVersion,
      authorizeUrl,
    };
  }

  async assertConsentForCallback(consentId: string): Promise<void> {
    const record = await this.consents.getById(consentId);
    if (
      !record ||
      record.status !== 'pending' ||
      record.kind !== 'github_oauth'
    ) {
      throw new BadRequestException(
        'Consentimento inválido ou expirado. Aceite novamente os termos antes de conectar o GitHub.',
      );
    }
  }

  async completeConsent(
    consentId: string,
    userId: string,
    githubId: string,
  ): Promise<void> {
    await this.consents.complete(consentId, userId, githubId);
  }

  async revokeConsentForUser(userId: string): Promise<void> {
    await this.consents.revokeByUser(userId, 'github_oauth');
  }

  private validateGitHubAcknowledgments(ack: ConsentAcknowledgments): void {
    const required: (keyof ConsentAcknowledgments)[] = [
      'termsAccepted',
      'privacyAccepted',
      'dataProcessingAccepted',
      'scopesAcknowledged',
    ];
    const missing = required.filter((k) => !ack[k]);
    if (missing.length > 0) {
      throw new BadRequestException(
        'É necessário aceitar todos os termos, política de privacidade, tratamento de dados e permissões GitHub.',
      );
    }
  }
}
