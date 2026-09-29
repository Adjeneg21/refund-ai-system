import { describe, it, expect } from "vitest";
import { withKeyLock } from "../src/services/keyedLock.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("withKeyLock", () => {
  it("runs tasks for the same key one at a time, in order", async () => {
    const log: string[] = [];
    const task = (name: string, ms: number) =>
      withKeyLock("cust_1", async () => {
        log.push(`start ${name}`);
        await sleep(ms);
        log.push(`end ${name}`);
      });

    await Promise.all([task("A", 30), task("B", 5), task("C", 1)]);

    expect(log).toEqual(["start A", "end A", "start B", "end B", "start C", "end C"]);
  });

  it("does not make different keys wait for each other", async () => {
    const log: string[] = [];
    const slow = withKeyLock("cust_1", async () => {
      await sleep(40);
      log.push("slow done");
    });
    const fast = withKeyLock("cust_2", async () => {
      log.push("fast done");
    });
    await Promise.all([slow, fast]);
    expect(log).toEqual(["fast done", "slow done"]);
  });

  it("releases the lock when a task throws", async () => {
    await withKeyLock("cust_3", async () => {
      throw new Error("boom");
    }).catch(() => undefined);
    const result = await withKeyLock("cust_3", async () => "ok");
    expect(result).toBe("ok");
  });
});
