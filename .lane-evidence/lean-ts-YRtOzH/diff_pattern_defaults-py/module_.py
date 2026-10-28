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
    def reach(o):
        d_0_limit_ = (((o).limit).value if ((o).limit).is_Some else 10)
        d_1_step_ = (((o).step).value if ((o).step).is_Some else 1)
        d_2_strict_ = (o).strict
        if d_2_strict_:
            return d_0_limit_
        elif True:
            return (d_0_limit_) + (d_1_step_)

    @staticmethod
    def limit__of(limit, strict):
        return (default__.reach(Opts_Opts(Option_Some(limit), Option_None(), strict, More_MoreBuilt()))) + (default__.reach(Opts_Opts(Option_None(), Option_None(), False, More_MoreBuilt())))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.limit__of(3, True)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.limit__of(0, False)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.limit__of(-4, True)))
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


class Option:
    @classmethod
    def default(cls, ):
        return lambda: Option_None()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_None(self) -> bool:
        return isinstance(self, Option_None)
    @property
    def is_Some(self) -> bool:
        return isinstance(self, Option_Some)

class Option_None(Option, NamedTuple('None_', [])):
    def __dafnystr__(self) -> str:
        return f'Option.None'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Option_None)
    def __hash__(self) -> int:
        return super().__hash__()

class Option_Some(Option, NamedTuple('Some', [('value', Any)])):
    def __dafnystr__(self) -> str:
        return f'Option.Some({_dafny.string_of(self.value)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Option_Some) and self.value == __o.value
    def __hash__(self) -> int:
        return super().__hash__()


class Opts:
    @classmethod
    def default(cls, ):
        return lambda: Opts_Opts(Option.default()(), Option.default()(), False, More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Opts(self) -> bool:
        return isinstance(self, Opts_Opts)

class Opts_Opts(Opts, NamedTuple('Opts', [('limit', Any), ('step', Any), ('strict', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Opts.Opts({_dafny.string_of(self.limit)}, {_dafny.string_of(self.step)}, {_dafny.string_of(self.strict)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Opts_Opts) and self.limit == __o.limit and self.step == __o.step and self.strict == __o.strict and self.open__rest__ == __o.open__rest__
    def __hash__(self) -> int:
        return super().__hash__()


class More:
    @classmethod
    def default(cls, ):
        return lambda: More_MoreBuilt()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_MoreBuilt(self) -> bool:
        return isinstance(self, More_MoreBuilt)
    @property
    def is_MoreFrom(self) -> bool:
        return isinstance(self, More_MoreFrom)

class More_MoreBuilt(More, NamedTuple('MoreBuilt', [])):
    def __dafnystr__(self) -> str:
        return f'More.MoreBuilt'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, More_MoreBuilt)
    def __hash__(self) -> int:
        return super().__hash__()

class More_MoreFrom(More, NamedTuple('MoreFrom', [('src', Any)])):
    def __dafnystr__(self) -> str:
        return f'More.MoreFrom({_dafny.string_of(self.src)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, More_MoreFrom) and self.src == __o.src
    def __hash__(self) -> int:
        return super().__hash__()

