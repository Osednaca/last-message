"""Category Mapper module.

Maps object labels detected by the Gemini Vision API to one of five
environmental impact categories: water, air, fauna, consumption, energy.
Unknown labels default to "consumption".
"""

VALID_CATEGORIES: set[str] = {"water", "air", "fauna", "consumption", "energy"}

CATEGORY_MAP: dict[str, str] = {
    # Water
    "river": "water",
    "ocean": "water",
    "lake": "water",
    "sea": "water",
    "waterfall": "water",
    "pond": "water",
    "stream": "water",
    "wave": "water",
    "rain": "water",
    "ice": "water",
    "glacier": "water",
    "coral": "water",
    "fish": "water",
    "whale": "water",
    "dolphin": "water",
    # Air
    "sky": "air",
    "cloud": "air",
    "wind turbine": "air",
    "airplane": "air",
    "smoke": "air",
    "chimney": "air",
    "smog": "air",
    "balloon": "air",
    "kite": "air",
    "bird": "air",
    "fog": "air",
    # Fauna
    "tree": "fauna",
    "flower": "fauna",
    "plant": "fauna",
    "forest": "fauna",
    "leaf": "fauna",
    "grass": "fauna",
    "dog": "fauna",
    "cat": "fauna",
    "deer": "fauna",
    "butterfly": "fauna",
    "bee": "fauna",
    "mushroom": "fauna",
    "garden": "fauna",
    # Consumption
    "bottle": "consumption",
    "plastic bag": "consumption",
    "cup": "consumption",
    "food": "consumption",
    "trash": "consumption",
    "packaging": "consumption",
    "shopping bag": "consumption",
    "can": "consumption",
    "wrapper": "consumption",
    "straw": "consumption",
    "clothing": "consumption",
    "shoe": "consumption",
    "phone": "consumption",
    # Energy
    "car": "energy",
    "truck": "energy",
    "bus": "energy",
    "motorcycle": "energy",
    "factory": "energy",
    "power line": "energy",
    "solar panel": "energy",
    "battery": "energy",
    "light bulb": "energy",
    "gas station": "energy",
    "oil": "energy",
    "coal": "energy",
    "electricity": "energy",
}


def map_to_category(label: str) -> str:
    """Map an object label to an environmental impact category.

    Performs case-insensitive matching with whitespace trimming.
    Returns "consumption" for any label not found in the mapping table.

    Args:
        label: The object label string to map.

    Returns:
        One of the five valid categories: water, air, fauna, consumption, energy.
    """
    return CATEGORY_MAP.get(label.lower().strip(), "consumption")
