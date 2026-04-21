# Feature: last-message-echoes, Property 1: Category mapping correctness
"""Property-based tests for the Category Mapper module.

**Validates: Requirements 3.3, 3.4, 4.2, 4.3, 4.4**

Uses hypothesis to verify that:
- Known labels always map to their correct category
- Unknown labels always default to "consumption"
- Mapping is idempotent (same input always produces same output)
"""

from hypothesis import given, settings, strategies as st

from services.category_mapper import CATEGORY_MAP, VALID_CATEGORIES, map_to_category


# Strategy: pick a random known label from the mapping table
known_labels = st.sampled_from(list(CATEGORY_MAP.keys()))

# Strategy: generate arbitrary strings that are NOT in the mapping table
# We filter out strings whose normalized form (lower + strip) matches a known key
_known_normalized = {k.lower().strip() for k in CATEGORY_MAP.keys()}
unknown_labels = st.text(min_size=1).filter(
    lambda s: s.lower().strip() not in _known_normalized
)


class TestCategoryMappingCorrectnessProperty:
    """Property 1: Category mapping correctness."""

    @settings(max_examples=100)
    @given(label=known_labels)
    def test_known_labels_map_to_correct_category(self, label: str) -> None:
        """For any known label, map_to_category returns the expected category."""
        result = map_to_category(label)
        expected = CATEGORY_MAP[label]
        assert result == expected, (
            f"Expected '{label}' -> '{expected}', got '{result}'"
        )
        assert result in VALID_CATEGORIES

    @settings(max_examples=100)
    @given(label=unknown_labels)
    def test_unknown_labels_default_to_consumption(self, label: str) -> None:
        """For any string not in the mapping table, map_to_category returns 'consumption'."""
        result = map_to_category(label)
        assert result == "consumption", (
            f"Unknown label '{label}' should map to 'consumption', got '{result}'"
        )

    @settings(max_examples=100)
    @given(label=known_labels)
    def test_idempotence_known_labels(self, label: str) -> None:
        """Calling map_to_category multiple times with the same known label produces the same result."""
        first = map_to_category(label)
        second = map_to_category(label)
        third = map_to_category(label)
        assert first == second == third, (
            f"Idempotence violated for '{label}': {first}, {second}, {third}"
        )

    @settings(max_examples=100)
    @given(label=unknown_labels)
    def test_idempotence_unknown_labels(self, label: str) -> None:
        """Calling map_to_category multiple times with the same unknown label produces the same result."""
        first = map_to_category(label)
        second = map_to_category(label)
        third = map_to_category(label)
        assert first == second == third, (
            f"Idempotence violated for '{label}': {first}, {second}, {third}"
        )
