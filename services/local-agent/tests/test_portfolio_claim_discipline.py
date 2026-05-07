from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

FORBIDDEN_PUBLIC_CLAIMS = (
    "ai understands your full workflow perfectly",
    "automatically knows everything you did",
    "fully secure",
    "production-ready ai",
    "never misses blockers",
    "real windows capture profiling passed",
)


def test_readme_has_two_minute_viewer_section_and_current_limits() -> None:
    readme = read_text("README.md")

    assert "## Two-Minute Review" in readme
    assert "## Evidence and Verification" in readme
    assert "## Current Limitations" in readme
    assert "desktop session dashboard foundation" in readme
    assert "desktop recorder lifecycle controls for a configured local sidecar" in readme
    assert "real Windows active-window polling" in readme
    assert (
        "Tauri recorder and event bridge still require a configured localhost sidecar URL" in readme
    )
    assert "real Windows screenshot capture" in readme
    assert "metadata-only file watcher capture" in readme
    assert "explicit safe terminal command ingestion" in readme
    assert "hardened privacy redaction/private-mode suppression" in readme
    assert "desktop privacy center, configurable blocklist UI" in readme
    assert "OCR and model runtimes are still not live" in readme
    assert "does not spy on terminals, keylog, or capture commands unless" in readme
    assert "desktop export commands" in readme
    assert "packaged sidecar launch" in readme
    assert "not a live Windows recording benchmark" in readme
    assert "not signed or production-distributed yet" in readme


def test_public_docs_avoid_forbidden_overclaims() -> None:
    public_docs = [
        "README.md",
        "docs/demo-script.md",
        "docs/packaging.md",
        "docs/sample-report.md",
        "docs/eval-results.md",
        "docs/privacy.md",
        "docs/architecture.md",
    ]

    combined_text = "\n".join(read_text(path) for path in public_docs).lower()

    for forbidden_claim in FORBIDDEN_PUBLIC_CLAIMS:
        assert forbidden_claim not in combined_text


def test_packaging_docs_and_desktop_script_define_windows_nsis_build() -> None:
    package_json = json.loads(read_text("apps/desktop/package.json"))
    tauri_config = json.loads(read_text("apps/desktop/src-tauri/tauri.conf.json"))
    packaging_doc = read_text("docs/packaging.md")

    assert package_json["scripts"]["package:windows"] == "tauri build --bundles nsis"
    assert tauri_config["bundle"]["targets"] == ["nsis"]
    assert tauri_config["bundle"]["windows"]["nsis"]["installMode"] == "currentUser"
    assert "pnpm --dir apps/desktop package:windows" in packaging_doc
    assert "not code-signed" in packaging_doc
    assert "does not bundle the Python sidecar yet" in packaging_doc


def test_demo_script_is_truthful_about_current_implemented_demo() -> None:
    demo_script = read_text("docs/demo-script.md")

    assert "Current implemented demo" in demo_script
    assert "This is not a live recording demo yet." in demo_script
    assert "uv run --python 3.13 python scripts/evaluate_model.py" in demo_script
    assert "pnpm --dir apps/desktop build" in demo_script
    assert "live capture workers are not implemented yet" in demo_script


def test_sample_report_uses_cited_evidence_and_clear_limitations() -> None:
    sample_report = read_text("docs/sample-report.md")

    assert "No LLM was used for this sample report." in sample_report
    assert "Evidence: evt_" in sample_report
    assert "Known limitations" in sample_report
    assert "not a real captured Windows session" in sample_report


def test_eval_results_document_reproducible_command_and_aggregate() -> None:
    eval_results = read_text("docs/eval-results.md")

    assert "uv run --python 3.13 python scripts/evaluate_model.py" in eval_results
    assert "| aggregate | 1.00 | 1.00 | 1.00 | 0 | 0 |" in eval_results
    assert "deterministic estimates" in eval_results
    assert "not real Windows profiling" in eval_results


def read_text(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")
