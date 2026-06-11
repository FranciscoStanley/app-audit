import { Injectable } from '@nestjs/common';
import { ThreatFinding } from '../../domain/entities/repository-scan.entity';
import type { GitHubRepositoryInfo, GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import { ThreatIntelligenceStore } from '../threat-intel/threat-intelligence.store';
import { createFinding } from './finding.factory';

const SECRET_PATHS = [
  '.env',
  '.env.production',
  '.env.local',
  'credentials.json',
  'id_rsa',
  'id_rsa.pub',
  '.npmrc',
  'secrets.yml',
  'secrets.yaml',
];

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /glpat-[a-zA-Z0-9\-_]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
];

@Injectable()
export class AdditionalSecurityScanner {
  constructor(
    private readonly github: GitHubRepositoryPort,
    private readonly threatStore: ThreatIntelligenceStore,
  ) {}

  async scan(repo: GitHubRepositoryInfo): Promise<ThreatFinding[]> {
    const [owner, name] = repo.fullName.split('/');
    const findings: ThreatFinding[] = [];

    for (const path of SECRET_PATHS) {
      const exists = await this.github.searchFileInRepo(owner, name, path);
      if (exists) {
        findings.push(
          createFinding({
            type: 'exposed_secret',
            severity: path.includes('.env') ? 'critical' : 'high',
            message: `Arquivo sensível exposto no repositório: ${path}`,
            evidence: path,
            category: 'Secrets Exposure',
          }),
        );
      }
    }

    const workflows = await this.github.listWorkflowFiles(owner, name);
    for (const workflowPath of workflows) {
      const content = await this.github.getWorkflowContent(owner, name, workflowPath);
      if (!content) continue;

      if (/uses:\s*[\w-]+\/[\w-]+@v\d+/i.test(content) && !/@[a-f0-9]{40}/i.test(content)) {
        findings.push(
          createFinding({
            type: 'unpinned_action',
            severity: 'medium',
            message: 'GitHub Action referenciada por tag mutável (@v*) — risco de supply chain',
            evidence: workflowPath,
            category: 'CI/CD Security',
          }),
        );
      }

      for (const domain of this.threatStore.getC2Domains()) {
        if (content.includes(domain)) {
          findings.push(
            createFinding({
              type: 'c2_domain',
              severity: 'critical',
              message: `Domínio C2/suspeito em workflow: ${domain}`,
              evidence: workflowPath,
              category: 'Malware Indicators',
            }),
          );
        }
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          findings.push(
            createFinding({
              type: 'exposed_secret',
              severity: 'critical',
              message: 'Possível token/secret hardcoded em workflow',
              evidence: workflowPath,
              category: 'Secrets Exposure',
            }),
          );
        }
      }
    }

    const packageJson = await this.github.getPackageJson(owner, name);
    if (packageJson) {
      const deps = {
        ...((packageJson.dependencies as Record<string, string>) ?? {}),
        ...((packageJson.devDependencies as Record<string, string>) ?? {}),
      };
      for (const [dep, version] of Object.entries(deps)) {
        const hit = this.threatStore.isPackageCompromised(dep, 'npm');
        if (hit && hit.source === 'github_advisory') {
          findings.push(
            createFinding({
              type: 'malware_advisory',
              severity: hit.severity === 'critical' ? 'critical' : 'high',
              message: `[GHSA] Pacote com advisory de malware: ${dep}`,
              evidence: hit.ghsaId ?? dep,
              category: 'Dependency Vulnerabilities',
            }),
          );
        }
        if (/^\^?0\.|^~?0\./.test(version)) {
          findings.push(
            createFinding({
              type: 'vulnerable_dependency',
              severity: 'low',
              message: `Dependência em versão inicial instável: ${dep}@${version}`,
              evidence: `${dep}@${version}`,
              category: 'Dependency Hygiene',
            }),
          );
        }
      }
    }

    return findings;
  }
}
