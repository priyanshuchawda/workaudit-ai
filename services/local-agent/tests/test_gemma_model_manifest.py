from __future__ import annotations

import sys
from pathlib import Path

import pytest

from worktrace_agent.ai.gemma_manifest import (
    DEFAULT_GEMMA_REPORT_MODEL,
    build_gemma_report_availability_config,
    build_gemma_report_runtime_config,
)
from worktrace_agent.ai.model_availability import (
    ModelFailureCategory,
    ModelProvider,
    ModelStatus,
    check_model_availability,
)

HEAVY_MODEL_MODULES = (
    "torch",
    "transformers",
    "llama_cpp",
    "ollama",
)


def test_default_gemma_report_model_uses_e2b_q4_budget() -> None:
    manifest = DEFAULT_GEMMA_REPORT_MODEL

    assert manifest.key == "gemma4-e2b-it-q4"
    assert manifest.display_name == "Gemma 4 E2B-it Q4"
    assert manifest.ollama_model == "gemma4:e2b"
    assert manifest.hugging_face_model_id == "google/gemma-4-E2B-it"
    assert manifest.quantization == "Q4_0"
    assert manifest.mode == "default"
    assert manifest.context_budget_tokens == 8192
    assert manifest.max_tested_context_budget_tokens == 16384
    assert manifest.max_input_chars == 32000
    assert manifest.max_output_tokens == 512
    assert manifest.temperature == 0.2
    assert manifest.auto_download_allowed is False
    assert manifest.download_spec is None
    assert "does not download" in manifest.safety_note


def test_default_gemma_runtime_config_uses_ollama_e2b_tag() -> None:
    config = build_gemma_report_runtime_config(base_url="http://127.0.0.1:11434")

    assert config.base_url == "http://127.0.0.1:11434"
    assert config.model_name == "gemma4:e2b"
    assert config.context_budget_tokens == 8192
    assert config.max_input_chars == 32000
    assert config.max_output_tokens == 512
    assert config.temperature == 0.2
    assert config.mode == "default"


def test_default_gemma_runtime_config_rejects_full_128k_context() -> None:
    with pytest.raises(ValueError, match="context"):
        build_gemma_report_runtime_config(
            base_url="http://127.0.0.1:11434",
            context_budget_tokens=128000,
        )


def test_default_gemma_runtime_config_rejects_16k_until_non_default_mode_exists() -> None:
    with pytest.raises(ValueError, match="Default Gemma"):
        build_gemma_report_runtime_config(
            base_url="http://127.0.0.1:11434",
            context_budget_tokens=16384,
        )


def test_default_gemma_runtime_config_rejects_zero_context_budget() -> None:
    with pytest.raises(ValueError, match="greater than zero"):
        build_gemma_report_runtime_config(
            base_url="http://127.0.0.1:11434",
            context_budget_tokens=0,
        )


def test_gemma_availability_config_maps_missing_model_to_not_installed(
    tmp_path: Path,
) -> None:
    availability = check_model_availability(
        build_gemma_report_availability_config(model_path=tmp_path / "missing.gguf")
    )

    assert availability.model_name == "gemma4:e2b"
    assert availability.provider is ModelProvider.LOCAL_FILE
    assert availability.status is ModelStatus.NOT_INSTALLED
    assert availability.failure_category is ModelFailureCategory.NOT_INSTALLED
    assert availability.can_generate_report is False
    assert availability.can_record is True
    assert availability.can_build_timeline is True
    assert availability.can_export is True


def test_gemma_manifest_helpers_do_not_import_heavy_model_modules() -> None:
    for module_name in HEAVY_MODEL_MODULES:
        sys.modules.pop(module_name, None)

    build_gemma_report_runtime_config(base_url="http://localhost:11434")
    build_gemma_report_availability_config(model_path=None)

    assert not any(module_name in sys.modules for module_name in HEAVY_MODEL_MODULES)
