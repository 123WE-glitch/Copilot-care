import { SmartScope, SmartRole, SmartPermission } from './smartTypes';

export class SmartScopeParser {
  private static readonly SCOPE_REGEX = /^(patient|user|system)\/([A-Za-z]+|\*)\.(read|write|\*)$/;

  static parse(scopeString: string): SmartScope | null {
    const match = scopeString.trim().match(this.SCOPE_REGEX);
    if (!match) {
      return null;
    }

    const [, role, resource, permission] = match;
    return {
      role: role as SmartRole,
      resource,
      permission: permission as SmartPermission,
    };
  }

  static parseAll(scopesString: string): SmartScope[] {
    const scopes: SmartScope[] = [];
    const scopeStrings = scopesString.split(/\s+/).filter(s => s.length > 0);

    for (const s of scopeStrings) {
      const parsed = this.parse(s);
      if (parsed) {
        scopes.push(parsed);
      }
    }

    return scopes;
  }
}
