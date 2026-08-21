from typing import Protocol

from app.schemas.agriva_ai import (
    AGRIVAAIResponse,
)


class AGRIVAAIService(Protocol):
    def answer(
        self,
        *,
        question: str,
        context: dict,
    ) -> AGRIVAAIResponse:
        ...


class DemoAIService:
    def answer(
        self,
        *,
        question: str,
        context: dict,
    ) -> AGRIVAAIResponse:
        text = question.strip().lower()

        context_used = [
            key
            for key, value in context.items()
            if value
        ]

        if (
            "what crop" in text
            or "crop should i grow" in text
        ):
            answer = (
                "Based on the available "
                "soil and farm context, "
                "consider crops suited to "
                "your soil type and season. "
                "For loamy soil, wheat, "
                "mustard, vegetables, and "
                "pulses are common options."
            )

        elif (
            "seed" in text
            and "best" in text
        ):
            answer = (
                "Choose certified seed with "
                "high germination percentage, "
                "disease resistance, and a "
                "variety recommended for your "
                "district and sowing season."
            )

        elif (
            "yellow" in text
            or "leaves yellow" in text
        ):
            answer = (
                "Yellow leaves may result "
                "from nitrogen deficiency, "
                "water stress, poor drainage, "
                "or disease. Check soil "
                "moisture and recent nutrient "
                "application first."
            )

        elif (
            "irrigate" in text
            or "irrigation" in text
        ):
            weather = context.get(
                "weather"
            )

            if weather:
                answer = (
                    "Use the current weather "
                    "and rain forecast before "
                    "irrigating. If rain "
                    "probability is high, delay "
                    "irrigation. Otherwise "
                    "irrigate early morning or "
                    "late evening."
                )
            else:
                answer = (
                    "Irrigate according to soil "
                    "moisture and crop stage, "
                    "preferably early morning "
                    "or late evening."
                )

        elif (
            "sell" in text
            or "sell now" in text
        ):
            answer = (
                "Check current market price, "
                "your expected price, crop "
                "quality, buyer offers, and "
                "storage risk before selling."
            )

        elif (
            "buyer" in text
            and "best" in text
        ):
            answer = (
                "The best buyer should balance "
                "offer price, quantity demand, "
                "distance, payment reliability, "
                "and buyer rating."
            )

        else:
            answer = (
                "I can help with crop choice, "
                "seed selection, crop symptoms, "
                "irrigation, selling decisions, "
                "buyers, soil, weather, and "
                "farm planning."
            )

        return AGRIVAAIResponse(
            answer=answer,
            source="demo_ai",
            context_used=context_used,
        )