import { SmartScope, SmartPermission } from './smartTypes';
import { SmartScopeParser } from './SmartScopeParser';

export class SmartAccessEnforcer {
  static enforce(
    grantedScopes: SmartScope[],
    resource: string,
    permission: SmartPermission
  ): boolean {
    for (const scope of grantedScopes) {
      if (this.matchesScope(scope, resource, permission)) {
        return true;
      }
    }
    return false;
  }

  static enforceFromScopeString(
    scopeString: string,
    resource: string,
    permission: SmartPermission
  ): boolean {
    const scopes = SmartScopeParser.parseAll(scopeString);
    return this.enforce(scopes, resource, permission);
  }

  private static matchesScope(
    scope: SmartScope,
    resource: string,
    permission: SmartPermission
  ): boolean {
    const resourceMatches = scope.resource === '*' || scope.resource === resource;
    const permissionMatches = scope.permission === '*' || scope.permission === permission;

    return resourceMatches && permissionMatches;
  }
}
