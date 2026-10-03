import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Out Of Order Updates", () => {
  it("should converge regardless of update order", () => {
    const sender = new Y.Doc();
    const receiver = new Y.Doc();

    const updates: Uint8Array[] = [];

    sender.on("update", update => updates.push(update));

    const text = sender.getText("html");

    text.insert(0, "A");
    text.insert(1, "B");
    text.insert(2, "C");

    Y.applyUpdate(receiver, updates[2]);
    Y.applyUpdate(receiver, updates[0]);
    Y.applyUpdate(receiver, updates[1]);

    expect(receiver.getText("html").toString()).toBe("ABC");
  });
});