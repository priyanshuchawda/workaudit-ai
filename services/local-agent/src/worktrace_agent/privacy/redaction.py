from __future__ import annotations

from typing import Any, cast

PRIVACY_TEST_CORPUS = (
    "OPENAI_API_KEY=sk-test",
    "GITHUB_TOKEN=ghp_test",
    "AWS_SECRET_ACCESS_KEY=test",
    "password=mysecret",
    "email@example.com",
    "+91 9876543210",
    "-----BEGIN PRIVATE KEY-----",
)

SECRET_VALUES = (
    "sk-test",
    "ghp_test",
    "mysecret",
)

REDACTION_TOKEN = "[REDACTED]"


def redact_text(value: str) -> str:
    redacted = value
    for secret in PRIVACY_TEST_CORPUS + SECRET_VALUES:
        redacted = redacted.replace(secret, REDACTION_TOKEN)
    return redacted


def redact_json_value(value: Any) -> Any:
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, list):
        return [redact_json_value(item) for item in cast(list[object], value)]
    if isinstance(value, dict):
        return {
            str(key): redact_json_value(item)
            for key, item in cast(dict[object, object], value).items()
        }
    return value
