import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Boundary Conditions", () => {
  it("handles empty document operations", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    // Empty document should have zero length
    expect(text.length).toBe(0);
    expect(text.toString()).toBe("");

    // Insert into empty document
    text.insert(0, "Hello");
    expect(text.toString()).toBe("Hello");
    expect(text.length).toBe(5);
  });

  it("handles delete entire document", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "Full Document");
    expect(text.length).toBe(13);

    // Delete entire document
    text.delete(0, text.length);
    expect(text.length).toBe(0);
    expect(text.toString()).toBe("");
  });

  it("handles delete at beginning", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "ABCDE");
    text.delete(0, 2);
    expect(text.toString()).toBe("CDE");
  });

  it("handles delete at end", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "ABCDE");
    text.delete(3, 2);
    expect(text.toString()).toBe("ABC");
  });

  it("handles delete in middle", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "ABCDE");
    text.delete(1, 3);
    expect(text.toString()).toBe("AE");
  });

  it("handles unicode characters", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    const unicodeText = "Hello 世界 🌍 مرحبا";
    text.insert(0, unicodeText);
    expect(text.toString()).toBe(unicodeText);
    expect(text.length).toBe(unicodeText.length);
  });

  it("handles emoji characters", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    const emojiText = "😀😎🚀💻🎉";
    text.insert(0, emojiText);
    expect(text.toString()).toBe(emojiText);
    expect(text.length).toBe(emojiText.length);
  });

  it("handles multiline text", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    const multiline = "Line 1\nLine 2\nLine 3";
    text.insert(0, multiline);
    expect(text.toString()).toBe(multiline);
    expect(text.length).toBe(multiline.length);
  });

  it("handles very large insert", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    const largeText = "A".repeat(10000);
    text.insert(0, largeText);
    expect(text.length).toBe(10000);
    expect(text.toString()).toBe(largeText);
  });

  it("handles extremely long line", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    const longLine = "X".repeat(50000);
    text.insert(0, longLine);
    expect(text.length).toBe(50000);
  });

  it("handles empty update application", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.getText("html").insert(0, "Test");
    const emptyUpdate = new Uint8Array(0);

    // Yjs throws on empty updates - verify deterministic behavior
    expect(() => Y.applyUpdate(doc2, emptyUpdate)).toThrow();
    expect(doc2.getText("html").toString()).toBe("");
  });

  it("handles empty merge between replicas", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Both docs start empty
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docA, updateB);
    Y.applyUpdate(docB, updateA);

    expect(docA.getText("html").toString()).toBe("");
    expect(docB.getText("html").toString()).toBe("");
  });

  it("handles delete beyond document length", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "Short");
    // Attempting to delete more than exists should handle gracefully
    text.delete(0, 100);
    expect(text.toString()).toBe("");
  });

  it("handles insert at position beyond length", () => {
    const doc = new Y.Doc();
    const text = doc.getText("html");

    text.insert(0, "ABC");
    // Insert at position beyond current length
    text.insert(10, "X");
    // Yjs appends at end when position is beyond length
    expect(text.toString()).toContain("ABC");
    expect(text.toString()).toContain("X");
  });
});
