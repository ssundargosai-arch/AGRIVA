from typing import Literal

from pydantic import BaseModel, Field


class AGRIVAAIMessage(BaseModel):
    role: Literal[
        "user",
        "assistant",
    ]

    content: str = Field(
        min_length=1,
        max_length=2000,
    )


class AGRIVAAIRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
    )

    history: list[
        AGRIVAAIMessage
    ] = Field(
        default_factory=list,
        max_length=12,
    )

    language: Literal[
        "en",
        "hi",
    ] = "en"


class AGRIVAAIResponse(BaseModel):
    answer: str
    source: str
    context_used: list[str]