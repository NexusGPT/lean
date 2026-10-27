# expect: decorator
import functools


@functools.lru_cache
def square(n: int) -> int:
    return n * n
