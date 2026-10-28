from ports import Port


class Fetcher:
    def __init__(self, port: Port) -> None:
        self.port = port

    def load(self, id: str) -> str:
        try:
            v = self.port.get(id)
            return v.strip()
        except Exception:
            return ""

    def load_or_throw(self, id: str) -> int:
        try:
            n = self.port.count(id)
            if n < 0:
                raise ValueError("negative")
            return n
        except Exception as e:
            self.port.log(str(e))
            return 0


def parse(s: str) -> int:
    try:
        return int(s)
    except ValueError:
        return 0
