import { describe, expect, it } from 'vitest';

import {
  compareRoomNumbers,
  dedupeRoomNumbers,
  expandRoomRange,
  parseRoomList,
  roomNumberNaturalOrderSql,
} from '@/lib/rooms/parse-room-numbers';

describe('room number helpers', () => {
  it('splits a free-text list and drops duplicates case-insensitively', () => {
    expect(parseRoomList('1A, 1B\n1a  2')).toEqual(['1A', '1B', '2']);
  });

  it('expands a padded numeric range with a prefix', () => {
    expect(expandRoomRange('01', '03', 'U')).toEqual(['U01', 'U02', 'U03']);
  });

  it('sorts Unit 2 before Unit 10', () => {
    expect(compareRoomNumbers('Unit 2', 'Unit 10')).toBeLessThan(0);
  });

  it('dedupes while keeping first-seen casing', () => {
    expect(dedupeRoomNumbers(['1A', '1a', '1B'])).toEqual(['1A', '1B']);
  });

  it('qualifies the natural-order SQL fragment with a table alias', () => {
    expect(roomNumberNaturalOrderSql('r')).toMatch(/r\.room_number/);
  });
});
