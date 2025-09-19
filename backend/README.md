# Install dependencies

```bash
uv sync
source .venv/bin/activate
```

# Run

```bash
uvicorn src.inference_server.main:get_app
```