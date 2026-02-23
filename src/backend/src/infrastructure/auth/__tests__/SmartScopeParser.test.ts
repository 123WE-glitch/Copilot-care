import { SmartScopeParser } from '../SmartScopeParser';

describe('SmartScopeParser', () => {
  describe('parse', () => {
    it('should parse a valid patient read scope', () => {
      const result = SmartScopeParser.parse('patient/Observation.read');
      expect(result).toEqual({
        role: 'patient',
        resource: 'Observation',
        permission: 'read',
      });
    });

    it('should parse a valid user write scope', () => {
      const result = SmartScopeParser.parse('user/Patient.write');
      expect(result).toEqual({
        role: 'user',
        resource: 'Patient',
        permission: 'write',
      });
    });

    it('should parse wildcard resource', () => {
      const result = SmartScopeParser.parse('patient/*.read');
      expect(result).toEqual({
        role: 'patient',
        resource: '*',
        permission: 'read',
      });
    });

    it('should parse wildcard permission', () => {
      const result = SmartScopeParser.parse('system/Patient.*');
      expect(result).toEqual({
        role: 'system',
        resource: 'Patient',
        permission: '*',
      });
    });

    it('should return null for invalid scope format', () => {
      expect(SmartScopeParser.parse('invalid')).toBeNull();
      expect(SmartScopeParser.parse('patient/Observation')).toBeNull();
      expect(SmartScopeParser.parse('patient/Observation.delete')).toBeNull();
    });
  });

  describe('parseAll', () => {
    it('should parse multiple scopes', () => {
      const result = SmartScopeParser.parseAll('patient/Observation.read patient/Patient.read');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'patient',
        resource: 'Observation',
        permission: 'read',
      });
      expect(result[1]).toEqual({
        role: 'patient',
        resource: 'Patient',
        permission: 'read',
      });
    });

    it('should handle empty string', () => {
      expect(SmartScopeParser.parseAll('')).toEqual([]);
    });

    it('should skip invalid scopes', () => {
      const result = SmartScopeParser.parseAll('patient/Observation.read invalid patient/Patient.write');
      expect(result).toHaveLength(2);
    });
  });
});
