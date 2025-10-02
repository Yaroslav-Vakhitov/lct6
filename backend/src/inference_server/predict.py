import os
from fastapi import APIRouter
from inference_server.schemas import ReviewRequest, Prediction, PredictionsResponse
from inference_server.model.model import ReviewModelWrapper

predict_router = APIRouter()

directory = os.path.join(os.getcwd(), "model/weights")
wrapper = ReviewModelWrapper(
        cat_model_path=os.path.join(directory, '18_cat_classifier_full_data.cbm'),
        sent_model_path=os.path.join(directory, 'sent_classifier_3_classes.cbm'),
        cnn_model_path=os.path.join(directory, '100ep_full_data_model.pth')
    )
TOPIC_LABELS = {
    1: 'Дебетовые карты',
    2: 'Кредитные карты',
    3: 'Вклады',
    4: 'Накопительные счета',
    5: 'Потребительские кредиты',
    6: 'Ипотека',
    7: 'Страхование',
    8: 'Денежные переводы, СБП',
    9: 'Интернет-банк, мобильный банк и приложение',
    10: 'Премиум-обслуживание',
    11: 'Работа колл-центра и клиентского сервиса',
    12: 'Безопасность и защита',
    13: 'Общее впечатление о банке',
    14: 'Кэшбэк, промокоды, бонусы, акции, приведи друга',
    15: 'Прочие банковские услуги и сервисы',
    16: 'Сравнение с конкурентами',
    17: 'Тарифы, комиссии, прозрачность условий',
    18: 'Эскалация и угроза жалоб'
}
SENTIMENT_LABELS = {
    1: "плохо",
    2: "нейтрально",
    3: "хорошо",
}


@predict_router.post("/predict")
def predict(request: ReviewRequest) -> PredictionsResponse:
    predictions_texts = [review.text for review in request.data]
    result = []
    model_predict = wrapper.predict_reviews_batch(
        predictions_texts
    )
    for index_prediction in len(model_predict):
        result.append(
            Prediction(
                id=index_prediction+1,
                topics=[TOPIC_LABELS[topic] for topic in model_predict[index_prediction]["categories"]],
                sentiments=SENTIMENT_LABELS[model_predict[index_prediction]["sentiment"]]
            )
        )
    return PredictionsResponse(predictions=result)