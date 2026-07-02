import { afterEach, describe, expect, test } from "vitest";
import { evaluateLocalGitApproval, evaluatePromptArtifactWrite } from "../src/services/trusted-local-policy.js";

describe("trusted local policy", () => {
  afterEach(() => {
    delete process.env.GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES;
    delete process.env.GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT;
    delete process.env.GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT;
  });

  test("trusted prompt artifact writes are opt-in", () => {
    const path = ".chatgpt/codex-runs/2026-07-02T120000Z-demo/PROMPT.md";

    expect(evaluatePromptArtifactWrite(path)).toMatchObject({
      allowed: false,
      approval_source: "explicit_user"
    });

    process.env.GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES = "1";
    expect(evaluatePromptArtifactWrite(path)).toMatchObject({
      allowed: true,
      approval_source: "trusted_prompt_artifact_path"
    });
  });

  test("local stage commit auto approval is opt-in", () => {
    expect(evaluateLocalGitApproval("git_stage_commit")).toMatchObject({
      allowed: true,
      approval_source: "explicit_user"
    });

    process.env.GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT = "1";
    process.env.GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT = "1";
    expect(evaluateLocalGitApproval("git_stage_commit")).toMatchObject({
      allowed: true,
      approval_source: "auto_policy"
    });

    expect(evaluateLocalGitApproval("git_stage", { dry_run: true })).toMatchObject({
      allowed: true,
      approval_source: "dry_run"
    });
  });
});
