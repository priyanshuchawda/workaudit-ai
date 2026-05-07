from __future__ import annotations

import os
from dataclasses import dataclass

import uvicorn

DEFAULT_SIDECAR_HOST = "127.0.0.1"
DEFAULT_SIDECAR_PORT = 8765
LOCAL_ONLY_HOSTS = {"127.0.0.1", "localhost"}


@dataclass(frozen=True)
class SidecarServerConfig:
    host: str
    port: int


def read_sidecar_server_config() -> SidecarServerConfig:
    host = os.environ.get("WORKTRACE_SIDECAR_HOST", DEFAULT_SIDECAR_HOST)
    if host not in LOCAL_ONLY_HOSTS:
        raise SystemExit("WORKTRACE_SIDECAR_HOST must be 127.0.0.1 or localhost")

    port_text = os.environ.get("WORKTRACE_SIDECAR_PORT", str(DEFAULT_SIDECAR_PORT))
    try:
        port = int(port_text)
    except ValueError as error:
        raise SystemExit("WORKTRACE_SIDECAR_PORT must be an integer") from error
    if port < 1 or port > 65535:
        raise SystemExit("WORKTRACE_SIDECAR_PORT must be between 1 and 65535")

    return SidecarServerConfig(host=host, port=port)


def main() -> None:
    config = read_sidecar_server_config()
    uvicorn.run(
        "worktrace_agent.api.app:app",
        host=config.host,
        port=config.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
