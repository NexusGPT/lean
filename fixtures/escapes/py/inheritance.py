# expect: inheritance
class Base:
    def value(self) -> int:
        return 1


class Child(Base):
    def value(self) -> int:
        return 2
