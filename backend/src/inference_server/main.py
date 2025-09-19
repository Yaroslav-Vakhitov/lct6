from fastapi import FastAPI
from inference_server.predict import predict_router

def get_app() -> FastAPI:
    app = FastAPI(
        title="Hackathon API",
        version="0.0.1",
    )
    app.include_router(predict_router)
    return app