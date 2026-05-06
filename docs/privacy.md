# Privacy

Initial Phase 0 placeholder. See `../plan.md` for the full privacy plan.

WorkTrace is planned as local-first software:

- no cloud upload by default
- no keylogging
- no raw clipboard capture by default
- redaction before AI prompts or exports
- deletion controls are planned before advanced AI features

Implemented foundations now include redaction helpers, redacted Markdown/raw JSON
exports, local rotating logs, redacted debug bundle output, and tests against a
known privacy corpus. The live recorder and complete privacy center are still
not implemented.

The recorder will handle sensitive desktop context, so privacy is a product
requirement, not a later polish step. Public demos should show privacy limits
and deletion plans before discussing advanced AI behavior.
