from src.config import SECRET_TOKEN


def verify_token(token: str) -> bool:
    return token == SECRET_TOKEN
