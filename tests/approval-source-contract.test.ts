import { describe, expect, test } from "vitest";
import {
  GitCommitResultSchema,
  GitRecoverResultSchema,
  GitRestorePathsResultSchema,
  GitStageCommitResultSchema,
  GitStageResultSchema,
  GitUnstageResultSchema
} from "../src/contracts/git-operations.contract.js";

describe("approval_source contract metadata", () => {
  test("git operation results accept approval_source audit markers", () => {
    expect(GitStageResultSchema.parse({
      ok: true,
      dry_run: false,
      approval_source: "auto_policy",
      head_sha: "a".repeat(40),
      staged_paths: ["src/example.ts"],
      skipped: [],
      warnings: []
    }).approval_source).toBe("auto_policy");

    expect(GitUnstageResultSchema.parse({
      ok: true,
      dry_run: false,
      approval_source: "explicit_user",
      head_sha: "a".repeat(40),
      unstaged_paths: ["src/example.ts"],
      skipped: [],
      warnings: []
    }).approval_source).toBe("explicit_user");

    expect(GitRestorePathsResultSchema.parse({
      ok: true,
      dry_run: true,
      approval_source: "dry_run",
      head_sha: "a".repeat(40),
      restored_paths: ["src/example.ts"],
      skipped: [],
      warnings: []
    }).approval_source).toBe("dry_run");

    expect(GitCommitResultSchema.parse({
      ok: true,
      dry_run: false,
      approval_source: "auto_policy",
      head_before: "a".repeat(40),
      head_after: "b".repeat(40),
      commit_sha: "b".repeat(40),
      committed_paths: ["src/example.ts"],
      warnings: []
    }).approval_source).toBe("auto_policy");

    expect(GitStageCommitResultSchema.parse({
      ok: true,
      dry_run: false,
      approval_source: "auto_policy",
      head_before: "a".repeat(40),
      head_after: "b".repeat(40),
      commit_sha: "b".repeat(40),
      staged_paths: ["src/example.ts"],
      committed_paths: ["src/example.ts"],
      warnings: []
    }).approval_source).toBe("auto_policy");

    expect(GitRecoverResultSchema.parse({
      ok: true,
      dry_run: false,
      approval_source: "explicit_user",
      head_sha: "a".repeat(40),
      unstaged_paths: [],
      restored_paths: ["src/example.ts"],
      deleted: [],
      skipped: [],
      warnings: []
    }).approval_source).toBe("explicit_user");
  });
});
