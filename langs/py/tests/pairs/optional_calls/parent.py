from dataclasses import dataclass
from typing import Optional, Protocol


class Notifier(Protocol):
    def send(self, to: str, text: str) -> int: ...


class Settings(Protocol):
    def label(self) -> str: ...


@dataclass(frozen=True)
class Order:
    id: str
    total: int
    note: Optional[str] = None


# the notifier may be absent: the message goes out only when it is there
def notify(n: Optional[Notifier], o: Order) -> int:
    sent = n.send(o.id, "total " + str(o.total)) if n is not None else None
    return 0 if sent is None else sent


# a method of an optional object: the label when settings exist
def label_of(s: Optional[Settings], o: Order) -> str:
    l = s.label() if s is not None else None
    return ("order" if l is None else l) + " " + o.id
