from ports import Row


class Mapper:
    @staticmethod
    def out(x: Row) -> str:
        return x.id
