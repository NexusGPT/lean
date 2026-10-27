from typing import Optional

from ports import AuditPort


# a variable assigned on every path before it is read
def sign(n: int) -> str:
    if n < 0:
        label = "negative"
    elif n == 0:
        label = "zero"
    else:
        label = "plus"
    return label


# the audit call is a transition of the world
def note_and_count(audit: AuditPort, xs: list[int]) -> int:
    audit.record("count:" + str(len(xs)))
    total = 0
    for x in xs:
        total = total + x
    return total


# a return inside a loop ends the function
def first_big(xs: list[int], limit: int) -> Optional[int]:
    for x in xs:
        if x > limit:
            return x
    return None
