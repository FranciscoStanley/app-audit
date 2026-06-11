import { Injectable, NotFoundException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  RemediationPlan,
  RemediationResult,
  RemediationStep,
} from '../../domain/entities/remediation.entity';
import { ThreatFindingType } from '../../domain/entities/repository-scan.entity';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';

const execFileAsync = promisify(execFile);

@Injectable()
export class RemediationUseCase {
  constructor(private readonly auditStore: AuditReportStore) {}

  async preview(findingId: string): Promise<RemediationPlan> {
    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    const plan = this.buildPlan(finding.type, finding.repository, finding.evidence ?? '', findingId);
    return plan;
  }

  async apply(findingId: string): Promise<RemediationResult> {
    const finding = await this.auditStore.findFindingById(findingId);
    if (!finding) throw new NotFoundException('Vulnerabilidade não encontrada');

    const plan = this.buildPlan(finding.type, finding.repository, finding.evidence ?? '', findingId);
    const applied: string[] = [];
    const manual: string[] = [];

    for (const step of plan.steps) {
      if (step.automated && step.command) {
        try {
          await execFileAsync('gh', step.command.split(' ').filter(Boolean), {
            windowsHide: true,
            timeout: 30000,
          });
          applied.push(step.title);
        } catch (error) {
          manual.push(`${step.title}: ${(error as Error).message}`);
        }
      } else {
        manual.push(step.title);
      }
    }

    return {
      success: manual.length === 0,
      message: manual.length === 0 ? 'Remediação aplicada com sucesso' : 'Remediação parcial — revise passos manuais',
      appliedSteps: applied,
      requiresManualSteps: manual,
    };
  }

  private buildPlan(
    type: ThreatFindingType,
    repository: string,
    evidence: string,
    findingId: string,
  ): RemediationPlan {
    const [owner, repo] = repository.split('/');
    const steps: RemediationStep[] = [];

    switch (type) {
      case 'malicious_file':
      case 'malicious_pattern':
        steps.push({
          order: 1,
          title: 'Remover arquivo malicioso',
          description: `Excluir ${evidence} do repositório e rotacionar credenciais`,
          command: `api repos/${owner}/${repo}/contents/${evidence} -X DELETE -f message=security: remove malicious file`,
          automated: false,
        });
        steps.push({
          order: 2,
          title: 'Rotacionar tokens',
          description: 'Rotacione GitHub, npm, cloud e SSH keys após exposição',
          automated: false,
        });
        break;

      case 'exposed_secret':
        steps.push({
          order: 1,
          title: 'Remover secret do histórico',
          description: `Revogar credencial exposta e remover ${evidence}`,
          automated: false,
        });
        steps.push({
          order: 2,
          title: 'Adicionar ao .gitignore',
          description: `Garantir que ${evidence} está no .gitignore`,
          automated: false,
        });
        break;

      case 'unpinned_action':
      case 'compromised_action':
        steps.push({
          order: 1,
          title: 'Fixar GitHub Action por SHA',
          description: `Substituir tags @v* por commit SHA em ${evidence}`,
          automated: false,
        });
        break;

      case 'compromised_dependency':
      case 'malware_advisory':
      case 'vulnerable_dependency':
        steps.push({
          order: 1,
          title: 'Atualizar dependência',
          description: `Remover ou atualizar pacote vulnerável: ${evidence}`,
          command: undefined,
          automated: false,
        });
        steps.push({
          order: 2,
          title: 'Auditar lockfile',
          description: 'Execute npm audit / pip audit e regenere lockfile',
          automated: false,
        });
        break;

      case 'c2_domain':
        steps.push({
          order: 1,
          title: 'Remover referência a domínio C2',
          description: `Eliminar ${evidence} e investigar comprometimento`,
          automated: false,
        });
        break;

      default:
        steps.push({
          order: 1,
          title: 'Revisão manual',
          description: 'Analise o achado e aplique correção conforme política de segurança',
          automated: false,
        });
    }

    return {
      findingId,
      repository,
      action: this.mapAction(type),
      steps,
      canAutoApply: steps.some((s) => s.automated),
      estimatedImpact: ['malicious_file', 'exposed_secret', 'c2_domain'].includes(type) ? 'high' : 'medium',
    };
  }

  private mapAction(type: ThreatFindingType) {
    const map: Record<string, RemediationPlan['action']> = {
      malicious_file: 'remove_file',
      malicious_pattern: 'remove_file',
      exposed_secret: 'rotate_secret',
      unpinned_action: 'pin_github_action',
      compromised_action: 'pin_github_action',
      compromised_dependency: 'update_dependency',
      malware_advisory: 'update_dependency',
      vulnerable_dependency: 'update_dependency',
      c2_domain: 'remove_file',
    };
    return map[type] ?? 'manual_review';
  }
}
