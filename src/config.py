import os

SECRET_TOKEN: str = os.environ.get("SECRET_TOKEN", "media_control_secret")
HOST: str = os.environ.get("HOST", "0.0.0.0")
PORT: int = int(os.environ.get("PORT", "8765"))
