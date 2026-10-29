; step 0 hand prelude: JavaScript number operations over IEEE-754 binary64 (ECMA-262 6.1.6.1, 21.3.2)
(define-sort D () (_ FloatingPoint 11 53))
(define-fun js.nan () D (_ NaN 11 53))
(define-fun js.pz () D (_ +zero 11 53))
(define-fun js.nz () D (_ -zero 11 53))
(define-fun js.one () D ((_ to_fp 11 53) RNE 1.0))
(define-fun js.half () D ((_ to_fp 11 53) RNE 0.5))
; % : truncated remainder (Number::remainder 6.1.6.1.6) from the IEEE remainder plus one correction of |y| toward x's sign
(define-fun js.rem ((x D) (y D)) D
  (ite (or (fp.isNaN x) (fp.isNaN y) (fp.isInfinite x) (fp.isZero y)) js.nan
  (ite (or (fp.isInfinite y) (fp.isZero x)) x
  (let ((r (fp.rem x y)))
  (ite (fp.isZero r) (ite (fp.isNegative x) js.nz js.pz)
  (ite (= (fp.isNegative r) (fp.isNegative x)) r
  (ite (fp.isNegative x) (fp.sub RNE r (fp.abs y)) (fp.add RNE r (fp.abs y)))))))))
; Math.round (21.3.2.28): floor(x + 0.5) taken exactly, ties toward +Infinity, a -0 for x in [-0.5, 0)
(define-fun js.round ((x D)) D
  (let ((f (fp.roundToIntegral RTN x)))
  (let ((r (ite (fp.geq (fp.sub RNE x f) js.half) (fp.add RNE f js.one) f)))
  (ite (and (fp.isNegative x) (fp.isZero r)) js.nz r))))
; Math.min / Math.max (21.3.2.24, 21.3.2.25): NaN wins, -0 below +0
(define-fun js.min ((a D) (b D)) D
  (ite (or (fp.isNaN a) (fp.isNaN b)) js.nan (ite (fp.lt a b) a (ite (fp.lt b a) b (ite (fp.isNegative a) a b)))))
(define-fun js.max ((a D) (b D)) D
  (ite (or (fp.isNaN a) (fp.isNaN b)) js.nan (ite (fp.gt a b) a (ite (fp.gt b a) b (ite (fp.isNegative a) b a)))))
; ToInt32 / ToUint32 (7.1.6, 7.1.7): NaN and infinities to 0, truncate, modulo 2^32. An integer of magnitude 2^84 or more
; is a multiple of 2^32 (its unit in the last place is 2^32 or more), so it is 0; below, the exact 85-bit integer's low 32 bits
(define-fun js.bits ((x D)) (_ BitVec 32)
  (let ((t (fp.roundToIntegral RTZ x)))
  (ite (or (fp.isNaN x) (fp.isInfinite x) (fp.geq (fp.abs t) ((_ to_fp 11 53) RNE 19342813113834066795298816.0))) #x00000000
    ((_ extract 31 0) ((_ fp.to_sbv 85) RTZ t)))))
(define-fun js.int32 ((x D)) D ((_ to_fp 11 53) RNE (js.bits x)))
(define-fun js.uint32 ((x D)) D ((_ to_fp_unsigned 11 53) RNE (js.bits x)))
