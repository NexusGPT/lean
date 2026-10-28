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
    def SeqRemove(s, x):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([]) if ((s)[0]) == (x) else _dafny.SeqWithoutIsStrInference([(s)[0]])))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = x
                    s = in0_
                    x = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapPut(o, k, v):
        if (k) in ((o).m):
            return OMap_OMap((o).keys, ((o).m).set(k, v))
        elif True:
            return OMap_OMap(((o).keys) + (_dafny.SeqWithoutIsStrInference([k])), ((o).m).set(k, v))

    @staticmethod
    def OMapDel(o, k):
        if (k) in ((o).m):
            return OMap_OMap(default__.SeqRemove((o).keys, k), ((o).m) - (_dafny.Set({k})))
        elif True:
            return o

    @staticmethod
    def OMapVals(ks, m):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(ks)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([(m)[(ks)[0]]]) if ((ks)[0]) in (m) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((ks)[1::])
                    in1_ = m
                    ks = in0_
                    m = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapEnts(ks, m):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(ks)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([((ks)[0], (m)[(ks)[0]])]) if ((ks)[0]) in (m) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((ks)[1::])
                    in1_ = m
                    ks = in0_
                    m = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapValues(o):
        return default__.OMapVals((o).keys, (o).m)

    @staticmethod
    def OMapEntries(o):
        return default__.OMapEnts((o).keys, (o).m)

    @staticmethod
    def OMapFrom(o, es):
        while True:
            with _dafny.label():
                if (len(es)) == (0):
                    return o
                elif True:
                    in0_ = default__.OMapPut(o, ((es)[0])[0], ((es)[0])[1])
                    in1_ = _dafny.SeqWithoutIsStrInference((es)[1::])
                    o = in0_
                    es = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def TruncDiv__int(a, b):
        d_0_q_ = _dafny.euclidian_division((a if (a) >= (0) else (0) - (a)), (b if (b) >= (0) else (0) - (b)))
        if ((a) >= (0)) == ((b) >= (0)):
            return d_0_q_
        elif True:
            return (0) - (d_0_q_)

    @staticmethod
    def JsRem__int(a, b):
        return (a) - ((b) * (default__.TruncDiv__int(a, b)))

    @staticmethod
    def OSetAdd(s, x):
        if (x) in ((s)):
            return s
        elif True:
            return ((s)) + (_dafny.SeqWithoutIsStrInference([x]))

    @staticmethod
    def OSetDel(s, x):
        return default__.SeqRemove((s), x)

    @staticmethod
    def OSetFrom(s, xs):
        while True:
            with _dafny.label():
                if (len(xs)) == (0):
                    return s
                elif True:
                    in0_ = default__.OSetAdd(s, (xs)[0])
                    in1_ = _dafny.SeqWithoutIsStrInference((xs)[1::])
                    s = in0_
                    xs = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OSetPairs(xs):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(xs)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([((xs)[0], (xs)[0])]))
                    in0_ = _dafny.SeqWithoutIsStrInference((xs)[1::])
                    xs = in0_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def Fold__int__int(s, f, init):
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return init
                elif True:
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = f
                    in2_ = f(init, (s)[0])
                    s = in0_
                    f = in1_
                    init = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def order__code__loop0(seq0, idx0, m):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return m
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_m_ = default__.OMapPut(m, default__.JsRem__int(d_0_x_, 5), ((((Option_Some(((m).m)[default__.JsRem__int(d_0_x_, 5)]) if (default__.JsRem__int(d_0_x_, 5)) in ((m).m) else Option_None())).value if ((Option_Some(((m).m)[default__.JsRem__int(d_0_x_, 5)]) if (default__.JsRem__int(d_0_x_, 5)) in ((m).m) else Option_None())).is_Some else 0)) + (1))
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_m_
                    seq0 = in0_
                    idx0 = in1_
                    m = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def order__code__loop1(seq1, idx1, code):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return code
                elif True:
                    d_0_k_ = ((seq1)[idx1])[0]
                    d_1_v_ = ((seq1)[idx1])[1]
                    d_2_code_ = (((code) * (100)) + ((d_0_k_) * (10))) + (d_1_v_)
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = d_2_code_
                    seq1 = in0_
                    idx1 = in1_
                    code = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def order__code(xs):
        def iife0_(_pat_let0_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let0_0)
        d_0_m_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        d_2_m_ = default__.order__code__loop0(xs, 0, d_0_m_)
        d_3_code_ = 0
        d_4_code_ = default__.order__code__loop1(default__.OMapEntries(d_2_m_), 0, d_3_code_)
        return d_4_code_

    @staticmethod
    def distinct__code__loop0(seq0, idx0, code):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return code
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_code_ = ((code) * (10)) + (d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_code_
                    seq0 = in0_
                    idx0 = in1_
                    code = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def distinct__code(xs):
        d_0_code_ = 0
        def iife0_(_pat_let1_0):
            def iife1_(d_2_s0_):
                return d_2_s0_
            return iife1_(_pat_let1_0)
        d_1_code_ = default__.distinct__code__loop0((default__.OSetFrom(iife0_(_dafny.SeqWithoutIsStrInference([])), xs)), 0, d_0_code_)
        def iife2_(_pat_let2_0):
            def iife3_(d_3_s0_):
                return d_3_s0_
            return iife3_(_pat_let2_0)
        return (d_1_code_) + ((len((default__.OSetFrom(iife2_(_dafny.SeqWithoutIsStrInference([])), xs)))) * (100000))

    @staticmethod
    def reinsert__code__loop0(seq0, idx0, m):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return m
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_m_ = default__.OMapPut(m, d_0_x_, d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_m_
                    seq0 = in0_
                    idx0 = in1_
                    m = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def reinsert__code__loop1(seq1, idx1, code):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return code
                elif True:
                    d_0_k_ = (seq1)[idx1]
                    d_1_code_ = ((code) * (10)) + (d_0_k_)
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = d_1_code_
                    seq1 = in0_
                    idx1 = in1_
                    code = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def reinsert__code(xs):
        def iife0_(_pat_let3_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let3_0)
        d_0_m_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        d_2_m_ = default__.reinsert__code__loop0(xs, 0, d_0_m_)
        d_3_m_ = default__.OMapDel(d_2_m_, 1)
        d_4_m_ = default__.OMapPut(d_3_m_, 1, 1)
        d_5_m_ = default__.OMapPut(d_4_m_, 2, 20)
        d_6_code_ = 0
        d_7_code_ = default__.reinsert__code__loop1((d_5_m_).keys, 0, d_6_code_)
        def lambda0_(d_8_a_, d_9_b_):
            return (d_8_a_) + (d_9_b_)

        return ((d_7_code_) * (1000)) + (default__.Fold__int__int(default__.OMapValues(d_5_m_), lambda0_, 0))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.order__code(_dafny.SeqWithoutIsStrInference([1, 6, 2, 11, 7]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.order__code(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.order__code(_dafny.SeqWithoutIsStrInference([4, 9]))))
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


class OMap:
    @classmethod
    def default(cls, ):
        return lambda: OMap_OMap(_dafny.Seq({}), _dafny.Map({}))
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_OMap(self) -> bool:
        return isinstance(self, OMap_OMap)

class OMap_OMap(OMap, NamedTuple('OMap', [('keys', Any), ('m', Any)])):
    def __dafnystr__(self) -> str:
        return f'OMap.OMap({_dafny.string_of(self.keys)}, {_dafny.string_of(self.m)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, OMap_OMap) and self.keys == __o.keys and self.m == __o.m
    def __hash__(self) -> int:
        return super().__hash__()


class OSet:
    @classmethod
    def default(cls, ):
        return lambda: _dafny.Seq({})
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_OSet(self) -> bool:
        return isinstance(self, OSet_OSet)

class OSet_OSet(OSet, NamedTuple('OSet', [('items', Any)])):
    def __dafnystr__(self) -> str:
        return f'OSet.OSet({_dafny.string_of(self.items)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, OSet_OSet) and self.items == __o.items
    def __hash__(self) -> int:
        return super().__hash__()

