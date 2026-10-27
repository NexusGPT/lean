from typing import Protocol


class AuditPort(Protocol):
    def record(self, event: str) -> None: ...
