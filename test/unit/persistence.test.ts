import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Persistence", () => {

  it("restores from binary update", () => {

    const original = new Y.Doc();

    original.getText("html").insert(0, "Persist");

    const binary = Y.encodeStateAsUpdate(original);

    const restored = new Y.Doc();

    Y.applyUpdate(restored, binary);

    expect(restored.getText("html").toString())
      .toBe("Persist");

  });

});