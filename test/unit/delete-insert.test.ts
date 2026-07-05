import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Delete Insert", () => {

  it("handles delete + insert", () => {

    const a = new Y.Doc();

    const text = a.getText("html");

    text.insert(0, "ABCDE");

    text.delete(1, 2);

    text.insert(1, "XX");

    expect(text.toString()).toBe("AXXDE");

  });

});