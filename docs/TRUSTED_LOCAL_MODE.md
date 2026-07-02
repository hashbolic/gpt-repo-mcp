# Trusted Local Mode

Trusted local mode is an opt-in policy layer for human-supervised local workflows where ChatGPT works with approved local repositories, prepares repo-local Codex tasks, reviews `RESULT.md` plus git diff output, and may proceed with local-only stage/commit when the repository policy explicitly allows it.

It is intentionally narrow. It does not enable push, shell execution, production deployment, broad restore, reset, checkout, clean, or arbitrary writes outside an approved repository root.

## Safe defaults

All trusted-local features are off by default:

```bash
GPT_REPO_MCP_AUTO_WRITE_CODEX_TASKS=0
GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES=0
GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT=0
GPT_REPO_MCP_AUTO_APPROVE_STAGE=0
GPT_REPO_MCP_AUTO_APPROVE_COMMIT=0
GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT=0
GPT_REPO_MCP_AUTO_APPROVE_RESTORE=0
GPT_REPO_MCP_AUTO_APPROVE_CLEANUP=0
GPT_REPO_MCP_AUTO_APPROVE_RESET=0
```

Push and production auto-approval are not supported.

## Trusted prompt artifact writes

Enable only for approved local repos:

```bash
GPT_REPO_MCP_AUTO_WRITE_CODEX_TASKS=1
GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES=1
GPT_REPO_MCP_TRUSTED_PROMPT_PATHS=".chatgpt/codex-runs/**/PROMPT.md,.chatgpt/codex-runs/**/run.json,.chatgpt/handoffs/*.local.md,.chatgpt/current.local.md,.codex/tasks/*.md,.codex/local-prompts/*.md"
```

When enabled, prompt-like text is treated as file data only when the destination path matches a trusted prompt artifact path. Normal safety gates still apply: repo root sandboxing, path traversal rejection, denied write globs, size limits, and secret-content scanning.

## Local git auto policy

Enable local-only stage/commit policy for trusted repositories:

```bash
GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT=1
GPT_REPO_MCP_AUTO_APPROVE_STAGE=1
GPT_REPO_MCP_AUTO_APPROVE_COMMIT=1
GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT=1
```

This policy is only an approval source. Existing git safety checks remain required:

- `expected_head_sha` must match.
- Paths must be explicit repo-relative paths.
- Broad pathspecs are rejected.
- Stage/commit must remain local-only.
- Commit verifies exact staged paths before creating a commit.
- Push is not provided by the tool surface.

Restore, cleanup, and reset remain conservative. Reset auto-approval is intentionally unsupported.

## Trusted local read limits

For trusted local workflows that need larger context packs:

```bash
GPT_REPO_MCP_TRUSTED_LOCAL_READS=1
GPT_REPO_MCP_MAX_PROMPT_BYTES=1048576
GPT_REPO_MCP_MAX_CONTEXT_FILES=200
GPT_REPO_MCP_MAX_CONTEXT_BYTES_PER_FILE=256000
GPT_REPO_MCP_MAX_RESULT_BYTES=1500000
GPT_REPO_MCP_MAX_DIFF_BYTES=1500000
GPT_REPO_MCP_MAX_DIFF_FILES=100
GPT_REPO_MCP_MAX_TREE_RESULTS=10000
GPT_REPO_MCP_MAX_SEARCH_RESULTS=1000
GPT_REPO_MCP_FULL_DIFF_FOR_APPROVED_REPOS=1
```

Current implementation wires the trusted read env values that map to `RootRegistry` limits. Additional service-specific limits can be layered on the same helper without weakening secret-path or content scanning.

## SpreadRadar workflow example

```bash
GPT_REPO_MCP_AUTO_WRITE_CODEX_TASKS=1
GPT_REPO_MCP_ALLOW_PROMPT_ARTIFACT_WRITES=1
GPT_REPO_MCP_AUTO_APPROVE_LOCAL_GIT=1
GPT_REPO_MCP_AUTO_APPROVE_STAGE=1
GPT_REPO_MCP_AUTO_APPROVE_COMMIT=1
GPT_REPO_MCP_AUTO_APPROVE_STAGE_COMMIT=1
GPT_REPO_MCP_AUTO_APPROVE_RESTORE=0
GPT_REPO_MCP_AUTO_APPROVE_CLEANUP=0
GPT_REPO_MCP_TRUSTED_LOCAL_READS=1
GPT_REPO_MCP_FULL_DIFF_FOR_APPROVED_REPOS=1
GPT_REPO_MCP_AUTO_INCLUDE_WORKFLOW_CONTEXT=1
GPT_REPO_MCP_SUPPRESS_TEST_FIXTURE_NOTIFICATIONS=1
GPT_REPO_MCP_DEFAULT_RUNNER_REPO_ID=spreadradar-runner
GPT_REPO_MCP_DEFAULT_PRODUCT_REPO_ID=spreadradar
```

Recommended repo mapping:

- `spreadradar-runner` → `C:\Users\Alex\Documents\Codex\SpreadRadar-runner`
- `spreadradar` → `C:\Users\Alex\Documents\Codex\SpreadRadar`

For production work, keep the explicit human gate. Do not deploy or restart production services unless Alex says exactly:

```text
На тесті все ок, викочуй на прод.
```

## Audit language

Trusted prompt artifact writes should report `approval_source: "trusted_prompt_artifact_path"` where the specific tool result schema supports it, or include a warning such as:

```text
Prompt-like content allowed because target path is a trusted prompt artifact path.
```

Dry-run responses should use `approval_source: "dry_run"` where the result schema supports approval metadata.
