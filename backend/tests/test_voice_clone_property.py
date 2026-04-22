# Feature: legacy-voice-imprint, Property 1: Base64 audio encoding round-trip
"""Property-based tests for the voice clone module.

**Validates: Requirements 3.4**

Uses hypothesis to verify that encoding arbitrary byte sequences to base64
and decoding back produces identical bytes, matching the round-trip performed
in clone_voice_and_generate.
"""

import base64

from hypothesis import given, settings, strategies as st


# Strategy: generate random byte sequences from 0 to 10 KB
audio_bytes_strategy = st.binary(min_size=0, max_size=10 * 1024)


class TestBase64AudioEncodingRoundTrip:
    """Property 1: Base64 audio encoding round-trip.

    For any sequence of audio bytes returned by the ElevenLabs TTS API,
    encoding to base64 and then decoding back to bytes SHALL produce
    the original byte sequence.

    **Validates: Requirements 3.4**
    """

    @settings(max_examples=100)
    @given(raw_bytes=audio_bytes_strategy)
    def test_base64_encode_decode_round_trip(self, raw_bytes: bytes) -> None:
        """For any byte sequence, base64 encoding then decoding produces the original bytes.

        This mirrors the encoding path in clone_voice_and_generate:
            base64.b64encode(result_bytes).decode("utf-8")
        and the corresponding decode on the consumer side:
            base64.b64decode(encoded_string)
        """
        encoded = base64.b64encode(raw_bytes).decode("utf-8")
        decoded = base64.b64decode(encoded)
        assert decoded == raw_bytes, (
            f"Round-trip failed: {len(raw_bytes)} bytes encoded to "
            f"{len(encoded)} chars, decoded to {len(decoded)} bytes"
        )


# Feature: legacy-voice-imprint, Property 2: Voice clone cleanup invariant
"""
**Validates: Requirements 3.8, 9.5**

Uses hypothesis to verify that voices.delete is always called with the
voice_id whenever a voice clone was successfully created, regardless of
whether the subsequent TTS generation succeeds or fails.
"""

from unittest.mock import MagicMock, patch

from hypothesis import given, settings, strategies as st

from services.elevenlabs_client import (
    ElevenLabsTTSError,
    clone_voice_and_generate,
)


# Strategy: generate random scenarios — True means TTS succeeds, False means it fails
tts_outcome_strategy = st.booleans()

# Strategy: random voice_id strings (non-empty)
voice_id_strategy = st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N")))

# Strategy: random audio bytes for the voice sample
sample_audio_strategy = st.binary(min_size=1, max_size=1024)

# Strategy: random text for TTS
tts_text_strategy = st.text(min_size=1, max_size=200)

# Strategy: random filename
filename_strategy = st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("L", "N"))).map(
    lambda s: s + ".webm"
)


class TestVoiceCloneCleanupInvariant:
    """Property 2: Voice clone cleanup invariant.

    For any request that successfully creates a voice clone (receives a
    voice_id), the system SHALL call voices.delete(voice_id) regardless
    of whether the subsequent TTS generation succeeds or fails.

    **Validates: Requirements 3.8, 9.5**
    """

    @settings(max_examples=100)
    @given(
        tts_succeeds=tts_outcome_strategy,
        voice_id=voice_id_strategy,
        audio_sample=sample_audio_strategy,
        text=tts_text_strategy,
        filename=filename_strategy,
    )
    def test_voices_delete_always_called_after_clone(
        self,
        tts_succeeds: bool,
        voice_id: str,
        audio_sample: bytes,
        text: str,
        filename: str,
    ) -> None:
        """voices.delete(voice_id) is always called when a voice_id was obtained,
        regardless of TTS success or failure.

        This mirrors the try/finally pattern in clone_voice_and_generate:
        the finally block must always call client.voices.delete(voice_id=voice_id).
        """
        mock_client = MagicMock()

        # Configure the clone response to return the generated voice_id
        mock_clone_response = MagicMock()
        mock_clone_response.voice_id = voice_id
        mock_client.voices.ivc.create.return_value = mock_clone_response

        if tts_succeeds:
            # TTS returns some audio bytes
            mock_client.text_to_speech.convert.return_value = iter([b"fake-audio-data"])
        else:
            # TTS raises an exception
            mock_client.text_to_speech.convert.side_effect = Exception("TTS failed")

        with patch.dict("os.environ", {"ELEVENLABS_API_KEY": "test-key"}):
            with patch("services.elevenlabs_client.ElevenLabs", return_value=mock_client):
                if tts_succeeds:
                    # Should succeed and return base64 audio
                    clone_voice_and_generate(audio_sample, filename, text)
                else:
                    # Should raise ElevenLabsTTSError but still clean up
                    try:
                        clone_voice_and_generate(audio_sample, filename, text)
                    except ElevenLabsTTSError:
                        pass  # Expected — TTS failure is the scenario under test

        # INVARIANT: voices.delete must always be called with the voice_id
        mock_client.voices.delete.assert_called_once_with(voice_id=voice_id)
