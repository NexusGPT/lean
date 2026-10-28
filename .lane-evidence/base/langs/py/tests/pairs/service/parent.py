from dataclasses import dataclass

from mapper import Mapper
from ports import Audit, Repo, Row


@dataclass(frozen=True)
class Result:
    ok: bool
    id: str


class ChatService:
    def __init__(self, repo: Repo, audit: Audit) -> None:
        self.tag = "chat"
        self.repo = repo
        self.audit = audit

    def regenerate(self, chat_id: str, user_id: str) -> Result:
        row = self.repo.find(chat_id)
        if row is None:
            return Result(ok=False, id=chat_id)
        self.audit.log(self.tag, user_id)
        return Result(ok=True, id=self.label(row.id))

    def label(self, id: str) -> str:
        return self.tag + ":" + id

    @staticmethod
    def dto(x: Row) -> str:
        return Mapper.out(x)
