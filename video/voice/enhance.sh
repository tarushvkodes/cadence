#!/bin/sh
# Cleans the narration: DeepFilterNet removes the room noise, then EQ, de-essing, compression and a
# two-pass loudness match. Length is preserved. ATTEN, when set, caps the noise removal at that many dB:
# on a noisy recording the full removal smears consonants.
set -eu
SRC="$1"; OUT="$2"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ffmpeg -y -loglevel error -i "$SRC" -ar 48000 -ac 1 "$TMP/raw.wav"
uvx -q --python 3.11 --from deepfilternet --with 'torch<2.6' --with 'torchaudio<2.6' --with soundfile \
  deepFilter "$TMP/raw.wav" ${ATTEN:+-a "$ATTEN"} -o "$TMP/df" >/dev/null 2>&1
TONE="highpass=f=75,equalizer=f=260:t=q:w=1.1:g=-2.5,equalizer=f=3600:t=q:w=1.2:g=2.5,highshelf=f=9000:g=2,deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-24dB:ratio=3:attack=6:release=140:knee=6:makeup=1"
STATS="$(ffmpeg -hide_banner -nostats -i "$TMP/df/raw_DeepFilterNet3.wav" -af "$TONE,loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
val() { printf '%s' "$STATS" | sed -n "s/.*\"$1\" : \"\\(.*\\)\".*/\\1/p"; }
ffmpeg -y -loglevel error -i "$TMP/df/raw_DeepFilterNet3.wav" -af "$TONE,loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true,alimiter=limit=0.84:level=false:attack=3:release=60" -ar 48000 -ac 1 "$OUT"
