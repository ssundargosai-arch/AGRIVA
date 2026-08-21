from typing import List, Dict


CROP_DATABASE: List[Dict] = [
    {
        "crop": "Wheat",
        "ph_min": 6.0,
        "ph_max": 7.5,
        "n_min": 40,
        "n_max": 100,
        "p_min": 20,
        "p_max": 60,
        "k_min": 20,
        "k_max": 80,
        "rainfall_min": 300,
        "rainfall_max": 900,
        "water": "Medium",
        "duration": "120–150 days",
        "yield": "22–26 Quintal/Acre",
        "profit": "₹28,000–₹36,000/Acre",
        "market": "High",
        "risk": "Low",
        "seasons": ["Rabi"],
    },
    {
        "crop": "Rice",
        "ph_min": 5.5,
        "ph_max": 7.0,
        "n_min": 50,
        "n_max": 120,
        "p_min": 20,
        "p_max": 60,
        "k_min": 20,
        "k_max": 80,
        "rainfall_min": 800,
        "rainfall_max": 2000,
        "water": "High",
        "duration": "120–160 days",
        "yield": "20–28 Quintal/Acre",
        "profit": "₹24,000–₹40,000/Acre",
        "market": "High",
        "risk": "Medium",
        "seasons": ["Kharif"],
    },
    {
        "crop": "Maize",
        "ph_min": 5.5,
        "ph_max": 7.5,
        "n_min": 40,
        "n_max": 100,
        "p_min": 20,
        "p_max": 60,
        "k_min": 20,
        "k_max": 80,
        "rainfall_min": 500,
        "rainfall_max": 1000,
        "water": "Medium",
        "duration": "90–120 days",
        "yield": "20–30 Quintal/Acre",
        "profit": "₹25,000–₹42,000/Acre",
        "market": "High",
        "risk": "Medium",
        "seasons": ["Kharif", "Rabi"],
    },
    {
        "crop": "Mustard",
        "ph_min": 6.0,
        "ph_max": 7.5,
        "n_min": 30,
        "n_max": 80,
        "p_min": 15,
        "p_max": 50,
        "k_min": 20,
        "k_max": 70,
        "rainfall_min": 250,
        "rainfall_max": 600,
        "water": "Low",
        "duration": "110–140 days",
        "yield": "8–12 Quintal/Acre",
        "profit": "₹20,000–₹34,000/Acre",
        "market": "High",
        "risk": "Low",
        "seasons": ["Rabi"],
    },
    {
        "crop": "Potato",
        "ph_min": 5.0,
        "ph_max": 7.0,
        "n_min": 50,
        "n_max": 120,
        "p_min": 30,
        "p_max": 80,
        "k_min": 40,
        "k_max": 100,
        "rainfall_min": 300,
        "rainfall_max": 700,
        "water": "Medium",
        "duration": "80–120 days",
        "yield": "80–120 Quintal/Acre",
        "profit": "₹35,000–₹60,000/Acre",
        "market": "High",
        "risk": "Medium",
        "seasons": ["Rabi"],
    },
]


def range_score(value: float, minimum: float, maximum: float) -> float:
    if minimum <= value <= maximum:
        return 100.0

    distance = (
        minimum - value
        if value < minimum
        else value - maximum
    )

    width = max(maximum - minimum, 1)

    score = 100 - (distance / width) * 100

    return max(0.0, min(100.0, score))


def calculate_crop_match(data, crop) -> float:
    scores = [
        range_score(data.ph, crop["ph_min"], crop["ph_max"]),
        range_score(data.nitrogen, crop["n_min"], crop["n_max"]),
        range_score(data.phosphorus, crop["p_min"], crop["p_max"]),
        range_score(data.potassium, crop["k_min"], crop["k_max"]),
        range_score(
            data.rainfall,
            crop["rainfall_min"],
            crop["rainfall_max"],
        ),
    ]

    season_score = (
        100
        if data.season in crop["seasons"]
        else 50
    )

    water_score = 100

    if data.water_availability.lower() == "low":
        water_score = 100 if crop["water"] == "Low" else 60

    elif data.water_availability.lower() == "medium":
        water_score = 100 if crop["water"] in ["Low", "Medium"] else 70

    elif data.water_availability.lower() == "high":
        water_score = 100

    scores.extend([season_score, water_score])

    return round(sum(scores) / len(scores), 1)


def recommend_crops(data):
    results = []

    for crop in CROP_DATABASE:
        match = calculate_crop_match(data, crop)

        results.append(
            {
                "crop": crop["crop"],
                "match_percentage": match,
                "expected_yield": crop["yield"],
                "expected_profit": crop["profit"],
                "water_requirement": crop["water"],
                "growing_duration": crop["duration"],
                "market_demand": crop["market"],
                "risk": crop["risk"],
            }
        )

    results.sort(
        key=lambda item: item["match_percentage"],
        reverse=True,
    )

    return results[:5]