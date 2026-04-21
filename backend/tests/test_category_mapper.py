"""Unit tests for the Category Mapper module."""

from services.category_mapper import CATEGORY_MAP, VALID_CATEGORIES, map_to_category


class TestCategoryMapConstants:
    """Tests for module-level constants."""

    def test_valid_categories_contains_five_categories(self):
        assert VALID_CATEGORIES == {"water", "air", "fauna", "consumption", "energy"}

    def test_all_mapped_values_are_valid_categories(self):
        for label, category in CATEGORY_MAP.items():
            assert category in VALID_CATEGORIES, (
                f"Label '{label}' maps to invalid category '{category}'"
            )

    def test_every_category_has_at_least_five_mappings(self):
        counts: dict[str, int] = {cat: 0 for cat in VALID_CATEGORIES}
        for category in CATEGORY_MAP.values():
            counts[category] += 1
        for cat, count in counts.items():
            assert count >= 5, (
                f"Category '{cat}' has only {count} mappings, expected at least 5"
            )


class TestMapToCategory:
    """Tests for the map_to_category function."""

    def test_bottle_maps_to_consumption(self):
        assert map_to_category("bottle") == "consumption"

    def test_tree_maps_to_fauna(self):
        assert map_to_category("tree") == "fauna"

    def test_car_maps_to_energy(self):
        assert map_to_category("car") == "energy"

    def test_sky_maps_to_air(self):
        assert map_to_category("sky") == "air"

    def test_river_maps_to_water(self):
        assert map_to_category("river") == "water"

    def test_unknown_label_returns_consumption(self):
        assert map_to_category("xylophone") == "consumption"

    def test_empty_string_returns_consumption(self):
        assert map_to_category("") == "consumption"

    def test_case_insensitivity_uppercase(self):
        assert map_to_category("Bottle") == "consumption"

    def test_case_insensitivity_all_caps(self):
        assert map_to_category("TREE") == "fauna"

    def test_case_insensitivity_mixed(self):
        assert map_to_category("RiVeR") == "water"

    def test_whitespace_trimming_leading(self):
        assert map_to_category("  bottle") == "consumption"

    def test_whitespace_trimming_trailing(self):
        assert map_to_category("bottle  ") == "consumption"

    def test_whitespace_trimming_both(self):
        assert map_to_category("  bottle  ") == "consumption"

    def test_whitespace_and_case_combined(self):
        assert map_to_category("  SKY  ") == "air"

    def test_return_value_is_always_in_valid_categories(self):
        test_labels = ["bottle", "tree", "car", "sky", "river", "unknown", "", "  "]
        for label in test_labels:
            result = map_to_category(label)
            assert result in VALID_CATEGORIES, (
                f"map_to_category('{label}') returned '{result}' which is not a valid category"
            )
