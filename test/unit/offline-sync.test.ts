import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Offline Sync", () => {

  it("merges offline edits", () => {

    const online = new Y.Doc();
    const offline = new Y.Doc();

    online.getText("html").insert(0, "Online ");

    offline.getText("html").insert(0, "Offline ");

    const update1 = Y.encodeStateAsUpdate(online);
    const update2 = Y.encodeStateAsUpdate(offline);

    Y.applyUpdate(online, update2);
    Y.applyUpdate(offline, update1);

    expect(online.getText("html").toString())
      .toBe(offline.getText("html").toString());
  });

});