import os
import re
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from catboost import CatBoostClassifier, Pool

# ------------------------ PREPROCESSING ------------------------
ABBREVIATIONS = {
    "ул.", "г.", "д.", "т.д.", "т.п.", "т.е.", "и т.д.", "и т.п.",
    "см.", "мин.", "руб.", "коп.", "рис.", "стр.", "обл.", "р-н",
    "просп.", "пер.", "бул.", "реф.", "тех.", "эл.", "смс", "др.", "т.к."
}
DATE_PATTERN = re.compile(r"\b\d{1,2}\.\d{1,2}\.\d{2,4}\b")


class TextProcessor:
    """Предобработка текста и разбиение на предложения."""

    @staticmethod
    def protect_dates(text: str):
        dates = DATE_PATTERN.findall(text)
        for i, d in enumerate(dates):
            text = text.replace(d, f"§DATE{i}§", 1)
        return text, dates

    @staticmethod
    def restore_dates(text: str, dates):
        for i, d in enumerate(dates):
            text = text.replace(f"§DATE{i}§", d, 1)
        return text

    @staticmethod
    def clean_text(text: str) -> str:
        text = re.sub(r"\s+([,.!?;:])", r"\1", text)
        text = re.sub(r"\s{2,}", " ", text)
        return text.strip()

    @staticmethod
    def split_sentences(text: str):
        text = TextProcessor.clean_text(text)
        text, dates = TextProcessor.protect_dates(text)
        parts = re.split(r'(?<=[.!?])\s+', text)
        sentences = []
        for part in parts:
            if not part:
                continue
            if sentences:
                prev = sentences[-1]
                if prev.endswith(tuple(ABBREVIATIONS)) or (prev.endswith(".") and part[0].islower()):
                    sentences[-1] = prev + " " + part
                    continue
                if prev.endswith(")") and part[0].islower():
                    sentences[-1] = prev + " " + part
                    continue
            sentences.append(part)
        sentences = [TextProcessor.restore_dates(s, dates).strip() for s in sentences if s.strip()]
        return sentences


# ------------------------ CNN MODEL ------------------------
class ReviewCNN1D(nn.Module):
    def __init__(self, num_categories=18, num_sentiments=3, hidden_dim=128, num_filters=64, kernel_size=3, dropout=0.3):
        super().__init__()
        self.num_categories = num_categories
        self.num_sentiments = num_sentiments
        input_dim = num_categories + num_sentiments

        self.conv1d = nn.Sequential(
            nn.Conv1d(input_dim, num_filters, kernel_size, padding=kernel_size // 2),
            nn.BatchNorm1d(num_filters),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        self.global_avg_pool = nn.AdaptiveAvgPool1d(1)
        self.global_max_pool = nn.AdaptiveMaxPool1d(1)
        combined_features = num_filters * 2

        self.category_head = nn.Sequential(
            nn.Linear(combined_features, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_categories),
            nn.Sigmoid()
        )
        self.sentiment_head = nn.Sequential(
            nn.Linear(combined_features, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_categories * num_sentiments)
        )

    def forward(self, x):
        x = x.transpose(1, 2)  # [batch, features, seq_len]
        x = self.conv1d(x)
        avg_pool = self.global_avg_pool(x).squeeze(-1)
        max_pool = self.global_max_pool(x).squeeze(-1)
        combined = torch.cat([avg_pool, max_pool], dim=1)

        category_probs = self.category_head(combined)
        sentiment_logits = self.sentiment_head(combined)
        sentiment_probs = F.softmax(
            sentiment_logits.view(-1, self.num_categories, self.num_sentiments), dim=-1
        )
        return category_probs, sentiment_probs


# ------------------------ WRAPPER ------------------------
class ReviewModelWrapper:
    """Обёртка для CatBoost и CNN моделей с корректным разделением категорий и сентимента."""

    def __init__(self, cat_model_path, sent_model_path, cnn_model_path, device=None,
                 num_categories=18, num_sentiments=3, max_seq_len=50):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.num_categories = num_categories
        self.num_sentiments = num_sentiments
        self.max_seq_len = max_seq_len

        # CatBoost
        self.cat_model = CatBoostClassifier()
        self.cat_model.load_model(cat_model_path)
        self.sent_model = CatBoostClassifier()
        self.sent_model.load_model(sent_model_path)

        # CNN
        self.cnn_model = ReviewCNN1D(num_categories=num_categories, num_sentiments=num_sentiments)
        self.cnn_model.load_state_dict(torch.load(cnn_model_path, map_location=self.device))
        self.cnn_model.eval()
        self.cnn_model.to(self.device)

    def _prepare_features(self, sentences):
        """Создаёт тензор для CNN из вероятностей CatBoost."""
        if not sentences:
            return None, None, None, None
        pool = Pool(sentences, text_features=[0])
        cat_probs = self.cat_model.predict_proba(pool)
        sent_probs = self.sent_model.predict_proba(pool)
        features = np.concatenate([cat_probs, sent_probs], axis=1)

        if len(features) < self.max_seq_len:
            padding = np.zeros((self.max_seq_len - len(features), self.num_categories + self.num_sentiments))
            features = np.vstack([features, padding])

        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(self.device)
        return features_tensor, cat_probs, sent_probs, len(sentences)

    def predict_review(self, text, threshold=0.5):
        """Предсказание для одного отзыва."""
        sentences = TextProcessor.split_sentences(text)
        if not sentences:
            return {"text": text, "categories": [], "sentiment": 2}

        features_tensor, cat_probs, sent_probs, seq_len = self._prepare_features(sentences)
        if features_tensor is None:
            return {"text": text, "categories": [], "sentiment": 2}

        # CNN для категорий
        with torch.no_grad():
            cat_out, _ = self.cnn_model(features_tensor)
            cat_out = cat_out.cpu().numpy()[0]

        pred_cat_indices = np.where(cat_out > threshold)[0]
        categories = [int(i + 1) for i in pred_cat_indices]

        # Сентимент: усредняем по всем предложениям через CatBoost
        mean_sent = np.mean(sent_probs[:seq_len], axis=0)  # только реальные предложения
        sentiment = int(np.argmax(mean_sent)) + 1  # 1=плохой, 2=нейтраль, 3=хороший

        return {"text": text, "categories": categories, "sentiment": sentiment}

    def predict_reviews_batch(self, review_texts, threshold=0.5):
        return [self.predict_review(text, threshold=threshold) for text in review_texts]


# ------------------------ EXAMPLE ------------------------
if __name__ == "__main__":
    WEIGHTS_DIR = os.path.join(os.getcwd(), 'weights')
    wrapper = ReviewModelWrapper(
        cat_model_path=os.path.join(WEIGHTS_DIR, '18_cat_classifier_full_data.cbm'),
        sent_model_path=os.path.join(WEIGHTS_DIR, 'sent_classifier_3_classes.cbm'),
        cnn_model_path=os.path.join(WEIGHTS_DIR, '100ep_full_data_model.pth')
    )

    review_texts = [
        "Приложение удобное, но колл-центр работает плохо.",
        "Условия по вкладам отличные, сотрудники вежливые.",
        "Не могу войти в приложение, сбой при авторизации.",
        "Процентная ставка по кредиту слишком высокая, неудобные условия.",
        "Служба поддержки помогла быстро и компетентно.",
    ]

    results = wrapper.predict_reviews_batch(review_texts)
    print(json.dumps(results, ensure_ascii=False, indent=2))
