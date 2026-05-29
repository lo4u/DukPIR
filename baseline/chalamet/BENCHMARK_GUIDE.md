# 🚀 ChalametPIR 基准测试完整指南

## 前置要求

首先需要安装 Rust 环境：

```bash
# 1. 安装 Rust (版本 >= 1.61.0)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 配置环境变量
source $HOME/.cargo/env

# 3. 验证安装
rustc --version
cargo --version

# 4. 确保有 Python3 (>= 3.9.7)
python3 --version
```

---

## 📊 基准测试参数说明

基准测试通过**环境变量**配置参数，在 `Makefile` 中定义了默认值：

| 参数 | 环境变量 | 默认值 | 说明 |
|------|---------|--------|------|
| **数据库行数** | `PIR_NUMBER_OF_ELEMENTS_EXP` | 16 | log₂(m)，实际行数 = 2^16 = 65536 |
| **LWE维度** | `PIR_LWE_DIM` | 1774 | 安全参数（根据FrodoPIR论文） |
| **元素大小** | `PIR_ELEM_SIZE_BITS` | 8192 | 每个元素大小（比特），8192 bits = 1KB |
| **明文空间** | `PIR_PLAINTEXT_BITS` | 10 | 决定矩阵列数 w = 2^10 = 1024 |
| **分片数** | `PIR_NUM_SHARDS` | 8 | 数据库分片数量 |
| **测试离线阶段** | `BENCH_DB_GEN` | true | 是否测试数据库生成（很慢） |
| **关键词PIR** | `BENCH_KV` | true | true=关键词PIR, false=索引PIR |

---

## 🎯 基准测试执行方式

### 方式1: 快速测试（推荐初次使用）

```bash
cd ~/workspace/DukPIR/baseline/chalamet

# 1. 编译项目
make build

# 2. 运行测试（验证功能正确性）
make test

# 3. 运行简单基准测试（默认参数：2^16 行 × 1KB）
# 注意：包含离线阶段，大约需要 12 分钟
make bench
```

**输出示例：**
```
Chosen parameters are: m: 65536, lwe_dim: 1774, elem_size: 8192, plaintext-bits: 10
Benchmarking offline: true
Benchmarking keyword: true
Setting up DB for benchmarking. This might take a while...
[KV] Setup complete, starting benchmarks...
[KV] Filter Params: segment-len: 2048, segment-len-mask: 2047, segment-count-len: 73728
[KV] Starting client query benchmarks

Benchmarking lwe/[KV] create client query prepare...
lwe/[KV] create client query prepare
                        time:   [X.XXX ms X.XXX ms X.XXX ms]

Benchmarking lwe/[KV] server response...
lwe/[KV] server response
                        time:   [XX.XX ms XX.XX ms XX.XX ms]

Benchmarking lwe/[KV] client parse server response...
lwe/[KV] client parse server response
                        time:   [X.XXX ms X.XXX ms X.XXX ms]
```

---

### 方式2: 仅测试在线阶段（跳过慢速离线阶段）

```bash
# 直接运行 cargo bench，手动设置环境变量
cd ~/workspace/DukPIR/baseline/chalamet

# 关键词PIR（在线阶段，跳过DB生成）
PIR_NUMBER_OF_ELEMENTS_EXP=16 \
PIR_LWE_DIM=1774 \
PIR_ELEM_SIZE_BITS=8192 \
PIR_PLAINTEXT_BITS=10 \
PIR_NUM_SHARDS=8 \
BENCH_DB_GEN=false \
BENCH_KV=true \
cargo bench

# 索引PIR（在线阶段，跳过DB生成）
BENCH_DB_GEN=false \
BENCH_KV=false \
cargo bench
```

---

### 方式3: 复现论文 Table 2 结果（标准配置）

```bash
# 论文 Table 2 的 1-10 行（2^16 到 2^20，元素大小 1KB）
# 大约需要 30 分钟
make bench-keyword-standard

# 这会生成以下结果文件：
# - benchmarks-16-1kb-kw.txt  (2^16 × 1KB)
# - benchmarks-17-1kb-kw.txt  (2^17 × 1KB)
# - benchmarks-18-1kb-kw.txt  (2^18 × 1KB)
# - benchmarks-19-1kb-kw.txt  (2^19 × 1KB)
# - benchmarks-20-1kb-kw.txt  (2^20 × 1KB)
```

---

### 方式4: 复现论文 Table 2 & 3 完整结果

```bash
# 论文 Table 2 的 11-13 行 + Table 3
# 警告：非常慢！
make bench-keyword-all

# 这会生成：
# - benchmarks-14-kw.txt  (2^14 × 100KB)
# - benchmarks-17-kw.txt  (2^17 × 30KB)
# - benchmarks-20-kw.txt  (2^20 × 256B)
```

**如果只想跑某个配置（跳过离线阶段）：**

```bash
make bench-keyword-20  # 2^20 × 256B
make bench-keyword-17  # 2^17 × 30KB  
make bench-keyword-14  # 2^14 × 100KB
```

