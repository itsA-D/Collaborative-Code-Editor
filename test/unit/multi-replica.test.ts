import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Multi Replica", () => {

  it("5 replicas converge", () => {

    const docs = Array.from({ length: 5 }, () => new Y.Doc());

    docs[0].getText("html").insert(0, "Hello");

    const update = Y.encodeStateAsUpdate(docs[0]);

    for (let i = 1; i < docs.length; i++)
      Y.applyUpdate(docs[i], update);

    const expected = docs[0].getText("html").toString();

    docs.forEach(doc =>
      expect(doc.getText("html").toString()).toBe(expected)
    );

  });

});