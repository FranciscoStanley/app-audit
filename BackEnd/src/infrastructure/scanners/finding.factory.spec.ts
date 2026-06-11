import { createFinding } from './finding.factory';

describe('createFinding', () => {
  it('creates finding with id and remediation flag', () => {
    const f = createFinding({
      type: 'malicious_file',
      severity: 'critical',
      message: 'test',
      category: 'Malware',
    });
    expect(f.id).toBeDefined();
    expect(f.remediationAvailable).toBe(true);
    expect(f.category).toBe('Malware');
  });
});