---

### 方式5: 索引PIR基准测试（Table 4）

```bash
# 完整测试（包含离线阶段）
make bench-index-standard  # Table 4, 1-10行
make bench-index-all       # Table 4, 11-13行

# 仅在线阶段
make bench-index-20
make bench-index-17
make bench-index-14
```

---

## 📈 测试的性能指标

基准测试会测量以下操作的时间：

### 在线阶段（Online）- 重点关注

| 基准测试名称 | 含义 | 对应论文指标 |
|-------------|------|-------------|
| **create client query params** | 客户端生成查询参数 | Setup |
| **create client query prepare** | 客户端准备查询 | **Query** ⭐ |
| **server response** | 服务器计算响应 | **Response** ⭐ |
| **client parse server response** | 客户端解析响应 | **Parsing** ⭐ |

在线阶段通信开销（上传 + 下载）在最新基准日志中会额外打印：

- `[KV] Communication bytes (online): query: X, response: Y, total: Z`
- `[I] Communication bytes (online): query: X, response: Y, total: Z`

其中：

- `query` = 客户端上传请求大小（字节）
- `response` = 服务端下发响应大小（字节）
- `total` = 在线阶段总通信大小（字节）

### 离线阶段（Offline）- 可选

| 基准测试名称 | 含义 |
|-------------|------|
| **derive LHS from seed** | 从种子恢复LWE矩阵 |
| **generate db and params** | 生成数据库和参数 |

**论文中的关键数据来自于：Query + Response + Parsing 的总时间**


---

## 📝 结果文件解读

`make bench` **不会**自动生成 `benchmarks-*.txt` 文件，它只会把结果打印到终端。

只有以下两类方式会在项目根目录生成 `benchmarks-*.txt`：

1. 运行带重定向的 Make 目标（如 `make bench-keyword-standard`、`make bench-index-standard`）
2. 手动重定向输出（如 `cargo bench > benchmarks-custom.txt`）

示例：

```bash
# 方式1：使用带重定向的目标（会自动生成 benchmarks-*.txt）
make bench-keyword-standard

# 方式2：手动重定向（自定义文件名）
BENCH_DB_GEN=false BENCH_KV=true cargo bench > benchmarks-custom.txt

# 查看结果
cat ~/workspace/DukPIR/baseline/chalamet/benchmarks-custom.txt
```

**关键信息示例：**

```
[KV] The params are: m: 65536, lwe_dim: 1774, elem_size: 8192, plaintext-bits: 10
[KV] Filter Params: segment-len: 2048, segment-len-mask: 2047, segment-count-len: 73728

lwe/[KV] create client query prepare, lwe_dim: 1774, matrix_height: 77824, omega: 820
                        time:   [3.234 ms 3.287 ms 3.346 ms]
                                 ↑        ↑        ↑
                              下限     平均值    上限 (论文使用中间值)

lwe/[KV] server response, lwe_dim: 1774, matrix_height: 77824, omega: 820
                        time:   [17.566 ms 17.670 ms 17.789 ms]

lwe/[KV] client parse server response, lwe_dim: 1774, matrix_height: 77824, omega: 820
                        time:   [0.543 ms 0.551 ms 0.560 ms]
```

**论文 Table 2 的数据：**
- Query = 3.287 ms
- Response = 17.670 ms
- Parsing = 0.551 ms
- **Total Online = 21.508 ms**

---

## 🔍 查看详细的 HTML 报告

Criterion 还会生成可视化的 HTML 报告：

```bash
# 运行基准测试后打开浏览器查看
# 报告位于：
~/workspace/DukPIR/baseline/chalamet/target/criterion/report/index.html

# 如果在远程服务器，可以复制到本地查看
# 或者查看具体的文本报告
ls -la target/criterion/
```

---

## ⚡ 自定义参数测试示例

```bash
cd ~/workspace/DukPIR/baseline/chalamet

# 例子1: 小型数据库快速测试 (2^12 = 4096 行, 512 字节/行)
PIR_NUMBER_OF_ELEMENTS_EXP=12 \
PIR_LWE_DIM=1774 \
PIR_ELEM_SIZE_BITS=4096 \
PIR_PLAINTEXT_BITS=9 \
BENCH_DB_GEN=false \
BENCH_KV=true \
cargo bench

# 例子2: 大型数据库关键词PIR (2^18 行, 2KB/行)
PIR_NUMBER_OF_ELEMENTS_EXP=18 \
PIR_ELEM_SIZE_BITS=16384 \
PIR_PLAINTEXT_BITS=10 \
BENCH_DB_GEN=false \
BENCH_KV=true \
cargo bench

# 例子3: 索引PIR vs 关键词PIR 对比
# 先运行关键词PIR
BENCH_KV=true BENCH_DB_GEN=false cargo bench > kw-results.txt

# 再运行索引PIR
BENCH_KV=false BENCH_DB_GEN=false cargo bench > index-results.txt

# 对比结果
diff kw-results.txt index-results.txt
```

---

