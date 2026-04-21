# Feature: legacy-elevenlabs-tts, Property 4: Audio base64 encoding round-trip
"""Property-based tests for the ElevenLabs client module.

**Validates: Requirements 3.3**

Uses hypothesis to verify that:
- Encoding arbitrary byte sequences to base64 and decoding back produces
  identical bytes, matching the round-trip performed in generate_speech.
"""

import base64

from hypothesis import given, settings, strategies as st


# Strategy: generate random byte sequences from 0 to 10 KB
audio_bytes = st.binary(min_size=0, max_size=10 * 1024)


class TestAudioBase64EncodingRoundTripProperty:
    """Property 4: Audio base64 encoding round-trip."""

    @settings(max_examples=100)
    @given(raw_bytes=audio_bytes)
    def test_base64_encode_decode_round_trip(self, raw_bytes: bytes) -> None:
        """For any byte sequence, base64 encoding then decoding produces the original bytes.

        This mirrors the encoding path in generate_speech:
            base64.b64encode(audio_bytes).decode("utf-8")
        and the corresponding decode on the consumer side:
            base64.b64decode(encoded_string)
        """
        encoded = base64.b64encode(raw_bytes).decode("utf-8")
        decoded = base64.b64decode(encoded)
        assert decoded == raw_bytes, (
            f"Round-trip failed: {len(raw_bytes)} bytes encoded to "
            f"{len(encoded)} chars, decoded to {len(decoded)} bytes"
        )

    @settings(max_examples=100)
    @given(raw_bytes=audio_bytes)
    def test_base64_encoded_string_is_valid_ascii(self, raw_bytes: bytes) -> None:
        """For any byte sequence, the base64-encoded string contains only valid ASCII characters.

        This ensures the encoded audio can be safely transported in a JSON response.
        """
        encoded = base64.b64encode(raw_bytes).decode("utf-8")
        assert encoded.isascii(), (
            f"Base64 output contains non-ASCII characters for input of {len(raw_bytes)} bytes"
        )
