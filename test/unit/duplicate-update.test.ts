import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Duplicate Updates", () => {
  it("should ignore duplicate updates", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    doc1.getText("html").insert(0, "Hello World");

    const update = Y.encodeStateAsUpdate(doc1);

    Y.applyUpdate(doc2, update);
    Y.applyUpdate(doc2, update);
    Y.applyUpdate(doc2, update);

    expect(doc2.getText("html").toString()).toBe("Hello World");
  });
});