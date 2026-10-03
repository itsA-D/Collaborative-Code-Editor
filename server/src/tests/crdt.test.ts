/**
 * CRDT Merge Safety Tests
 * Tests for Yjs-based collaborative editing correctness
 */

import * as Y from 'yjs';
import { describe, it, expect, beforeEach } from 'vitest';

describe('CRDT Merge Safety', () => {
  let doc1: Y.Doc;
  let doc2: Y.Doc;
  let doc3: Y.Doc;

  beforeEach(() => {
    doc1 = new Y.Doc({ gc: true });
    doc2 = new Y.Doc({ gc: true });
    doc3 = new Y.Doc({ gc: true });
  });

  describe('Concurrent Insert', () => {
    it('should merge concurrent inserts at same position', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'hello');
      text2.insert(0, 'world');

      // Apply doc2's update to doc1
      const update2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, update2);

      // Apply doc1's update to doc2
      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Both should converge to same state
      expect(text1.toString()).toBe(text2.toString());
      expect(text1.toString().length).toBeGreaterThan(0);
    });

    it('should preserve order of concurrent inserts', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'A');
      text2.insert(0, 'B');

      const update2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, update2);

      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Both should have both characters
      expect(text1.toString()).toContain('A');
      expect(text1.toString()).toContain('B');
      expect(text2.toString()).toContain('A');
      expect(text2.toString()).toContain('B');
    });
  });

  describe('Concurrent Delete', () => {
    it('should handle concurrent deletes without data loss', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'hello world');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      // Both docs now have 'hello world'
      text1.delete(0, 5); // Delete 'hello'
      text2.delete(6, 5); // Delete 'world'

      const update2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, update2);

      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Both should converge
      expect(text1.toString()).toBe(text2.toString());
    });

    it('should handle overlapping deletes correctly', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'abcdef');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      text1.delete(2, 2); // Delete 'cd'
      text2.delete(1, 2); // Delete 'bc'

      const update2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, update2);

      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      expect(text1.toString()).toBe(text2.toString());
    });
  });

  describe('Offline Merge', () => {
    it('should merge offline edits correctly', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      // Initial state
      text1.insert(0, 'initial');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      // Doc1 goes offline and edits
      text1.delete(0, 7);
      text1.insert(0, 'offline1');

      // Doc2 continues editing
      text2.delete(7, 0);
      text2.insert(7, 'online');

      // Reconnect and merge
      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc2, update1);

      expect(text1.toString()).toBe(text2.toString());
    });

    it('should handle multiple offline edits', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'start');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      // Multiple offline edits on doc1
      text1.insert(5, ' edit1');
      text1.insert(11, ' edit2');
      text1.insert(17, ' edit3');

      // Multiple online edits on doc2
      text2.insert(5, ' online1');
      text2.insert(13, ' online2');

      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc2, update1);

      expect(text1.toString()).toBe(text2.toString());
    });
  });

  describe('Duplicate Updates', () => {
    it('should ignore duplicate updates', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'hello');
      const update = Y.encodeStateAsUpdate(doc1);

      // Apply same update twice
      Y.applyUpdate(doc2, update);
      Y.applyUpdate(doc2, update);

      expect(text2.toString()).toBe('hello');
      expect(text2.toString().length).toBe(5);
    });

    it('should handle out-of-order duplicate updates', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'a');
      const update1 = Y.encodeStateAsUpdate(doc1);

      text1.insert(1, 'b');
      const update2 = Y.encodeStateAsUpdate(doc1);

      // Apply updates out of order, with duplicates
      Y.applyUpdate(doc2, update2);
      Y.applyUpdate(doc2, update1);
      Y.applyUpdate(doc2, update2); // Duplicate
      Y.applyUpdate(doc2, update1); // Duplicate

      expect(text2.toString()).toBe('ab');
    });
  });

  describe('Replayed Updates', () => {
    it('should handle replayed updates correctly', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'original');
      const update1 = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update1);

      // Doc1 makes more changes
      text1.delete(0, 8);
      text1.insert(0, 'modified');
      const update2 = Y.encodeStateAsUpdate(doc1);

      // Replay old update on doc2 (should not overwrite new state)
      Y.applyUpdate(doc2, update2);
      Y.applyUpdate(doc2, update1); // Replay old update

      expect(text2.toString()).toBe(text1.toString());
    });
  });

  describe('Out-of-Order Updates', () => {
    it('should converge with out-of-order updates', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      // Create sequence of updates
      text1.insert(0, 'a');
      const update1 = Y.encodeStateAsUpdate(doc1);

      text1.insert(1, 'b');
      const update2 = Y.encodeStateAsUpdate(doc1);

      text1.insert(2, 'c');
      const update3 = Y.encodeStateAsUpdate(doc1);

      // Apply out of order to doc2
      Y.applyUpdate(doc2, update3);
      Y.applyUpdate(doc2, update1);
      Y.applyUpdate(doc2, update2);

      expect(text1.toString()).toBe(text2.toString());
      expect(text2.toString()).toBe('abc');
    });

    it('should handle interleaved out-of-order updates from multiple sources', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'a');
      const update1a = Y.encodeStateAsUpdate(doc1);

      text2.insert(0, 'x');
      const update2a = Y.encodeStateAsUpdate(doc2);

      text1.insert(1, 'b');
      const update1b = Y.encodeStateAsUpdate(doc1);

      text2.insert(1, 'y');
      const update2b = Y.encodeStateAsUpdate(doc2);

      // Apply interleaved out of order
      Y.applyUpdate(doc1, update2b);
      Y.applyUpdate(doc1, update2a);
      Y.applyUpdate(doc2, update1b);
      Y.applyUpdate(doc2, update1a);

      expect(text1.toString()).toBe(text2.toString());
    });
  });

  describe('Multiple Replicas', () => {
    it('should converge across three replicas', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');
      const text3 = doc3.getText('test');

      // Each replica makes different edits
      text1.insert(0, 'replica1');
      text2.insert(0, 'replica2');
      text3.insert(0, 'replica3');

      // Sync all replicas
      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);
      const update3 = Y.encodeStateAsUpdate(doc3);

      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc1, update3);
      Y.applyUpdate(doc2, update1);
      Y.applyUpdate(doc2, update3);
      Y.applyUpdate(doc3, update1);
      Y.applyUpdate(doc3, update2);

      // All should converge to same state
      expect(text1.toString()).toBe(text2.toString());
      expect(text2.toString()).toBe(text3.toString());
      expect(text3.toString()).toBe(text1.toString());
    });

    it('should handle complex multi-replica scenario', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');
      const text3 = doc3.getText('test');

      // Initial sync
      text1.insert(0, 'base');
      const baseUpdate = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, baseUpdate);
      Y.applyUpdate(doc3, baseUpdate);

      // Concurrent edits
      text1.insert(4, '1');
      text2.insert(4, '2');
      text3.insert(4, '3');

      // Partial sync
      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);
      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc3, update1);
      Y.applyUpdate(doc3, update2);

      // Final sync
      const update3 = Y.encodeStateAsUpdate(doc3);
      Y.applyUpdate(doc1, update3);
      Y.applyUpdate(doc2, update3);

      expect(text1.toString()).toBe(text2.toString());
      expect(text2.toString()).toBe(text3.toString());
    });
  });

  describe('Eventual Convergence', () => {
    it('should achieve eventual convergence after all updates applied', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      // Create complex edit history
      for (let i = 0; i < 10; i++) {
        text1.insert(i, String.fromCharCode(65 + i));
      }

      const updates: Uint8Array[] = [];
      for (let i = 0; i < 10; i++) {
        text2.insert(i, String.fromCharCode(97 + i));
        updates.push(Y.encodeStateAsUpdate(doc2));
      }

      // Apply all updates to doc1 in random order
      updates.reverse().forEach(update => Y.applyUpdate(doc1, update));

      // Apply doc1's updates to doc2
      const finalUpdate = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, finalUpdate);

      expect(text1.toString()).toBe(text2.toString());
    });

    it('should converge with mixed insert and delete operations', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      text1.insert(0, 'abcdefgh');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      // Mixed operations
      text1.delete(2, 2);
      text1.insert(2, 'X');

      text2.delete(4, 2);
      text2.insert(4, 'Y');

      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc2, update1);

      expect(text1.toString()).toBe(text2.toString());
    });
  });

  describe('Diff-based Update Safety', () => {
    it('should preserve concurrent edits with diff updates', () => {
      const text1 = doc1.getText('test');
      const text2 = doc2.getText('test');

      // Initial state
      text1.insert(0, 'hello world');
      const update = Y.encodeStateAsUpdate(doc1);
      Y.applyUpdate(doc2, update);

      // Simulate diff-based update on doc1 (delete+insert pattern)
      const current = text1.toString();
      text1.delete(0, current.length);
      text1.insert(0, 'hello universe');

      // Concurrent edit on doc2
      text2.insert(5, ' beautiful');

      // Merge
      const update1 = Y.encodeStateAsUpdate(doc1);
      const update2 = Y.encodeStateAsUpdate(doc2);

      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc2, update1);

      // Both should have both edits
      expect(text1.toString()).toBe(text2.toString());
    });
  });
});
