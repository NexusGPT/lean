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
    def Filter__int(s, p):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([(s)[0]]) if p((s)[0]) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = p
                    s = in0_
                    p = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__of__positives__loop0(seq0, idx0, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_total_ = (total) + (d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_total_
                    seq0 = in0_
                    idx0 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__of__positives(xs):
        def lambda0_(d_1_x_):
            return (d_1_x_) > (0)

        d_0_positives_ = default__.Filter__int(xs, lambda0_)
        d_2_total_ = 0
        d_3_total_ = default__.sum__of__positives__loop0(d_0_positives_, 0, d_2_total_)
        return d_3_total_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.sum__of__positives(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__of__positives(_dafny.SeqWithoutIsStrInference([1, -2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__of__positives(_dafny.SeqWithoutIsStrInference([-1, -1]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__of__positives(_dafny.SeqWithoutIsStrInference([5, 5, 5]))))
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

