from pydantic import BaseModel


class AGRIVAAIRequest(BaseModel):
    question: str


class AGRIVAAIResponse(BaseModel):
    answer: str
    source: str
    context_used: list[str]