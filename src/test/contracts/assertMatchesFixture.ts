import fs from 'fs';
import path from 'path';

export type FixtureName = 'vitest' | 'playwright';

type JsonType = 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';

export const fixturePath = (name: FixtureName): string => path.join(__dirname, `${name}.json`);

export const loadFixture = (name: FixtureName): unknown =>
  JSON.parse(fs.readFileSync(fixturePath(name), 'utf8'));

const jsonType = (value: unknown, where: string): JsonType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'string':
      return typeof value as JsonType;
    case 'object':
      return 'object';
    default:
      throw new Error(`${where}: ${typeof value} is not a JSON type`);
  }
};

const mismatches = (actual: unknown, fixture: unknown, where: string): string[] => {
  const expectedType = jsonType(fixture, where);
  const actualType = jsonType(actual, where);
  if (actualType !== expectedType) {
    return [`${where}: expected ${expectedType}, got ${actualType}`];
  }

  if (expectedType === 'object') {
    const actualObject = actual as Record<string, unknown>;
    const fixtureObject = fixture as Record<string, unknown>;
    const problems: string[] = [];
    for (const key of Object.keys(fixtureObject)) {
      if (!(key in actualObject)) {
        problems.push(`${where}.${key}: missing`);
      } else {
        problems.push(...mismatches(actualObject[key], fixtureObject[key], `${where}.${key}`));
      }
    }
    for (const key of Object.keys(actualObject)) {
      if (!(key in fixtureObject)) {
        problems.push(`${where}.${key}: not in the fixture`);
      }
    }
    return problems;
  }

  if (expectedType === 'array') {
    const actualArray = actual as unknown[];
    const fixtureArray = fixture as unknown[];
    if (fixtureArray.length === 0) {
      return actualArray.length === 0 ? [] : [`${where}: the fixture array is empty, got ${actualArray.length} items`];
    }
    // Each item must have the shape of at least one of the fixture's items,
    // so a fixture can show a field as null in one item and typed in another.
    const problems: string[] = [];
    actualArray.forEach((item, index) => {
      const itemWhere = `${where}[${index}]`;
      const perFixtureItem = fixtureArray.map((fixtureItem) => mismatches(item, fixtureItem, itemWhere));
      if (!perFixtureItem.some((p) => p.length === 0)) {
        const closest = perFixtureItem.reduce((a, b) => (b.length < a.length ? b : a));
        problems.push(...closest);
      }
    });
    return problems;
  }

  return [];
};

/**
 * Throws unless `actual` has exactly the fixture's keys, each with the same
 * JSON type, recursively. Values are not compared.
 */
export const assertMatchesFixture = (actual: unknown, fixture: unknown): void => {
  // Round-trip through JSON so the check sees what would go on the wire.
  const wire = JSON.parse(JSON.stringify(actual));
  const problems = mismatches(wire, fixture, '$');
  if (problems.length > 0) {
    throw new Error(`Payload does not match the contract fixture:\n${problems.join('\n')}`);
  }
};
