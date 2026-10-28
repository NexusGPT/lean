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
    def sum__each__loop0(seq0, idx0, count):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return count
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_count_ = (count) + (d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_count_
                    seq0 = in0_
                    idx0 = in1_
                    count = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__each(xs):
        d_0_count_ = 0
        d_1_count_ = default__.sum__each__loop0(xs, 0, d_0_count_)
        return d_1_count_

    @staticmethod
    def collect__loop0(seq0, idx0, out, doubled):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return (out, doubled)
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_out_ = (out) + (_dafny.SeqWithoutIsStrInference([d_0_x_]))
                    d_2_doubled_ = (doubled) + (_dafny.SeqWithoutIsStrInference([(d_0_x_) * (2)]))
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_out_
                    in3_ = d_2_doubled_
                    seq0 = in0_
                    idx0 = in1_
                    out = in2_
                    doubled = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def collect(xs):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([])
        d_1_doubled_ = _dafny.SeqWithoutIsStrInference([])
        let_tmp_rhs0_ = default__.collect__loop0(xs, 0, d_0_out_, d_1_doubled_)
        d_2_out_ = let_tmp_rhs0_[0]
        d_3_doubled_ = let_tmp_rhs0_[1]
        return (d_2_out_) + (d_3_doubled_)

    @staticmethod
    def tally__loop0(seq0, idx0, acc, cb0__):
        while True:
            with _dafny.label():
                pat_let_tv0_ = acc
                if (idx0) >= (len(seq0)):
                    return (acc, cb0__)
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    def iife0_(_pat_let0_0):
                        def iife1_(d_2_dt__update__tmp_h0_):
                            def iife2_(_pat_let1_0):
                                def iife3_(d_3_dt__update_hn_h0_):
                                    return Rec__nndgx9_Rec__nndgx9((d_2_dt__update__tmp_h0_).last, d_3_dt__update_hn_h0_, (d_2_dt__update__tmp_h0_).open__rest__)
                                return iife3_(_pat_let1_0)
                            return iife2_(((pat_let_tv0_).n) + (1))
                        return iife1_(_pat_let0_0)
                    d_1_acc_ = iife0_(acc)
                    def iife4_(_pat_let2_0):
                        def iife5_(d_5_dt__update__tmp_h1_):
                            def iife6_(_pat_let3_0):
                                def iife7_(d_6_dt__update_hlast_h0_):
                                    return Rec__nndgx9_Rec__nndgx9(d_6_dt__update_hlast_h0_, (d_5_dt__update__tmp_h1_).n, (d_5_dt__update__tmp_h1_).open__rest__)
                                return iife7_(_pat_let3_0)
                            return iife6_(d_0_x_)
                        return iife5_(_pat_let2_0)
                    d_4_acc_ = iife4_(d_1_acc_)
                    if (len(d_0_x_)) > (0):
                        d_7_cb0___ = (cb0__) + (_dafny.SeqWithoutIsStrInference([d_0_x_]))
                        in0_ = seq0
                        in1_ = (idx0) + (1)
                        in2_ = d_4_acc_
                        in3_ = d_7_cb0___
                        seq0 = in0_
                        idx0 = in1_
                        acc = in2_
                        cb0__ = in3_
                        raise _dafny.TailCall()
                    elif True:
                        in4_ = seq0
                        in5_ = (idx0) + (1)
                        in6_ = d_4_acc_
                        in7_ = cb0__
                        seq0 = in4_
                        idx0 = in5_
                        acc = in6_
                        cb0__ = in7_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def tally(xs):
        pat_let_tv0_ = xs
        d_0_acc_ = Rec__nndgx9_Rec__nndgx9(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "")), 0, More_MoreBuilt())
        def iife0_(_pat_let4_0):
            def iife1_(d_1_cb0___):
                def iife2_(_pat_let5_0):
                    def iife3_(d_2_acc_):
                        def iife4_(d_3_cb0___):
                            return (d_3_cb0___, d_2_acc_)
                        return iife4_(_pat_let5_0[1])
                    return iife3_(_pat_let5_0[0])
                return iife2_(default__.tally__loop0(pat_let_tv0_, 0, d_0_acc_, d_1_cb0___))
            return iife1_(_pat_let4_0)
        let_tmp_rhs0_ = iife0_(_dafny.SeqWithoutIsStrInference([]))
        d_4_t1___ = let_tmp_rhs0_[0]
        d_5_acc_ = let_tmp_rhs0_[1]
        return (((d_5_acc_).n) * (10)) + (len((d_5_acc_).last))

    @staticmethod
    def first__big__loop0(seq0, idx0, seen, hit):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return (seen, hit)
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_seen_ = (seen) + (1)
                    if (d_0_x_) > (10):
                        d_2_hit_ = Option_Some(d_0_x_)
                        return (d_1_seen_, d_2_hit_)
                    elif True:
                        in0_ = seq0
                        in1_ = (idx0) + (1)
                        in2_ = d_1_seen_
                        in3_ = hit
                        seq0 = in0_
                        idx0 = in1_
                        seen = in2_
                        hit = in3_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def first__big(xs):
        d_0_seen_ = 0
        d_1_hit_ = Option_None()
        let_tmp_rhs0_ = default__.first__big__loop0(xs, 0, d_0_seen_, d_1_hit_)
        d_2_seen_ = let_tmp_rhs0_[0]
        d_3_hit_ = let_tmp_rhs0_[1]
        if (d_3_hit_).is_None:
            return (0) - (d_2_seen_)
        elif True:
            return ((d_3_hit_).value) + (d_2_seen_)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.collect(_dafny.SeqWithoutIsStrInference([1, 2]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.collect(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.collect(_dafny.SeqWithoutIsStrInference([5]))))
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


class Rec__nndgx9:
    @classmethod
    def default(cls, ):
        return lambda: Rec__nndgx9_Rec__nndgx9(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "")), int(0), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Rec__nndgx9(self) -> bool:
        return isinstance(self, Rec__nndgx9_Rec__nndgx9)

class Rec__nndgx9_Rec__nndgx9(Rec__nndgx9, NamedTuple('Rec__nndgx9', [('last', Any), ('n', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Rec_nndgx9.Rec_nndgx9({self.last.VerbatimString(True)}, {_dafny.string_of(self.n)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Rec__nndgx9_Rec__nndgx9) and self.last == __o.last and self.n == __o.n and self.open__rest__ == __o.open__rest__
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

