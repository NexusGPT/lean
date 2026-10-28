import sys
from typing import Callable, Any, TypeVar, NamedTuple
from math import floor
from itertools import count

import module_ as module_
import _dafny as _dafny
import System_ as System_

# Module: module_

class default__:
    def  __init__(self):
        pass

    @staticmethod
    def Min__int(a, b):
        if (a) < (b):
            return a
        elif True:
            return b

    @staticmethod
    def Max__int(a, b):
        if (a) > (b):
            return a
        elif True:
            return b

    @staticmethod
    def clamp(x, lo, hi):
        if (x) < (lo):
            return lo
        elif (x) > (hi):
            return hi
        elif True:
            return x

    @staticmethod
    def clamp__min__max(x, lo, hi):
        return default__.Min__int(default__.Max__int(x, lo), hi)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.clamp(5, 0, 10)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.clamp(-3, 0, 10)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.clamp(42, 0, 10)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))


class Unit:
    @_dafny.classproperty
    def AllSingletonConstructors(cls):
        return [Unit_Unit()]
    @classmethod
    def default(cls, ):
        return lambda: Unit_Unit()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Unit(self) -> bool:
        return isinstance(self, Unit_Unit)

class Unit_Unit(Unit, NamedTuple('Unit', [])):
    def __dafnystr__(self) -> str:
        return f'Unit.Unit'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Unit_Unit)
    def __hash__(self) -> int:
        return super().__hash__()

