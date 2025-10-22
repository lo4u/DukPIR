# ...existing code...
from sympy import isprime, nextprime
import math

target = 2**32
print("2^32 =", target)

# 检查 2^n + 1 是否为素数（n 在 1..64）
for n in range(1, 65):
    v = 2**n + 1
    if abs(v - target) < 10**8:  # 只输出接近 target 的
        print("2^%d+1 = %d, isprime=%s, diff=%d" % (n, v, isprime(v), v - target))

# 明确检查 2^32+1
v = 2**32 + 1
print("2^32+1 isprime?", isprime(v))

# 在 target 附近搜索形如 k*2^m+1 的素数（给定 m 范围）
def search_proth_near(target, m_min=20, m_max=30, window=2000000):
    found = []
    for m in range(m_min, m_max+1):
        base = 2**m
        k_center = target // base
        k_lo = max(1, k_center - 10)
        k_hi = k_center + 10
        for k in range(k_lo, k_hi+1):
            p = k * base + 1
            if abs(p - target) > window:
                continue
            if isprime(p):
                found.append((p, k, m, p - target))
    return found

res = search_proth_near(target, m_min=20, m_max=31, window=5_000_000)

# 解释与更友好的输出
print("Found proth-like primes near 2^32: %d entries" % len(res))
if res:
    print("说明：每个条目格式为 (p, k, m, p - target)，表示 p = k * 2^m + 1，最后一项是 p 与 2^32 的差值。")
    print("同时把 p-1 分解为 k2 * 2^m2（k2 为奇数），并说明是否为严格的 2^m + 1 形式。")
    for p, k, m, diff in res:
        # 分解 p-1 的 2 的幂因子
        t = p - 1
        m2 = 0
        while t % 2 == 0:
            t //= 2
            m2 += 1
        k2 = t  # 现在 p-1 = k2 * 2^m2 且 k2 为奇数

        if k2 == 1:
            desc = f"严格形式：p = 2^{m2} + 1 （Fermat 形式）"
        else:
            desc = f"NTT 友好形式：p-1 可被 2^{m2} 整除，p = {k2} * 2^{m2} + 1（k2={k2}）"

        print(f"p={p}, k={k}, m={m}, diff={diff} -> {desc}")
else:
    print("未在指定范围内找到满足条件的素数。")
# ...existing code...