import fs from 'fs';
import { assertMatchesFixture, fixturePath, loadFixture, FixtureName } from './assertMatchesFixture';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('contract fixtures', () => {
  test.each(['vitest', 'playwright'] as FixtureName[])(
    '%s.json is written with 2-space indent and a trailing newline',
    (name) => {
      const text = fs.readFileSync(fixturePath(name), 'utf8');
      expect(text).toEqual(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
    },
  );

  test.each(['vitest', 'playwright'] as FixtureName[])('%s.json matches itself', (name) => {
    const fixture = loadFixture(name);
    expect(() => assertMatchesFixture(clone(fixture), fixture)).not.toThrow();
  });
});

describe('assertMatchesFixture', () => {
  const fixture = loadFixture('vitest') as Record<string, any>;

  test('accepts different values of the same JSON types', () => {
    const actual = clone(fixture);
    actual.id = 'another-id';
    actual.cpuCount = 2;
    actual.testcases = [actual.testcases[1], actual.testcases[0], actual.testcases[0]];
    expect(() => assertMatchesFixture(actual, fixture)).not.toThrow();
  });

  test('rejects a missing key', () => {
    const actual = clone(fixture);
    delete actual.runId;
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.runId: missing');
  });

  test('rejects an extra key', () => {
    const actual = clone(fixture);
    actual.extra = 1;
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.extra: not in the fixture');
  });

  test('rejects a key with undefined, because it is not sent', () => {
    const actual = clone(fixture);
    actual.runId = undefined;
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.runId: missing');
  });

  test('rejects a different JSON type', () => {
    const actual = clone(fixture);
    actual.timeTaken = '1234';
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.timeTaken: expected number, got string');
  });

  test('rejects a nested mismatch inside an array item', () => {
    const actual = clone(fixture);
    actual.files[0].duration = null;
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.files[0].duration: expected number, got null');
  });

  test('rejects an array item whose shape matches no fixture item', () => {
    const actual = clone(fixture);
    actual.testcases[0].errorMessage = 'a string';
    expect(() => assertMatchesFixture(actual, fixture)).toThrow('$.testcases[0].errorMessage');
  });
});
