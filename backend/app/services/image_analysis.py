import hashlib


DISEASE_DATABASE = [
    {
        "crop": "Wheat",
        "possible_disease": "Leaf Rust",
        "severity": "Medium",
        "recommendations": [
            "Remove heavily affected leaves.",
            "Avoid excessive nitrogen application.",
            "Monitor nearby plants for spread.",
            "Consult a local agriculture expert before fungicide use.",
        ],
    },
    {
        "crop": "Rice",
        "possible_disease": "Leaf Blast",
        "severity": "High",
        "recommendations": [
            "Maintain proper field drainage.",
            "Avoid excessive nitrogen fertilizer.",
            "Remove severely affected plant material.",
            "Use locally recommended treatment after expert advice.",
        ],
    },
    {
        "crop": "Maize",
        "possible_disease": "Leaf Blight",
        "severity": "Medium",
        "recommendations": [
            "Remove infected crop residue.",
            "Improve airflow around plants.",
            "Monitor disease progression.",
            "Use locally suitable resistant varieties.",
        ],
    },
    {
        "crop": "Potato",
        "possible_disease": "Early Blight",
        "severity": "Medium",
        "recommendations": [
            "Remove infected leaves.",
            "Avoid overhead irrigation.",
            "Maintain balanced crop nutrition.",
            "Seek expert advice if infection increases.",
        ],
    },
]


def image_seed(content: bytes) -> int:
    digest = hashlib.sha256(content).hexdigest()

    return int(
        digest[:8],
        16,
    )


def demo_crop_disease(content: bytes) -> dict:
    seed = image_seed(content)

    item = DISEASE_DATABASE[
        seed % len(DISEASE_DATABASE)
    ]

    confidence = 70 + (seed % 26)

    return {
        "crop": item["crop"],
        "possible_disease": item[
            "possible_disease"
        ],
        "confidence": float(confidence),
        "severity": item["severity"],
        "recommendations": item[
            "recommendations"
        ],
        "demo_prediction": True,
        "model_note": (
            "Demo prediction generated using deterministic "
            "AGRIVA rules. This is not a trained vision model."
        ),
    }


def demo_crop_quality(content: bytes) -> dict:
    seed = image_seed(content)

    quality_score = 65 + (seed % 35)

    if quality_score >= 92:
        grade = "A+"

    elif quality_score >= 82:
        grade = "A"

    elif quality_score >= 72:
        grade = "B"

    else:
        grade = "C"

    ripeness_values = [
        "Optimal",
        "Nearly Ripe",
        "Ripe",
        "Overripe",
    ]

    defect_values = [
        ["No major visible defects"],
        ["Minor surface spots"],
        ["Minor discoloration"],
        ["Uneven appearance"],
    ]

    ripeness = ripeness_values[
        seed % len(ripeness_values)
    ]

    defects = defect_values[
        seed % len(defect_values)
    ]

    if grade in ["A+", "A"]:
        market_suitability = "Premium Market"

    elif grade == "B":
        market_suitability = "General Market"

    else:
        market_suitability = (
            "Processing / Local Market"
        )

    return {
        "quality_score": float(
            quality_score
        ),
        "grade": grade,
        "ripeness": ripeness,
        "defects": defects,
        "market_suitability": (
            market_suitability
        ),
        "demo_prediction": True,
        "model_note": (
            "Demo quality grading generated using deterministic "
            "AGRIVA rules. This is not a trained vision model."
        ),
    }