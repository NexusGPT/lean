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
    def DictDigits(s):
        return ((len(s)) == (0)) or ((((_dafny.CodePoint('0')) <= ((s)[0])) and (((s)[0]) <= (_dafny.CodePoint('9')))) and (default__.DictDigits(_dafny.SeqWithoutIsStrInference((s)[1::]))))

    @staticmethod
    def DictValue(s, acc):
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return acc
                elif True:
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = ((acc) * (10)) + ((ord((s)[0])) - (ord(_dafny.CodePoint('0'))))
                    s = in0_
                    acc = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictIndex(s):
        return (((((0) < (len(s))) and ((len(s)) <= (10))) and (default__.DictDigits(s))) and ((((s)[0]) != (_dafny.CodePoint('0'))) or ((len(s)) == (1)))) and ((default__.DictValue(s, 0)) <= (4294967294))

    @staticmethod
    def DictBefore(k, x):
        return (default__.DictIndex(k)) and ((not(default__.DictIndex(x))) or ((default__.DictValue(k, 0)) < (default__.DictValue(x, 0))))

    @staticmethod
    def DictIns(k, xs):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(xs)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([k]))
                elif default__.DictBefore(k, (xs)[0]):
                    return (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([k])) + (xs))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([(xs)[0]]))
                    in0_ = k
                    in1_ = _dafny.SeqWithoutIsStrInference((xs)[1::])
                    k = in0_
                    xs = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictPut(o, k, v):
        if (k) in ((o).m):
            return OMap_OMap((o).keys, ((o).m).set(k, v))
        elif True:
            return OMap_OMap(default__.DictIns(k, (o).keys), ((o).m).set(k, v))

    @staticmethod
    def DictFrom(o, es):
        while True:
            with _dafny.label():
                if (len(es)) == (0):
                    return o
                elif True:
                    in0_ = default__.DictPut(o, ((es)[0])[0], ((es)[0])[1])
                    in1_ = _dafny.SeqWithoutIsStrInference((es)[1::])
                    o = in0_
                    es = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictMerge(o, src):
        return default__.DictFrom(o, default__.OMapEntries(src))

    @staticmethod
    def Fold__string__OMap__string__bool(s, f, init):
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
    def flag__count(fields):
        def lambda0_(d_1_acc_, d_2_field_):
            def iife0_(_pat_let0_0):
                def iife1_(d_3_ov0___):
                    def iife2_(_pat_let1_0):
                        def iife3_(d_4_ov1___):
                            def iife4_(_pat_let2_0):
                                def iife5_(d_5_ov2___):
                                    def iife6_(_pat_let3_0):
                                        def iife7_(d_6_ov3___):
                                            def iife8_(_pat_let4_0):
                                                def iife9_(d_7_ov4___):
                                                    def iife10_(_pat_let5_0):
                                                        def iife11_(d_8_ov5___):
                                                            def iife12_(_pat_let6_0):
                                                                def iife13_(d_9_acc_):
                                                                    def iife14_(_pat_let7_0):
                                                                        def iife15_(d_10_ov6___):
                                                                            def iife16_(_pat_let8_0):
                                                                                def iife17_(d_11_ov7___):
                                                                                    def iife18_(_pat_let9_0):
                                                                                        def iife19_(d_12_ov8___):
                                                                                            return d_12_ov8___
                                                                                        return iife19_(_pat_let9_0)
                                                                                    return iife18_(d_11_ov7___)
                                                                                return iife17_(_pat_let8_0)
                                                                            return iife16_(d_9_acc_)
                                                                        return iife15_(_pat_let7_0)
                                                                    return iife14_(d_8_ov5___)
                                                                return iife13_(_pat_let6_0)
                                                            return iife12_((d_4_ov1___ if ((d_6_ov3___) == (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")))) and ((d_6_ov3___) not in ((d_4_ov1___).m)) else default__.DictPut(d_4_ov1___, d_6_ov3___, d_8_ov5___)))
                                                        return iife11_(_pat_let5_0)
                                                    return iife10_(d_7_ov4___)
                                                return iife9_(_pat_let4_0)
                                            return iife8_(True)
                                        return iife7_(_pat_let3_0)
                                    return iife6_(d_5_ov2___)
                                return iife5_(_pat_let2_0)
                            return iife4_(d_2_field_)
                        return iife3_(_pat_let1_0)
                    return iife2_(d_3_ov0___)
                return iife1_(_pat_let0_0)
            return iife0_(d_1_acc_)

        def iife20_(_pat_let10_0):
            def iife21_(d_13_m0_):
                return d_13_m0_
            return iife21_(_pat_let10_0)
        d_0_flags_ = default__.Fold__string__OMap__string__bool(fields, lambda0_, iife20_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({}))))
        return len((d_0_flags_).keys)

    @staticmethod
    def accept__of(t, n):
        d_0_h_ = Headers_Headers(Option_Some(t), default__.DictPut(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "trace")), Option_Some(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "x")))), More_MoreBuilt())
        def iife0_(_pat_let11_0):
            def iife1_(d_2_dt__update__tmp_h0_):
                def iife2_(_pat_let12_0):
                    def iife3_(d_3_dt__update_haccept_h0_):
                        return Headers_Headers(d_3_dt__update_haccept_h0_, (d_2_dt__update__tmp_h0_).open__index__, (d_2_dt__update__tmp_h0_).open__rest__)
                    return iife3_(_pat_let12_0)
                return iife2_(Option_Some(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "set"))))
            return iife1_(_pat_let11_0)
        d_1_c_ = (iife0_(d_0_h_) if (n) > (0) else d_0_h_)
        if ((d_1_c_).accept).is_Some:
            return ((d_1_c_).accept).value
        elif True:
            return _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "none"))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.flag__count(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "b")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a"))]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.flag__count(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.flag__count(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "x"))]))))
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


class Headers:
    @classmethod
    def default(cls, ):
        return lambda: Headers_Headers(Option.default()(), OMap.default()(), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Headers(self) -> bool:
        return isinstance(self, Headers_Headers)

class Headers_Headers(Headers, NamedTuple('Headers', [('accept', Any), ('open__index__', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Headers.Headers({_dafny.string_of(self.accept)}, {_dafny.string_of(self.open__index__)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Headers_Headers) and self.accept == __o.accept and self.open__index__ == __o.open__index__ and self.open__rest__ == __o.open__rest__
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

