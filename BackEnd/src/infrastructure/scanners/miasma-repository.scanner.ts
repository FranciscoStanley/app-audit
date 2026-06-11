import { Injectable } from '@nestjs/common';
import { RepositoryScan, ThreatFinding } from '../../domain/entities/repository-scan.entity';
import type { GitHubRepositoryInfo, GitHubRepositoryPort } from '../../domain/ports/github-repository.port';
import type { OpenSourceMalwarePort } from '../../domain/ports/threat-intelligence.port';
import { ThreatIntelligenceStore } from '../threat-intel/threat-intelligence.store';
import { createFinding } from './finding.factory';

@Injectable()
export class MiasmaRepositoryScanner {
  constructor(
    private readonly github: GitHubRepositoryPort,
    private readonly threatStore: ThreatIntelligenceStore,
    private readonly osm: OpenSourceMalwarePort,
  ) {}

  async scan(repo: GitHubRepositoryInfo): Promise<RepositoryScan> {
    const [owner, name] = repo.fullName.split('/');
    const findings: ThreatFinding[] = [
      ...this.checkAffectedRepository(repo),
      ...(await this.scanMaliciousFiles(owner, name)),
      ...(await this.scanDependencies(owner, name)),
      ...(await this.scanWorkflows(owner, name)),
      ...(await this.checkRepositoryViaOsm(repo.url)),
    ];

    return {
      name: repo.name,
      fullName: repo.fullName,
      isPrivate: repo.isPrivate,
      url: repo.url,
      language: repo.language,
      topics: repo.topics,
      updatedAt: repo.updatedAt,
      findings,
      isAffected: findings.some((f) => f.severity === 'critical' || f.severity === 'high'),
      vulnerabilityCount: findings.length,
    };
  }

  private checkAffectedRepository(repo: GitHubRepositoryInfo): ThreatFinding[] {
    const hit = this.threatStore.isRepositoryCompromised(repo.fullName);
    if (!hit) return [];
    return [
      createFinding({
        type: 'cloned_affected_repo',
        severity: hit.severity === 'critical' ? 'critical' : 'high',
        message: `Repositório listado como afetado (${hit.source}): ${hit.fullName}`,
        evidence: hit.summary ?? hit.fullName,
        category: 'Supply Chain',
      }),
    ];
  }

  private async scanMaliciousFiles(owner: string, name: string): Promise<ThreatFinding[]> {
    const findings: ThreatFinding[] = [];
    for (const indicator of this.threatStore.getMaliciousFiles()) {
      const exists = await this.github.searchFileInRepo(owner, name, indicator.path);
      if (!exists) continue;
      findings.push(
        createFinding({
          type: 'malicious_file',
          severity: 'critical',
          message: `Arquivo malicioso detectado: ${indicator.path}`,
          evidence: indicator.path,
          category: 'Malware Indicators',
        }),
      );
      const content = await this.github.getFileContent(owner, name, indicator.path);
      if (content?.content) {
        for (const rule of this.threatStore.getMaliciousPatterns()) {
          if (indicator.path.endsWith(rule.file.split('/').pop()!) && rule.pattern.test(content.content)) {
            findings.push(
              createFinding({
                type: 'malicious_pattern',
                severity: 'critical',
                message: rule.description,
                evidence: indicator.path,
                category: 'Malware Indicators',
              }),
            );
          }
        }
      }
    }
    return findings;
  }

