from fastapi import APIRouter
from inference_server.schemas import ReviewRequest, Prediction, PredictionsResponse

predict_router = APIRouter()


@predict_router.post("/predict")
def predict(request:ReviewRequest):
    predictions = []
    for item in request.data:
        if item.id == 1:
            predictions.append(Prediction(
                id=item.id,
                topics=["Обслуживание", "Мобильное приложение"],
                sentiments=["положительно", "отрицательно"]
            ))
        else:
            predictions.append(Prediction(
                id=item.id,
                topics=["Кредитная карта"],
                sentiments=["нейтрально"]
            ))
    return PredictionsResponse(predictions=predictions)