## 🎬 完整执行流程总结

```bash
# Step 1: 进入项目目录
cd ~/workspace/DukPIR/baseline/chalamet

# Step 2: 安装 Rust (如果未安装)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Step 3: 编译项目
make build

# Step 4: 运行测试验证功能
make test

# Step 5: 运行基准测试（选择一种）
# 选项A: 快速体验（默认配置，约12分钟）
make bench

# 选项B: 仅在线阶段（推荐，跳过慢速DB生成）
BENCH_DB_GEN=false BENCH_KV=true cargo bench

# 选项C: 复现论文标准结果（约30分钟）
make bench-keyword-standard

# Step 6: 查看结果
cat benchmarks-*.txt
# 或打开 target/criterion/report/index.html
```

---

## ⚠️ 注意事项

1. **离线阶段很慢**：`BENCH_DB_GEN=true` 会测试数据库生成，对于大型数据库可能需要数小时
2. **内存需求**：大型数据库配置（如 2^20 行）需要足够的内存
3. **警告处理**：如果看到 `Unable to complete 10 samples` 警告，可以修改 `benches/bench.rs` 第54或74行，将 `100` 改为 `500`
4. **并行性**：基准测试会使用 `rayon` 进行并行计算，多核CPU会更快
5. **AWS 环境**：论文的性能数据来自 AWS EC2 `t2.2xlarge` 和 `c5.9xlarge` 实例

---

## 📚 基准测试代码结构

基准测试的实现位于 `benches/bench.rs`，主要测试以下功能：

### 索引PIR（Index-based PIR）

```rust
_bench_client_query() 测试：
  ├─ create client query params    // 生成查询参数
  ├─ client query prepare          // 准备查询
  ├─ server response compute       // 服务器响应
  └─ client parse server response  // 客户端解析

_bench_db_generation() 测试（离线）：
  ├─ derive LHS from seed          // 从种子恢复矩阵
  └─ generate db and params        // 生成数据库和参数
```

### 关键词PIR（Keyword PIR）

```rust
_bench_client_kv_query() 测试：
  ├─ [KV] create client query params
  ├─ [KV] create client query prepare
  ├─ [KV] server response
  └─ [KV] client parse server response

_bench_kv_db_generation() 测试（离线）：
  ├─ [KV] derive LHS from seed
  └─ [KV] generate db and params
```

---

## 🔬 深入理解基准测试流程

### 数据准备

```rust
// benches/bench.rs 中的数据生成
fn generate_db_eles(num_eles: usize, ele_byte_len: usize) -> Vec<String>
  // 生成随机的 Base64 编码数据库元素

fn generate_kv_db_elems(num_eles: usize, ele_byte_len: usize) -> Vec<(String, String)>
  // 生成随机的键值对（关键词PIR）
```

### 测试执行

1. **参数解析**：从环境变量读取配置（通过 `pi-rs-cli-utils::parse_from_env()`）
2. **数据库生成**：根据参数生成随机测试数据
3. **Shard 创建**：`Shard::from_base64_strings()` 或 `KVShard::from_base64_strings()`
4. **基准测试**：使用 Criterion 框架多次执行并统计时间

### Criterion 配置

```rust
criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);

// 默认配置：
// - 100 个样本
// - 自动测量时间（约 5 秒）
// - 对于离线阶段：10 个样本，100 秒测量时间
```

---

## 💡 性能优化建议

1. **首次运行**：先用小参数（如 `PIR_NUMBER_OF_ELEMENTS_EXP=12`）验证环境
2. **跳过离线**：设置 `BENCH_DB_GEN=false` 可节省大量时间
3. **使用 release 模式**：`cargo bench` 自动使用 release 编译
4. **多核利用**：基准测试会自动利用多核心并行计算
5. **监控内存**：大型配置可能需要 8GB+ 内存

---

## 🐛 常见问题

### Q1: 编译失败
```bash
# 确保 Rust 版本 >= 1.61.0
rustc --version

# 更新 Rust
rustup update
```

### Q2: 内存不足
```bash
# 减小数据库大小
PIR_NUMBER_OF_ELEMENTS_EXP=14  # 而不是 16
PIR_ELEM_SIZE_BITS=4096        # 而不是 8192
```

### Q3: 测试时间过长
```bash
# 跳过离线阶段
BENCH_DB_GEN=false cargo bench

# 或减少样本数（修改 benches/bench.rs）
lwe_group.sample_size(10);  // 默认 100
```

### Q4: 查看中间结果
```bash
# 基准测试会打印进度信息
# 可以实时查看哪个测试在运行
```

---

## 📖 参考资料

- **Criterion.rs 文档**: https://bheisler.github.io/criterion.rs/book/index.html
- **ChalametPIR 论文**: 见项目 README.md
- **FrodoPIR**: 基础 LWE-PIR 方案
- **Binary Fuse Filter**: `bff-modp/` 目录中的修改版 xorf 库

---

## 📞 联系与贡献

如有问题或改进建议，请参考项目原始 README.md 中的联系方式。
