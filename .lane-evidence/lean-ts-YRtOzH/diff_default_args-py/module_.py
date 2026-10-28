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
    def Map__string__string(s, f):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([f((s)[0])]))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = f
                    s = in0_
                    f = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def pad(s, width, fill__opt):
        d_0_fill_ = ((fill__opt).value if (fill__opt).is_Some else _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, " ")))
        if (len(s)) >= (width):
            return s
        elif True:
            return ((s) + (d_0_fill_)) + (d_0_fill_)

    @staticmethod
    def pad__all(xs):
        def lambda0_(d_0_x_):
            return default__.pad(d_0_x_, 4, Option_None())

        return default__.Map__string__string(xs, lambda0_)

    @staticmethod
    def widths__loop0(seq0, idx0, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_total_ = (total) + (len(d_0_x_))
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_total_
                    seq0 = in0_
                    idx0 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def widths(xs):
        d_0_total_ = 0
        d_1_total_ = default__.widths__loop0(default__.pad__all(xs), 0, d_0_total_)
        return d_1_total_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.widths(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "abcdef"))]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.widths(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.widths(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "xyz"))]))))
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

