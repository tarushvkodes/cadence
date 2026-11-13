#!/bin/sh
# Speaks new text in the narrator's voice with Qwen3-TTS on MLX (Apple Silicon, runs locally).
# The reference is a clean stretch of the enhanced narration plus its exact words.
#   sh voice/clone.sh "Text to say." out/line.wav
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
TEXT="$1"; OUT="$2"
REF="$HERE/../public/voice/ref.wav"
REF_TEXT="Here's the idea. Your phase doesn't change what you're capable of, but how you feel can change, and that's different for everyone. So, Cadence plans around what you log, instead of a guess from the calendar."
[ -f "$REF" ] || ffmpeg -y -loglevel error -ss 5.45 -to 16.6 -i "$HERE/../public/voice/narration.wav" -ar 24000 -ac 1 "$REF"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
uvx -q --python 3.12 --from mlx-audio python -m mlx_audio.tts.generate \
  --model mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit --lang_code en \
  --ref_audio "$REF" --ref_text "$REF_TEXT" --text "$TEXT" \
  --output_path "$TMP" --file_prefix line >/dev/null 2>&1
ffmpeg -y -loglevel error -i "$TMP/line_000.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -ac 1 "$OUT"
