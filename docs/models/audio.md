# Audio Model Policy

Audio transcription is optional evidence enrichment, not a recorder dependency.

Current faster-whisper adapter notes:

- Audio transcription is disabled by default.
- WorkTrace does not add always-on microphone capture.
- Only explicit audio segments may be transcribed.
- Private mode suppresses transcription before any engine call.
- Transcript text and metadata are redacted before storage/report use.
- Transcript evidence must cite the audio segment or source event ID.
- Default metadata target: faster-whisper `base`, CPU, `int8`.
- Manual-only metadata target: Distil-Whisper `distil-large-v3`, CPU, `int8`.
- The real faster-whisper binding imports `faster_whisper` only inside the transcription call.
- The real faster-whisper binding requires an explicit local model path before import so it does not trigger faster-whisper model-size auto-download behavior.
- Runtime availability/config helpers do not import `faster_whisper`, `torch`, `transformers`, or `ctranslate2`.
- No faster-whisper model is bundled, downloaded, or started by WorkTrace.
- No real faster-whisper smoke or CPU/RAM benchmark has been run for this adapter yet.

Future audio work must keep recording usable without audio models, require explicit opt-in, and avoid transcript claims unless evidence IDs are present.
