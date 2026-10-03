import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Concurrent Editing", () => {
  it("should converge after concurrent edits", () => {
    // Create two independent replicas
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText("html");
    const textB = docB.getText("html");

    // Both start from the same empty document

    // User A types
    textA.insert(0, "Hello");

    // User B types concurrently
    textB.insert(0, "World");

    // Exchange updates
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docA, updateB);
    Y.applyUpdate(docB, updateA);

    // Final document contents
    const resultA = textA.toString();
    const resultB = textB.toString();

    // Every replica must converge
    expect(resultA).toEqual(resultB);

    // Both user edits must be preserved
    expect(resultA).toContain("Hello");
    expect(resultA).toContain("World");

    // Applying the same update twice should not change state
    Y.applyUpdate(docA, updateB);

    expect(textA.toString()).toEqual(resultA);
  });
});