  private async scanDependencies(owner: string, repo: string): Promise<ThreatFinding[]> {
    const findings: ThreatFinding[] = [];
    const packageJson = await this.github.getPackageJson(owner, repo);
    if (packageJson) {
      const allDeps = {
        ...((packageJson.dependencies as Record<string, string>) ?? {}),
        ...((packageJson.devDependencies as Record<string, string>) ?? {}),
      };
      for (const [dep, versionRange] of Object.entries(allDeps)) {
        const localHit = this.threatStore.isPackageCompromised(dep, 'npm');
        if (localHit) {
          findings.push(
            createFinding({
              type: 'compromised_dependency',
              severity: localHit.severity === 'critical' ? 'critical' : 'high',
              message: `[${localHit.source}] Dependência npm comprometida: ${dep}`,
              evidence: localHit.ghsaId ?? localHit.referenceUrl ?? dep,
              category: 'Dependency Vulnerabilities',
            }),
          );
        }
        for (const scope of this.threatStore.getCompromisedNpmScopes()) {
          if (dep.startsWith(`${scope}/`)) {
            findings.push(
              createFinding({
                type: 'compromised_dependency',
                severity: 'high',
                message: `Pacote em escopo npm monitorado: ${dep}`,
                evidence: scope,
                category: 'Dependency Vulnerabilities',
              }),
            );
          }
        }
        const osmHit = await this.safeOsmCheck({ reportType: 'package', resourceIdentifier: dep, ecosystem: 'npm', version: this.extractVersion(versionRange) });
        if (osmHit?.malicious) {
          findings.push(
            createFinding({
              type: 'compromised_dependency',
              severity: 'critical',
              message: `[OpenSourceMalware] Pacote npm malicioso: ${dep}`,
              evidence: osmHit.osmUrl ?? dep,
              category: 'Dependency Vulnerabilities',
            }),
          );
        }
      }
    }
    const requirements = await this.github.getRequirementsTxt(owner, repo);
    if (requirements) {
      for (const { name: pkgName, version } of this.parsePythonDeps(requirements)) {
        const localHit = this.threatStore.isPackageCompromised(pkgName, 'pip', version);
        if (localHit) {
          findings.push(
            createFinding({
              type: 'compromised_dependency',
              severity: 'critical',
              message: `[${localHit.source}] Pacote PyPI comprometido: ${pkgName}${version ? `@${version}` : ''}`,
              evidence: localHit.versionRange ?? pkgName,
              category: 'Dependency Vulnerabilities',
            }),
          );
        }
      }
    }
    return findings;
  }

  private async scanWorkflows(owner: string, repo: string): Promise<ThreatFinding[]> {
    const findings: ThreatFinding[] = [];
    for (const workflowPath of await this.github.listWorkflowFiles(owner, repo)) {
      const content = await this.github.getWorkflowContent(owner, repo, workflowPath);
      if (!content) continue;
      for (const action of this.threatStore.getCompromisedActions()) {
        if (content.includes(action)) {
          findings.push(
            createFinding({
              type: 'compromised_action',
              severity: 'high',
              message: `Workflow referencia GitHub Action monitorada: ${action}`,
              evidence: workflowPath,
              category: 'CI/CD Security',
            }),
          );
        }
      }
      for (const domain of this.threatStore.getC2Domains()) {
        if (content.includes(domain)) {
          findings.push(
            createFinding({
              type: 'c2_domain',
              severity: 'critical',
              message: `Domínio C2 detectado em workflow: ${domain}`,
              evidence: workflowPath,
              category: 'Malware Indicators',
            }),
          );
        }
      }
    }
    return findings;
  }

  private async checkRepositoryViaOsm(url: string): Promise<ThreatFinding[]> {
    const osmHit = await this.safeOsmCheck({ reportType: 'repository', resourceIdentifier: url });
    if (!osmHit?.malicious) return [];
    return [
      createFinding({
        type: 'cloned_affected_repo',
        severity: 'critical',
        message: '[OpenSourceMalware] Repositório marcado como malicioso',
        evidence: osmHit.osmUrl ?? url,
        category: 'Supply Chain',
      }),
    ];
  }

  private async safeOsmCheck(params: Parameters<OpenSourceMalwarePort['checkMalicious']>[0]) {
    try {
      return await this.osm.checkMalicious(params);
    } catch {
      return null;
    }
  }

  private extractVersion(range: string): string | undefined {
    return range.match(/(\d+\.\d+\.\d+)/)?.[1];
  }

  private parsePythonDeps(content: string): Array<{ name: string; version?: string }> {
    const deps: Array<{ name: string; version?: string }> = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*[=<>!~]+\s*([0-9.]+)/);
      if (match) deps.push({ name: match[1], version: match[2] });
      else if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) deps.push({ name: trimmed });
    }
    return deps;
  }
}
