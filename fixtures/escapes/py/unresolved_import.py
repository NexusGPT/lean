# expect: unresolved-import
from somewhere_else import fetch


def load(url: str) -> str:
    return fetch(url)
