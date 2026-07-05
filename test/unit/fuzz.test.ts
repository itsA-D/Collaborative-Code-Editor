import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Fuzz Test", () => {

  it("random operations converge", () => {

    const a = new Y.Doc();
    const b = new Y.Doc();

    for (let i = 0; i < 100; i++) {

      if (Math.random() > 0.5)
        a.getText("html").insert(0, "A");
      else
        b.getText("html").insert(0, "B");

    }

    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));

    expect(a.getText("html").toString())
      .toBe(b.getText("html").toString());

  });

});