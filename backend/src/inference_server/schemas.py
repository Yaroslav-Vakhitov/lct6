from pydantic import BaseModel


class Review(BaseModel):
    id: int
    text: str


class ReviewRequest(BaseModel):
    data: list[Review]


class Prediction(BaseModel):
    id: int
    topics: list[str]
    sentiments: list[str]


class PredictionsResponse(BaseModel):
    predictions: list[Prediction]
