import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Convergence", () => {
  it("all replicas converge", () => {

    const a = new Y.Doc();
    const b = new Y.Doc();
    const c = new Y.Doc();

    a.getText("html").insert(0, "Hello");

    const update = Y.encodeStateAsUpdate(a);

    Y.applyUpdate(b, update);
    Y.applyUpdate(c, update);

    expect(a.getText("html").toString())
      .toBe(b.getText("html").toString());

    expect(b.getText("html").toString())
      .toBe(c.getText("html").toString());
  });
});