export interface NavItemDef {
  to: string;
  label: string;
  exact?: boolean;
  aliases?: string[];
  [key: string]: any;
}

/**
 * Resolves strictly ONE active navigation item path based on current pathname.
 * Prioritizes exact matches, then nested boundary matches (/path/sub), preventing
 * false-positive prefix collisions (e.g. /admin matching /admin/incharges).
 */
export function getActiveNavPath(
  currentPathname: string,
  items: NavItemDef[],
  defaultPath?: string
): string | null {
  const normalized = currentPathname.toLowerCase().replace(/\/$/, '') || '/';

  // 1. Check exact match against item.to or any alias
  for (const item of items) {
    const itemPath = item.to.toLowerCase().replace(/\/$/, '') || '/';
    if (normalized === itemPath) {
      return item.to;
    }
    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasPath = alias.toLowerCase().replace(/\/$/, '') || '/';
        if (normalized === aliasPath) {
          return item.to;
        }
      }
    }
  }

  // 2. Check nested route matches (item.to/sub or alias/sub) for non-exact items
  let bestMatch: { to: string; length: number } | null = null;
  for (const item of items) {
    if (item.exact) continue;

    const itemPath = item.to.toLowerCase().replace(/\/$/, '');
    if (itemPath && normalized.startsWith(itemPath + '/')) {
      if (!bestMatch || itemPath.length > bestMatch.length) {
        bestMatch = { to: item.to, length: itemPath.length };
      }
    }

    if (item.aliases) {
      for (const alias of item.aliases) {
        const aliasPath = alias.toLowerCase().replace(/\/$/, '');
        if (aliasPath && normalized.startsWith(aliasPath + '/')) {
          if (!bestMatch || aliasPath.length > bestMatch.length) {
            bestMatch = { to: item.to, length: aliasPath.length };
          }
        }
      }
    }
  }

  if (bestMatch) {
    return bestMatch.to;
  }

  // 3. Fallback to default if provided
  if (defaultPath) {
    return defaultPath;
  }

  return null;
}
