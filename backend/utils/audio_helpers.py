# audio_helpers.py
#
# This file is intentionally empty.
#
# The utility functions previously here (bytes_to_numpy, normalize_audio,
# ensure_mono, trim_silence, numpy_to_wav_bytes, compute_audio_duration)
# were never imported or called anywhere in the backend. Each audio module
# handles its own conversions directly:
#   - transcriber.py has its own _numpy_to_wav_bytes (private)
#   - websocket.py reads raw bytes via np.frombuffer directly
#   - analyzer.py and processor.py receive numpy arrays from upstream
#
# Kept as an empty module so any future audio utility functions have a
# clear home without requiring new package structure.j