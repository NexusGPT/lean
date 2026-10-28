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
    def StrFind__string(s, t, p):
        while True:
            with _dafny.label():
                if ((p) + (len(t))) > (len(s)):
                    return -1
                elif (_dafny.SeqWithoutIsStrInference((s)[p:(p) + (len(t)):])) == (t):
                    return p
                elif True:
                    in0_ = s
                    in1_ = t
                    in2_ = (p) + (1)
                    s = in0_
                    t = in1_
                    p = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def StrSplit__string(s, sep):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(sep)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference([(s)[d_1_i_]]) for d_1_i_ in range(len(s))]))
                elif True:
                    d_2_p_ = default__.StrFind__string(s, sep, 0)
                    if (d_2_p_) < (0):
                        return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([s]))
                    elif True:
                        d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference((s)[:d_2_p_:])]))
                        in0_ = _dafny.SeqWithoutIsStrInference((s)[(d_2_p_) + (len(sep))::])
                        in1_ = sep
                        s = in0_
                        sep = in1_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def count__words__loop0(seq0, idx0, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_line_ = (seq0)[idx0]
                    d_1_s_ = d_0_line_
                    d_2_total_ = (total) + (len(default__.StrSplit__string(d_1_s_, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, " ")))))
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_2_total_
                    seq0 = in0_
                    idx0 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def count__words(lines):
        d_0_total_ = 0
        d_1_total_ = default__.count__words__loop0(lines, 0, d_0_total_)
        return d_1_total_

    @staticmethod
    def gather__loop0(seq0, idx0, out):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return out
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_sc0___ = d_0_x_
                    d_2_x_ = d_0_x_
                    def iife0_(_pat_let0_0):
                        def iife1_(d_4_out_):
                            return d_4_out_
                        return iife1_(_pat_let0_0)
                    d_3_out_ = (iife0_((out) + (_dafny.SeqWithoutIsStrInference([d_2_x_]))) if (d_2_x_) > (0) else out)
                    d_5_x_ = d_1_sc0___
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_3_out_
                    seq0 = in0_
                    idx0 = in1_
                    out = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def gather(xs):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([])
        d_1_out_ = default__.gather__loop0(xs, 0, d_0_out_)
        return d_1_out_

    @staticmethod
    def tagged__loop0(seq0, idx0, acc):
        while True:
            with _dafny.label():
                pat_let_tv0_ = acc
                if (idx0) >= (len(seq0)):
                    return acc
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_v_ = d_0_x_
                    def iife0_(_pat_let1_0):
                        def iife1_(d_3_dt__update__tmp_h0_):
                            def iife2_(_pat_let2_0):
                                def iife3_(d_4_dt__update_hn_h0_):
                                    return Rec__2xvmy4_Rec__2xvmy4(d_4_dt__update_hn_h0_, (d_3_dt__update__tmp_h0_).sum_, (d_3_dt__update__tmp_h0_).open__rest__)
                                return iife3_(_pat_let2_0)
                            return iife2_(((pat_let_tv0_).n) + (1))
                        return iife1_(_pat_let1_0)
                    d_2_acc_ = iife0_(acc)
                    def iife4_(_pat_let3_0):
                        def iife5_(d_6_dt__update__tmp_h1_):
                            def iife6_(_pat_let4_0):
                                def iife7_(d_7_dt__update_hsum_h0_):
                                    return Rec__2xvmy4_Rec__2xvmy4((d_6_dt__update__tmp_h1_).n, d_7_dt__update_hsum_h0_, (d_6_dt__update__tmp_h1_).open__rest__)
                                return iife7_(_pat_let4_0)
                            return iife6_(((d_2_acc_).sum_) + (d_1_v_))
                        return iife5_(_pat_let3_0)
                    d_5_acc_ = iife4_(d_2_acc_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_5_acc_
                    seq0 = in0_
                    idx0 = in1_
                    acc = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def tagged(xs):
        d_0_acc_ = Rec__2xvmy4_Rec__2xvmy4(0, 0, More_MoreBuilt())
        d_1_v_ = len(xs)
        def iife0_(_pat_let5_0):
            def iife1_(d_3_dt__update__tmp_h0_):
                def iife2_(_pat_let6_0):
                    def iife3_(d_4_dt__update_hn_h0_):
                        return Rec__2xvmy4_Rec__2xvmy4(d_4_dt__update_hn_h0_, (d_3_dt__update__tmp_h0_).sum_, (d_3_dt__update__tmp_h0_).open__rest__)
                    return iife3_(_pat_let6_0)
                return iife2_(((d_0_acc_).n) + (1))
            return iife1_(_pat_let5_0)
        d_2_acc_ = iife0_(d_0_acc_)
        def iife4_(_pat_let7_0):
            def iife5_(d_6_dt__update__tmp_h1_):
                def iife6_(_pat_let8_0):
                    def iife7_(d_7_dt__update_hsum_h0_):
                        return Rec__2xvmy4_Rec__2xvmy4((d_6_dt__update__tmp_h1_).n, d_7_dt__update_hsum_h0_, (d_6_dt__update__tmp_h1_).open__rest__)
                    return iife7_(_pat_let8_0)
                return iife6_(((d_2_acc_).sum_) + (d_1_v_))
            return iife5_(_pat_let7_0)
        d_5_acc_ = iife4_(d_2_acc_)
        d_8_acc_ = default__.tagged__loop0(xs, 0, d_5_acc_)
        return (((d_8_acc_).sum_) * (100)) + ((d_8_acc_).n)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.count__words(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a b")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "c"))]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__words(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__words(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "one two three"))]))))
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


class Rec__2xvmy4:
    @classmethod
    def default(cls, ):
        return lambda: Rec__2xvmy4_Rec__2xvmy4(int(0), int(0), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Rec__2xvmy4(self) -> bool:
        return isinstance(self, Rec__2xvmy4_Rec__2xvmy4)

class Rec__2xvmy4_Rec__2xvmy4(Rec__2xvmy4, NamedTuple('Rec__2xvmy4', [('n', Any), ('sum_', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Rec_2xvmy4.Rec_2xvmy4({_dafny.string_of(self.n)}, {_dafny.string_of(self.sum_)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Rec__2xvmy4_Rec__2xvmy4) and self.n == __o.n and self.sum_ == __o.sum_ and self.open__rest__ == __o.open__rest__
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

