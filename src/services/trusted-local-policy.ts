import ignore from "ignore";

export type ApprovalSource = "explicit_user" | "auto_policy" | "trusted_prompt_artifact_path" | "dry_run" | "denied";

export type TrustedPolicyDecision = {
  allowed: boolean;
  approval_source: ApprovalSource;
  reason: string;
  matched_policy?: string;
  warnings: string[];
};

export type LocalGitOperation =
  | "git_stage"
  | "git_unstage"
  | "git_commit"
  | "git_stage_commit"
  | "git_restore"
  | "git_recover"
  | "cleanup"
  | "reset";

export const DEFAULT_TRUSTED_PROMPT_PATHS = [
  ".chatgpt/codex-runs/**/PROMPT.md",
  ".chatgpt/codex-runs/**/run.json",
  ".chatgpt/handoffs/*.local.md",
  ".chatgpt/current.local.md",
  ".codex/tasks/*.md",
  ".codex/local-prompts/*.md"
];

export function isEnvFlagEnabled(name: string): boolean {
  return ["1", "true", "yes", "on"].includes((process.env[name] ?? "").trim().toLowerCase());
}

export function envPositiveInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function trustedPromptPaths(): string[] {
  return envCsv("GPT_REPO_MCP_TRUSTED_PROMPT_PATHS") ?? [...DEFAULT_TRUSTED_PROMPT_PATHS];
}

export function isTrustedPromptArtifactPath(path: string): boolean {
  return matchesAny(path, trustedPromptPaths());
}

export function maxPromptArtifactBytes(defaultBytes: number): number {
  return envPositiveInt("GPT_REPO_MCP_MAX_PROMPT_BYTES") ?? defaultBytes;
}

export function evaluatePromptArtifactWrite(path: string, options: { dry_run?: boolean } = {}): TrustedPolicyDecision {
  if (options.dry_run) {
    return {
      allowed: true,
      approval_source: "dry_run",
      reason: "Dry run only; no file content will be written.",
      matched_policy: "dry_run",
      warnings: []
    };
  }

  const matched = isTrustedPromptArtifactPath(path);
  const enabled = isEnvFlagEnabled("GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES")
    || isEnvFlagEnabled("GPT_REPO_MCP_AUTO_WRITE_CODEX_TASKS");

  if (matched && enabled) {
    return {
      allowed: true,
      approval_source: "trusted_prompt_artifact_path",
      reason: "Prompt-like content is treated as repository artifact data for this trusted prompt artifact path.",
      matched_policy: "trusted_prompt_artifact_path",
      warnings: ["Prompt-like content allowed because target path is a trusted prompt artifact path."]
    };
  }

  return {
    allowed: false,
    approval_source: "explicit_user",
    reason: matched
      ? "Trusted prompt artifact path matched, but the trusted prompt artifact env opt-in is disabled."
      : "Path is not a trusted prompt artifact path.",
    matched_policy: matched ? "trusted_prompt_artifact_path_disabled" : undefined,
    warnings: []
  };
}

export function evaluateLocalGitApproval(operation: LocalGitOperation, options: { dry_run?: boolean } = {}): TrustedPolicyDecision {
  if (options.dry_run) {
    return {
      allowed: true,
      approval_source: "dry_run",
      reason: "Dry run only; git index, worktree, and HEAD will not be mutated.",
      matched_policy: "dry_run",
      warnings: []
    };
  }

  if (operation === "reset") {
    return {
      allowed: false,
      approval_source: "denied",
      reason: "Automatic approval for git reset is intentionally unsupported.",
      matched_policy: "reset_never_auto_approved",
      warnings: ["git reset remains manual/destructive and is not auto-approved."]
    };
  }

  const localGitEnabled = isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT");
  const operationEnabled = localGitEnabled && isOperationEnvEnabled(operation);
  if (operationEnabled) {
    return {
      allowed: true,
      approval_source: "auto_policy",
      reason: `Local-only ${operation} is auto-approved by trusted local git policy; path, HEAD, and staged-path checks still apply.`,
      matched_policy: `auto_${operation}`,
      warnings: []
    };
  }

  return {
    allowed: true,
    approval_source: "explicit_user",
    reason: `Local-only ${operation} requires explicit user approval because the auto-approval env opt-in is disabled for this operation.`,
    matched_policy: "explicit_user_required",
    warnings: []
  };
}

export function trustedLocalReadsEnabled(): boolean {
  return isEnvFlagEnabled("GPT_REPO_MCP_TRUSTED_LOCAL_READS");
}

export function fullDiffForApprovedReposEnabled(): boolean {
  return isEnvFlagEnabled("GPT_REPO_MCP_FULL_DIFF_FOR_APPROVED_REPOS");
}

export function defaultRunnerRepoId(): string | undefined {
  return nonEmptyEnv("GPT_REPO_MCP_DEFAULT_RUNNER_REPO_ID");
}

export function defaultProductRepoId(): string | undefined {
  return nonEmptyEnv("GPT_REPO_MCP_DEFAULT_PRODUCT_REPO_ID");
}

function isOperationEnvEnabled(operation: LocalGitOperation): boolean {
  if (operation === "git_stage" || operation === "git_unstage") {
    return isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_STAGE")
      || isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT");
  }
  if (operation === "git_commit") {
    return isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_COMMIT")
      || isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT");
  }
  if (operation === "git_stage_commit") {
    return isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT");
  }
  if (operation === "git_restore" || operation === "git_recover") {
    return isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_RESTORE");
  }
  if (operation === "cleanup") {
    return isEnvFlagEnabled("GPT_REPO_MCP_AUTO_APPROVE_CLEANUP");
  }
  return false;
}

function matchesAny(path: string, globs: string[]): boolean {
  const matcher = ignore().add(globs);
  return matcher.ignores(path);
}

function envCsv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (!raw) {
    return undefined;
  }
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function nonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
