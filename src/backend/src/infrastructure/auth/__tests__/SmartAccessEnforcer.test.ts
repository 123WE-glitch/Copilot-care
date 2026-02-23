import { SmartAccessEnforcer } from '../SmartAccessEnforcer';
import { SmartScope } from '../smartTypes';

describe('SmartAccessEnforcer', () => {
  describe('enforce', () => {
    const scopes: SmartScope[] = [
      { role: 'patient', resource: 'Observation', permission: 'read' },
      { role: 'patient', resource: 'Patient', permission: 'read' },
    ];

    it('should allow access when scope matches', () => {
      expect(SmartAccessEnforcer.enforce(scopes, 'Observation', 'read')).toBe(true);
      expect(SmartAccessEnforcer.enforce(scopes, 'Patient', 'read')).toBe(true);
    });

    it('should deny access when resource does not match', () => {
      expect(SmartAccessEnforcer.enforce(scopes, 'Medication', 'read')).toBe(false);
    });

    it('should deny access when permission does not match', () => {
      expect(SmartAccessEnforcer.enforce(scopes, 'Observation', 'write')).toBe(false);
    });

    it('should allow access with wildcard resource', () => {
      const wildcardScopes: SmartScope[] = [
        { role: 'patient', resource: '*', permission: 'read' },
      ];
      expect(SmartAccessEnforcer.enforce(wildcardScopes, 'Observation', 'read')).toBe(true);
      expect(SmartAccessEnforcer.enforce(wildcardScopes, 'Patient', 'read')).toBe(true);
    });

    it('should allow access with wildcard permission', () => {
      const wildcardScopes: SmartScope[] = [
        { role: 'system', resource: 'Patient', permission: '*' },
      ];
      expect(SmartAccessEnforcer.enforce(wildcardScopes, 'Patient', 'read')).toBe(true);
      expect(SmartAccessEnforcer.enforce(wildcardScopes, 'Patient', 'write')).toBe(true);
    });

    it('should deny access with empty scopes', () => {
      expect(SmartAccessEnforcer.enforce([], 'Observation', 'read')).toBe(false);
    });
  });

  describe('enforceFromScopeString', () => {
    it('should parse and enforce from scope string', () => {
      const scopeString = 'patient/Observation.read patient/Patient.read';
      expect(SmartAccessEnforcer.enforceFromScopeString(scopeString, 'Observation', 'read')).toBe(true);
      expect(SmartAccessEnforcer.enforceFromScopeString(scopeString, 'Patient', 'read')).toBe(true);
      expect(SmartAccessEnforcer.enforceFromScopeString(scopeString, 'Observation', 'write')).toBe(false);
    });
  });
});
