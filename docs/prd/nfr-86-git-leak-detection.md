# NFR-86: Git Leak Detection

**Status:** Pending
**Added:** 2025-12-15
**Implemented:** -

---

## User Story

As a developer, I want pre-commit hooks that detect secrets and credentials.

## Investigation Needed

1. Current hook setup (check `.git/hooks/`)
2. Tools to evaluate: gitleaks, detect-secrets, git-secrets, truffleHog
3. Integration approach: pre-commit hook + Husky + CI/CD

## What to Detect

- API keys (OpenAI, Anthropic, AWS, etc.)
- Passwords and tokens
- Private keys, connection strings, `.env` contents

## Acceptance Criteria

- [ ] Pre-commit hook installed
- [ ] Secrets detected before commit
- [ ] Clear error message when secret found
- [ ] False positives minimized

## Technical Notes

Consider:
- Husky for hook management
- gitleaks for detection (good Go-based tool)
- Custom patterns for project-specific secrets

## Completion Notes

_To be filled by developer._
