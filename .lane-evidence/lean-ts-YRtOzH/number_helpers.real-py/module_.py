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
    def JsTrunc__real(a):
        if (a) < (_dafny.BigRational('0e0')):
            return (0) - (floor(((_dafny.BigRational('0e0')) - (a))))
        elif True:
            return floor((a))

    @staticmethod
    def JsUint32__real(a):
        return _dafny.euclidian_modulus(default__.JsTrunc__real(a), 4294967296)

    @staticmethod
    def JsSigned__bv32(a):
        d_0_u_ = a
        if (d_0_u_) < (2147483648):
            return d_0_u_
        elif True:
            return (d_0_u_) - (4294967296)

    @staticmethod
    def JsBitAnd__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_v_ = default__.JsUint32__real(b)
        return _dafny.BigRational(default__.JsSigned__bv32((d_0_u_) & (d_1_v_)), 1)

    @staticmethod
    def JsBitOr__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_v_ = default__.JsUint32__real(b)
        return _dafny.BigRational(default__.JsSigned__bv32((d_0_u_) | (d_1_v_)), 1)

    @staticmethod
    def JsBitXor__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_v_ = default__.JsUint32__real(b)
        return _dafny.BigRational(default__.JsSigned__bv32((d_0_u_) ^ (d_1_v_)), 1)

    @staticmethod
    def JsBitNot__real(a):
        d_0_u_ = default__.JsUint32__real(a)
        return _dafny.BigRational(default__.JsSigned__bv32((~(d_0_u_)) & ((1 << 32) - 1)), 1)

    @staticmethod
    def JsShl__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__real(b), 32)
        return _dafny.BigRational(default__.JsSigned__bv32(((d_0_u_) << (d_1_k_)) & ((1 << 32) - 1)), 1)

    @staticmethod
    def JsShr__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__real(b), 32)
        return _dafny.BigRational(default__.JsSigned__bv32(((d_0_u_) >> (d_1_k_) if (d_0_u_) < (2147483648) else (~(((~(d_0_u_)) & ((1 << 32) - 1)) >> (d_1_k_))) & ((1 << 32) - 1))), 1)

    @staticmethod
    def JsUshr__real(a, b):
        d_0_u_ = default__.JsUint32__real(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__real(b), 32)
        return _dafny.BigRational((d_0_u_) >> (d_1_k_), 1)

    @staticmethod
    def JsCeil__real(a):
        return _dafny.BigRational((0) - (floor(((_dafny.BigRational('0e0')) - (a)))), 1)

    @staticmethod
    def JsRound__real(a):
        return _dafny.BigRational(floor(((a) + (_dafny.BigRational('5e-1')))), 1)

    @staticmethod
    def JsSign__real(a):
        if (a) < (_dafny.BigRational('0e0')):
            return _dafny.BigRational('-1e0')
        elif (a) > (_dafny.BigRational('0e0')):
            return _dafny.BigRational('1e0')
        elif True:
            return _dafny.BigRational('0e0')

    @staticmethod
    def JsRealRem__real(a, b):
        return (a) - ((b) * (_dafny.BigRational(default__.JsTrunc__real((a) / (b)), 1)))

    @staticmethod
    def and__bits(a, b):
        return default__.JsBitAnd__real(a, b)

    @staticmethod
    def or__bits(a, b):
        return default__.JsBitOr__real(a, b)

    @staticmethod
    def xor__bits(a, b):
        return default__.JsBitXor__real(a, b)

    @staticmethod
    def not__bits(a):
        return default__.JsBitNot__real(a)

    @staticmethod
    def shift__left(a, b):
        return default__.JsShl__real(a, b)

    @staticmethod
    def shift__right(a, b):
        return default__.JsShr__real(a, b)

    @staticmethod
    def shift__unsigned(a, b):
        return default__.JsUshr__real(a, b)

    @staticmethod
    def floor__quotient(a):
        return _dafny.BigRational(floor(((a) / (_dafny.BigRational('2e0')))), 1)

    @staticmethod
    def trunc__quotient(a):
        return (_dafny.BigRational(default__.JsTrunc__real((a) / (_dafny.BigRational('2e0'))), 1)) + (_dafny.BigRational('0e0'))

    @staticmethod
    def hex__mask():
        return default__.JsBitAnd__real(_dafny.BigRational('4294967295e0'), _dafny.BigRational('2147483648e0'))

    @staticmethod
    def safe__integer():
        return _dafny.BigRational('9007199254740991e0')

    @staticmethod
    def fractional():
        return _dafny.BigRational('5e-1')

    @staticmethod
    def ceil__number(a):
        return (default__.JsCeil__real(a)) + (_dafny.BigRational('0e0'))

    @staticmethod
    def round__number(a):
        return (default__.JsRound__real(a)) + (_dafny.BigRational('0e0'))

    @staticmethod
    def trunc__number(a):
        return (_dafny.BigRational(default__.JsTrunc__real(a), 1)) + (_dafny.BigRational('0e0'))

    @staticmethod
    def sign__number(a):
        return default__.JsSign__real(a)

    @staticmethod
    def remainder(a):
        return (default__.JsRealRem__real(a, _dafny.BigRational('25e-1'))) + (_dafny.BigRational('0e0'))

    @staticmethod
    def Main(noArgsParameter__):
        if not((default__.and__bits(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(186,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(187,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(188,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('0e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(189,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(190,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(191,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('0e0'), _dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(192,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(193,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(194,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(195,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('-1e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(196,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(197,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(198,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('-1e0'), _dafny.BigRational('1e0'))) == (_dafny.BigRational('2147483647e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(199,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(200,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('-2147483617e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(201,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('-2147483617e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(202,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('-2147483648e0'))) == (_dafny.BigRational('2147483647e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(203,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(204,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(205,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('-2147483648e0'), _dafny.BigRational('31e0'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(206,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(207,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('-2147483616e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(208,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('-2147483616e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(209,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('2147483648e0'))) == (_dafny.BigRational('2147483647e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(210,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('-2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(211,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('-2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(212,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('2147483648e0'), _dafny.BigRational('32e0'))) == (_dafny.BigRational('2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(213,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('33e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(214,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(215,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('-34e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(216,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('4294967295e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(217,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(218,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(219,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('4294967295e0'), _dafny.BigRational('33e0'))) == (_dafny.BigRational('2147483647e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(220,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(221,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(222,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(223,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('4294967296e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(224,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(225,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(226,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('4294967296e0'), _dafny.BigRational('-1e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(227,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('63e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(228,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(229,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('-64e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(230,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('-4294967297e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(231,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('-2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(232,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(233,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('-4294967297e0'), _dafny.BigRational('63e0'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(234,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('4e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(235,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(236,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('-5e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(237,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('9007199254740991e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(238,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('-16e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(239,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(240,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('9007199254740991e0'), _dafny.BigRational('4e0'))) == (_dafny.BigRational('268435455e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(241,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(242,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(243,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(244,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('-175e-2'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(245,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(246,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(247,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('-175e-2'), _dafny.BigRational('19e-1'))) == (_dafny.BigRational('2147483647e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(248,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(249,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('-33e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(250,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('-34e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(251,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(_dafny.BigRational('42949672975e-1'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(252,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('-2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(253,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(254,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(_dafny.BigRational('42949672975e-1'), _dafny.BigRational('-335e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(255,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(_dafny.BigRational('-7e0'))) == (_dafny.BigRational('-4e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(256,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(_dafny.BigRational('-7e0'))) == (_dafny.BigRational('-3e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(257,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(_dafny.BigRational('-3e0'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(258,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(_dafny.BigRational('-3e0'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(259,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(260,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(261,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(_dafny.BigRational('3e0'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(262,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(_dafny.BigRational('3e0'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(263,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(_dafny.BigRational('7e0'))) == (_dafny.BigRational('3e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(264,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(_dafny.BigRational('7e0'))) == (_dafny.BigRational('3e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(265,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.hex__mask()) == (_dafny.BigRational('-2147483648e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(266,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.safe__integer()) == (_dafny.BigRational('9007199254740991e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(267,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('-55e-1'))) == (_dafny.BigRational('-5e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(268,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('-55e-1'))) == (_dafny.BigRational('-5e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(269,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('-55e-1'))) == (_dafny.BigRational('-5e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(270,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('-55e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(271,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('-55e-1'))) == (_dafny.BigRational('-5e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(272,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('-17e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(273,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('-17e-1'))) == (_dafny.BigRational('-2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(274,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('-17e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(275,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('-17e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(276,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('-17e-1'))) == (_dafny.BigRational('-17e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(277,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('-15e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(278,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('-15e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(279,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('-15e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(280,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('-15e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(281,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('-15e-1'))) == (_dafny.BigRational('-15e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(282,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('-5e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(283,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('-5e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(284,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('-5e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(285,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('-5e-1'))) == (_dafny.BigRational('-1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(286,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('-5e-1'))) == (_dafny.BigRational('-5e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(287,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(288,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(289,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(290,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(291,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('0e0'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(292,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('5e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(293,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('5e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(294,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('5e-1'))) == (_dafny.BigRational('0e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(295,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('5e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(296,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('5e-1'))) == (_dafny.BigRational('5e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(297,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('15e-1'))) == (_dafny.BigRational('2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(298,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('15e-1'))) == (_dafny.BigRational('2e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(299,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('15e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(300,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('15e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(301,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('15e-1'))) == (_dafny.BigRational('15e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(302,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.ceil__number(_dafny.BigRational('55e-1'))) == (_dafny.BigRational('6e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(303,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.round__number(_dafny.BigRational('55e-1'))) == (_dafny.BigRational('6e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(304,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__number(_dafny.BigRational('55e-1'))) == (_dafny.BigRational('5e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(305,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.sign__number(_dafny.BigRational('55e-1'))) == (_dafny.BigRational('1e0'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(306,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.remainder(_dafny.BigRational('55e-1'))) == (_dafny.BigRational('5e-1'))):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.real.dfy(307,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))


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

