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
    def Map__int__int(s, f):
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
    def Max__int(a, b):
        if (a) > (b):
            return a
        elif True:
            return b

    @staticmethod
    def MaxSeq__int(s):
        if (len(s)) == (1):
            return (s)[0]
        elif True:
            return default__.Max__int((s)[0], default__.MaxSeq__int(_dafny.SeqWithoutIsStrInference((s)[1::])))

    @staticmethod
    def Min__int(a, b):
        if (a) < (b):
            return a
        elif True:
            return b

    @staticmethod
    def MinSeq__int(s):
        if (len(s)) == (1):
            return (s)[0]
        elif True:
            return default__.Min__int((s)[0], default__.MinSeq__int(_dafny.SeqWithoutIsStrInference((s)[1::])))

    @staticmethod
    def block__scope__loop0(seq0, idx0, x, t):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return t
                elif True:
                    d_0_k_ = (seq0)[idx0]
                    d_1_sc0___ = x
                    d_2_x_ = (d_0_k_) * (10)
                    d_3_t_ = (t) + (d_2_x_)
                    d_4_x_ = d_1_sc0___
                    d_5_t_ = (d_3_t_) + (d_4_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_4_x_
                    in3_ = d_5_t_
                    seq0 = in0_
                    idx0 = in1_
                    x = in2_
                    t = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def block__scope(n, ks):
        d_0_x_ = n
        d_1_t_ = 0
        d_2_t_ = default__.block__scope__loop0(ks, 0, d_0_x_, d_1_t_)
        d_3_sc1___ = d_0_x_
        d_4_x_ = 1000
        d_5_t_ = (d_2_t_) + (d_4_x_)
        d_6_x_ = d_3_sc1___
        return (d_5_t_) + (d_6_x_)

    @staticmethod
    def scoped__jumps__loop0(seq0, idx0, x, t):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return t
                elif True:
                    d_0_k_ = (seq0)[idx0]
                    if (d_0_k_) > (0):
                        d_1_sc0___ = x
                        d_2_x_ = 100
                        d_3_t_ = (t) + (d_2_x_)
                        d_4_x_ = d_1_sc0___
                        in0_ = seq0
                        in1_ = (idx0) + (1)
                        in2_ = d_4_x_
                        in3_ = d_3_t_
                        seq0 = in0_
                        idx0 = in1_
                        x = in2_
                        t = in3_
                        raise _dafny.TailCall()
                    elif True:
                        d_5_switch1___ = d_0_k_
                        d_6_start2___ = (0 if (d_5_switch1___) == (0) else 1)
                        if (d_6_start2___) == (0):
                            d_7_sc3___ = x
                            d_8_x_ = 7
                            d_9_t_ = (t) + (d_8_x_)
                            d_10_x_ = d_7_sc3___
                            d_11_t_ = (d_9_t_) + (d_10_x_)
                            in4_ = seq0
                            in5_ = (idx0) + (1)
                            in6_ = d_10_x_
                            in7_ = d_11_t_
                            seq0 = in4_
                            idx0 = in5_
                            x = in6_
                            t = in7_
                            raise _dafny.TailCall()
                        elif True:
                            d_12_t_ = (t) + (x)
                            in8_ = seq0
                            in9_ = (idx0) + (1)
                            in10_ = x
                            in11_ = d_12_t_
                            seq0 = in8_
                            idx0 = in9_
                            x = in10_
                            t = in11_
                            raise _dafny.TailCall()
                break

    @staticmethod
    def scoped__jumps__loop1(seq1, idx1, x, t):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return t
                elif True:
                    d_0_k_ = (seq1)[idx1]
                    if (d_0_k_) > (1):
                        d_1_sc4___ = x
                        d_2_x_ = 1000
                        d_3_t_ = (t) + (d_2_x_)
                        d_4_x_ = d_1_sc4___
                        in0_ = seq1
                        in1_ = (idx1) + (1)
                        in2_ = d_4_x_
                        in3_ = d_3_t_
                        seq1 = in0_
                        idx1 = in1_
                        x = in2_
                        t = in3_
                        raise _dafny.TailCall()
                    elif True:
                        d_5_t_ = (t) + (x)
                        in4_ = seq1
                        in5_ = (idx1) + (1)
                        in6_ = x
                        in7_ = d_5_t_
                        seq1 = in4_
                        idx1 = in5_
                        x = in6_
                        t = in7_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def scoped__jumps(n, ks):
        d_0_x_ = n
        d_1_t_ = 0
        d_2_t_ = default__.scoped__jumps__loop0(ks, 0, d_0_x_, d_1_t_)
        d_3_t_ = default__.scoped__jumps__loop1(ks, 0, d_0_x_, d_2_t_)
        return d_3_t_

    @staticmethod
    def shadow__proc__loop0(seq0, idx0, weight, out):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return out
                elif True:
                    d_0_w_ = (seq0)[idx0]
                    d_1_out_ = (out) + ((len(d_0_w_)) * (weight))
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = weight
                    in3_ = d_1_out_
                    seq0 = in0_
                    idx0 = in1_
                    weight = in2_
                    out = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def shadow__proc__loop1(seq1, idx1, weight, out):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return out
                elif True:
                    d_0_w_ = (seq1)[idx1]
                    d_1_out_ = (out) + ((len(d_0_w_)) * (weight))
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = weight
                    in3_ = d_1_out_
                    seq1 = in0_
                    idx1 = in1_
                    weight = in2_
                    out = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def shadow__proc(words, list_):
        d_0_out_ = 0
        d_1_sc0___ = list_
        d_2_list_ = words
        d_3_weight_ = 1
        d_4_out_ = default__.shadow__proc__loop0(d_2_list_, 0, d_3_weight_, d_0_out_)
        d_5_list_ = d_1_sc0___
        d_6_sc1___ = d_5_list_
        d_7_list_ = d_5_list_
        d_8_weight_ = 100
        d_9_out_ = default__.shadow__proc__loop1(d_7_list_, 0, d_8_weight_, d_4_out_)
        d_10_list_ = d_6_sc1___
        return (d_9_out_) + (len(d_10_list_))

    @staticmethod
    def shifted__loop0(seq0, idx0, acc):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return acc
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_k_ = d_0_x_
                    d_2_acc_ = (acc) + (d_1_k_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_2_acc_
                    seq0 = in0_
                    idx0 = in1_
                    acc = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def shifted(xs, k):
        d_0_acc_ = 0
        d_1_acc_ = default__.shifted__loop0(xs, 0, d_0_acc_)
        return (d_1_acc_) + (k)

    @staticmethod
    def buckets__loop0(seq0, idx0, direct, guarded, coalesced):
        while True:
            with _dafny.label():
                pat_let_tv0_ = guarded
                pat_let_tv1_ = guarded
                pat_let_tv2_ = guarded
                if (idx0) >= (len(seq0)):
                    return (direct, guarded, coalesced)
                elif True:
                    d_0_k_ = (seq0)[idx0]
                    d_1_v_ = len(d_0_k_)
                    def iife0_(_pat_let0_0):
                        def iife1_(d_3_direct_):
                            return d_3_direct_
                        return iife1_(_pat_let0_0)
                    d_2_direct_ = (iife0_(default__.OMapPut(direct, d_0_k_, _dafny.SeqWithoutIsStrInference([0]))) if not((d_0_k_) in ((direct).m)) else direct)
                    d_4_bk0___ = d_0_k_
                    d_5_direct_ = (default__.OMapPut(d_2_direct_, d_4_bk0___, (((d_2_direct_).m)[d_4_bk0___]) + (_dafny.SeqWithoutIsStrInference([d_1_v_]))) if (d_4_bk0___) in ((d_2_direct_).m) else d_2_direct_)
                    d_6_g_ = (Option_Some(((guarded).m)[d_0_k_]) if (d_0_k_) in ((guarded).m) else Option_None())
                    def iife2_(_pat_let1_0):
                        def iife3_(d_7_bk1___):
                            def iife4_(_pat_let2_0):
                                def iife5_(d_8_bl2___):
                                    def iife6_(_pat_let3_0):
                                        def iife7_(d_9_guarded_):
                                            def iife8_(_pat_let4_0):
                                                def iife9_(d_10_g_):
                                                    return (d_9_guarded_, d_10_g_)
                                                return iife9_(_pat_let4_0)
                                            return iife8_(Option_Some(d_8_bl2___))
                                        return iife7_(_pat_let3_0)
                                    return iife6_((default__.OMapPut(pat_let_tv0_, d_7_bk1___, d_8_bl2___) if (d_7_bk1___) in ((pat_let_tv1_).m) else pat_let_tv2_))
                                return iife5_(_pat_let2_0)
                            return iife4_(((d_6_g_).value) + (_dafny.SeqWithoutIsStrInference([(d_1_v_) * (2)])))
                        return iife3_(_pat_let1_0)
                    def iife10_(_pat_let5_0):
                        def iife11_(d_11_guarded_):
                            return (d_11_guarded_, d_6_g_)
                        return iife11_(_pat_let5_0)
                    let_tmp_rhs0_ = (iife2_(d_0_k_) if (d_6_g_).is_Some else iife10_(default__.OMapPut(guarded, d_0_k_, _dafny.SeqWithoutIsStrInference([d_1_v_]))))
                    d_12_guarded_ = let_tmp_rhs0_[0]
                    d_13_g_ = let_tmp_rhs0_[1]
                    d_14_c_ = (((Option_Some(((coalesced).m)[d_0_k_]) if (d_0_k_) in ((coalesced).m) else Option_None())).value if ((Option_Some(((coalesced).m)[d_0_k_]) if (d_0_k_) in ((coalesced).m) else Option_None())).is_Some else _dafny.SeqWithoutIsStrInference([7]))
                    d_15_c_ = (d_14_c_) + (_dafny.SeqWithoutIsStrInference([(d_1_v_) + (1)]))
                    d_16_coalesced_ = default__.OMapPut(coalesced, d_0_k_, d_15_c_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_5_direct_
                    in3_ = d_12_guarded_
                    in4_ = d_16_coalesced_
                    seq0 = in0_
                    idx0 = in1_
                    direct = in2_
                    guarded = in3_
                    coalesced = in4_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def buckets__loop2(seq2, idx2, total):
        while True:
            with _dafny.label():
                if (idx2) >= (len(seq2)):
                    return total
                elif True:
                    d_0_x_ = (seq2)[idx2]
                    d_1_total_ = ((total) + (1000)) + (d_0_x_)
                    in0_ = seq2
                    in1_ = (idx2) + (1)
                    in2_ = d_1_total_
                    seq2 = in0_
                    idx2 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def buckets__loop3(seq3, idx3, total):
        while True:
            with _dafny.label():
                if (idx3) >= (len(seq3)):
                    return total
                elif True:
                    d_0_x_ = (seq3)[idx3]
                    d_1_total_ = ((total) + (100)) + (d_0_x_)
                    in0_ = seq3
                    in1_ = (idx3) + (1)
                    in2_ = d_1_total_
                    seq3 = in0_
                    idx3 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def buckets__loop4(seq4, idx4, total):
        while True:
            with _dafny.label():
                if (idx4) >= (len(seq4)):
                    return total
                elif True:
                    d_0_x_ = (seq4)[idx4]
                    d_1_total_ = ((total) + (10)) + (d_0_x_)
                    in0_ = seq4
                    in1_ = (idx4) + (1)
                    in2_ = d_1_total_
                    seq4 = in0_
                    idx4 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def buckets__loop1(seq1, idx1, direct, guarded, coalesced, total):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return total
                elif True:
                    d_0_k_ = (seq1)[idx1]
                    d_1_a_ = (Option_Some(((direct).m)[d_0_k_]) if (d_0_k_) in ((direct).m) else Option_None())
                    d_2_b_ = (Option_Some(((guarded).m)[d_0_k_]) if (d_0_k_) in ((guarded).m) else Option_None())
                    d_3_c_ = (Option_Some(((coalesced).m)[d_0_k_]) if (d_0_k_) in ((coalesced).m) else Option_None())
                    def iife0_(_pat_let6_0):
                        def iife1_(d_5_total_):
                            return d_5_total_
                        return iife1_(_pat_let6_0)
                    d_4_total_ = (iife0_(default__.buckets__loop2((d_1_a_).value, 0, total)) if (d_1_a_).is_Some else total)
                    def iife2_(_pat_let7_0):
                        def iife3_(d_7_total_):
                            return d_7_total_
                        return iife3_(_pat_let7_0)
                    d_6_total_ = (iife2_(default__.buckets__loop3((d_2_b_).value, 0, d_4_total_)) if (d_2_b_).is_Some else d_4_total_)
                    def iife4_(_pat_let8_0):
                        def iife5_(d_9_total_):
                            return d_9_total_
                        return iife5_(_pat_let8_0)
                    d_8_total_ = (iife4_(default__.buckets__loop4((d_3_c_).value, 0, d_6_total_)) if (d_3_c_).is_Some else d_6_total_)
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = direct
                    in3_ = guarded
                    in4_ = coalesced
                    in5_ = d_8_total_
                    seq1 = in0_
                    idx1 = in1_
                    direct = in2_
                    guarded = in3_
                    coalesced = in4_
                    total = in5_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def buckets(keys):
        def iife0_(_pat_let9_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let9_0)
        d_0_direct_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        def iife2_(_pat_let10_0):
            def iife3_(d_3_m0_):
                return d_3_m0_
            return iife3_(_pat_let10_0)
        d_2_guarded_ = iife2_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        def iife4_(_pat_let11_0):
            def iife5_(d_5_m0_):
                return d_5_m0_
            return iife5_(_pat_let11_0)
        d_4_coalesced_ = iife4_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        let_tmp_rhs0_ = default__.buckets__loop0(keys, 0, d_0_direct_, d_2_guarded_, d_4_coalesced_)
        d_6_direct_ = let_tmp_rhs0_[0]
        d_7_guarded_ = let_tmp_rhs0_[1]
        d_8_coalesced_ = let_tmp_rhs0_[2]
        d_9_total_ = 0
        d_10_total_ = default__.buckets__loop1(keys, 0, d_6_direct_, d_7_guarded_, d_8_coalesced_, d_9_total_)
        return d_10_total_

    @staticmethod
    def set__back__loop0(seq0, idx0, seen, stats):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return (seen, stats)
                elif True:
                    d_0_k_ = (seq0)[idx0]
                    def iife0_(_pat_let12_0):
                        def iife1_(d_2_s0_):
                            return d_2_s0_
                        return iife1_(_pat_let12_0)
                    d_1_s_ = (((Option_Some(((seen).m)[d_0_k_]) if (d_0_k_) in ((seen).m) else Option_None())).value if ((Option_Some(((seen).m)[d_0_k_]) if (d_0_k_) in ((seen).m) else Option_None())).is_Some else iife0_(_dafny.SeqWithoutIsStrInference([])))
                    d_3_s_ = default__.OSetAdd(d_1_s_, len(d_0_k_))
                    d_4_s_ = default__.OSetAdd(d_3_s_, 1)
                    d_5_seen_ = default__.OMapPut(seen, d_0_k_, d_4_s_)
                    d_6_st_ = (((Option_Some(((stats).m)[d_0_k_]) if (d_0_k_) in ((stats).m) else Option_None())).value if ((Option_Some(((stats).m)[d_0_k_]) if (d_0_k_) in ((stats).m) else Option_None())).is_Some else Rec__1rx04v9_Rec__1rx04v9(0, _dafny.SeqWithoutIsStrInference([5]), More_MoreBuilt()))
                    def iife2_(_pat_let13_0):
                        def iife3_(d_8_dt__update__tmp_h0_):
                            def iife4_(_pat_let14_0):
                                def iife5_(d_9_dt__update_hcount_h0_):
                                    return Rec__1rx04v9_Rec__1rx04v9(d_9_dt__update_hcount_h0_, (d_8_dt__update__tmp_h0_).lengths, (d_8_dt__update__tmp_h0_).open__rest__)
                                return iife5_(_pat_let14_0)
                            return iife4_(((d_6_st_).count) + (1))
                        return iife3_(_pat_let13_0)
                    d_7_st_ = iife2_(d_6_st_)
                    def iife6_(_pat_let15_0):
                        def iife7_(d_11_dt__update__tmp_h1_):
                            def iife8_(_pat_let16_0):
                                def iife9_(d_12_dt__update_hlengths_h0_):
                                    return Rec__1rx04v9_Rec__1rx04v9((d_11_dt__update__tmp_h1_).count, d_12_dt__update_hlengths_h0_, (d_11_dt__update__tmp_h1_).open__rest__)
                                return iife9_(_pat_let16_0)
                            return iife8_(((d_7_st_).lengths) + (_dafny.SeqWithoutIsStrInference([len(d_0_k_)])))
                        return iife7_(_pat_let15_0)
                    d_10_st_ = iife6_(d_7_st_)
                    d_13_stats_ = default__.OMapPut(stats, d_0_k_, d_10_st_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_5_seen_
                    in3_ = d_13_stats_
                    seq0 = in0_
                    idx0 = in1_
                    seen = in2_
                    stats = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def set__back__loop2(seq2, idx2, total):
        while True:
            with _dafny.label():
                if (idx2) >= (len(seq2)):
                    return total
                elif True:
                    d_0_x_ = (seq2)[idx2]
                    d_1_total_ = (total) + (d_0_x_)
                    in0_ = seq2
                    in1_ = (idx2) + (1)
                    in2_ = d_1_total_
                    seq2 = in0_
                    idx2 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def set__back__loop1(seq1, idx1, seen, stats, total):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return total
                elif True:
                    d_0_k_ = (seq1)[idx1]
                    d_1_s_ = (Option_Some(((seen).m)[d_0_k_]) if (d_0_k_) in ((seen).m) else Option_None())
                    d_2_st_ = (Option_Some(((stats).m)[d_0_k_]) if (d_0_k_) in ((stats).m) else Option_None())
                    def iife0_(_pat_let17_0):
                        def iife1_(d_4_total_):
                            return d_4_total_
                        return iife1_(_pat_let17_0)
                    d_3_total_ = (iife0_((total) + ((len(((d_1_s_).value))) * (100))) if (d_1_s_).is_Some else total)
                    def iife2_(_pat_let18_0):
                        def iife3_(d_6_total_):
                            def iife4_(_pat_let19_0):
                                def iife5_(d_7_total_):
                                    return d_7_total_
                                return iife5_(_pat_let19_0)
                            return iife4_(default__.set__back__loop2(((d_2_st_).value).lengths, 0, d_6_total_))
                        return iife3_(_pat_let18_0)
                    d_5_total_ = (iife2_((d_3_total_) + ((((d_2_st_).value).count) * (10))) if (d_2_st_).is_Some else d_3_total_)
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = seen
                    in3_ = stats
                    in4_ = d_5_total_
                    seq1 = in0_
                    idx1 = in1_
                    seen = in2_
                    stats = in3_
                    total = in4_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def set__back(keys):
        def iife0_(_pat_let20_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let20_0)
        d_0_seen_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        def iife2_(_pat_let21_0):
            def iife3_(d_3_m0_):
                return d_3_m0_
            return iife3_(_pat_let21_0)
        d_2_stats_ = iife2_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        let_tmp_rhs0_ = default__.set__back__loop0(keys, 0, d_0_seen_, d_2_stats_)
        d_4_seen_ = let_tmp_rhs0_[0]
        d_5_stats_ = let_tmp_rhs0_[1]
        d_6_total_ = 0
        d_7_total_ = default__.set__back__loop1(keys, 0, d_4_seen_, d_5_stats_, d_6_total_)
        return d_7_total_

    @staticmethod
    def rebound__loop1(seq1, idx1, sum_):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return sum_
                elif True:
                    d_0_x_ = (seq1)[idx1]
                    d_1_sum_ = (sum_) + (d_0_x_)
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = d_1_sum_
                    seq1 = in0_
                    idx1 = in1_
                    sum_ = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def rebound(merged, g):
        pat_let_tv0_ = merged
        d_0_flat_ = merged
        def iife0_(_pat_let22_0):
            def iife1_(d_2_flat_):
                def lambda0_(d_3_h_):
                    return (d_3_h_) + (1)

                def iife2_(_pat_let23_0):
                    def iife3_(d_4_flat_):
                        return d_4_flat_
                    return iife3_(_pat_let23_0)
                return iife2_((d_2_flat_) + (default__.Map__int__int(pat_let_tv0_, lambda0_)))
            return iife1_(_pat_let22_0)
        d_1_flat_ = (iife0_(_dafny.SeqWithoutIsStrInference([])) if g else d_0_flat_)
        d_5_sum_ = 0
        d_6_sum_ = default__.rebound__loop1(d_1_flat_, 0, d_5_sum_)
        return (((len(d_1_flat_)) * (100)) + (d_6_sum_)) + (len(merged))

    @staticmethod
    def widest(xs):
        def lambda0_(d_1_x_):
            return (d_1_x_) * (2)

        d_0_a_ = (default__.MaxSeq__int(default__.Map__int__int(xs, lambda0_)) if (len(xs)) != (0) else 0)
        d_2_b_ = ((default__.MinSeq__int(xs)) - (3) if (len(xs)) > (0) else 0)
        d_3_c_ = (0 if not((len(xs)) != (0)) else default__.MaxSeq__int(xs))
        if (len(xs)) == (0):
            return ((d_0_a_) + (d_2_b_)) + (d_3_c_)
        elif True:
            return (((d_0_a_) + (d_2_b_)) + (d_3_c_)) + (default__.MaxSeq__int(xs))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.scoped__jumps(5, _dafny.SeqWithoutIsStrInference([1, 0, -2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.scoped__jumps(0, _dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.scoped__jumps(-4, _dafny.SeqWithoutIsStrInference([2, 0]))))
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


class Rec__1rx04v9:
    @classmethod
    def default(cls, ):
        return lambda: Rec__1rx04v9_Rec__1rx04v9(int(0), _dafny.Seq({}), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Rec__1rx04v9(self) -> bool:
        return isinstance(self, Rec__1rx04v9_Rec__1rx04v9)

class Rec__1rx04v9_Rec__1rx04v9(Rec__1rx04v9, NamedTuple('Rec__1rx04v9', [('count', Any), ('lengths', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Rec_1rx04v9.Rec_1rx04v9({_dafny.string_of(self.count)}, {_dafny.string_of(self.lengths)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Rec__1rx04v9_Rec__1rx04v9) and self.count == __o.count and self.lengths == __o.lengths and self.open__rest__ == __o.open__rest__
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

