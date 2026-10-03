import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Stress Test", () => {

  it("handles 1000 inserts", () => {

    const doc = new Y.Doc();

    const text = doc.getText("html");

    for (let i = 0; i < 1000; i++) {
      text.insert(text.length, "A");
    }

    expect(text.length).toBe(1000);

  });

});