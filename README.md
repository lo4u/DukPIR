# 面向现实分布的高效动态关键字匿踪查询方案

## 安装依赖

```bash
git clone https://github.com/lo4u/ddpir
cd frontend
go mod init ddpir
go get github.com/seiflotfy/cuckoofilter
go get github.com/ahenzinger/simplepir
```

## 使用方法

### 基本使用

```bash
# 从文件读取数据库并查询指定key
go run main.go -f database.txt -qkey "testkey" -p_worse 0.3

# 生成随机数据库并从热门数据库随机查询
go run main.go -n 1000 -l 10 -querypop 1 -p_worse 0.7

```

### 命令行参数

| 参数        | 类型    | 默认值 | 描述                                       |
| ----------- | ------- | ------ | ------------------------------------------ |
| `-f`        | string  | ""     | 数据库文件路径(若不指定，则随机生成数据库)                             |
| `-n`        | int     | 0      | 生成随机数据库的行数                           |
| `-l`        | int     | 0      | 生成随机数据的键值长度                        |
| `-mode`     | string  | "rate" | 选择热门数据库模式：lim(概率限制) 或 rate(比例)      |
| `-val`      | float64 | 0.1    | 选择模式对应的值                           |
| `-p_worse`  | float64 | 0.5    | 使用完整数据库的概率              |
| `-qkey`     | string  | ""     | 指定查询的key                              |
| `-querypop` | int     | 1      | 随机查询时指定来源：1(热门数据库) 或 0(非热门数据库) |

### 数据库文件格式

数据库文件应为文本格式，每行包含三个字段，用空格分隔：

```
key value probability
```

示例：

```
key1 value1 0.65
key2 value2 0.25
key3 value3 0.09
key4 value4 0.01
```

---

## Baseline: KPIR

本项目包含用于性能对比的 baseline 实现 `baseline/mpc4j`（[alibaba-edu/mpc4j](https://github.com/alibaba-edu/mpc4j) ）。

### 编译

```bash
cd baseline/mpc4j
mvn clean install \
  -Dos.detected.classifier=linux-x86_64 \
  -Dmaven.compiler.source=21 \
  -Dmaven.compiler.target=21 \
  -DskipTests
```

⚠️ `-Dos.detected.classifier=linux-x86_64` 必须指定。配置参考 `~/workspace/docker/dockerfile_template`。

### 运行

```bash
# 终端 1: Server
java --add-modules=jdk.incubator.vector --enable-preview \
  -cp mpc4j-s2pc-pir/target/mpc4j-s2pc-pir-1.1.4-beta-jar-with-dependencies.jar \
  edu.alibaba.mpc4j.s2pc.pir.main.PirMain \
  kspir_quick_test.conf server

# 终端 2: Client
java --add-modules=jdk.incubator.vector --enable-preview \
  -cp mpc4j-s2pc-pir/target/mpc4j-s2pc-pir-1.1.4-beta-jar-with-dependencies.jar \
  edu.alibaba.mpc4j.s2pc.pir.main.PirMain \
  kspir_quick_test.conf client
```

⚠️ `--add-modules=jdk.incubator.vector` 必须添加。

## Baseline：chalametPIR

本项目包含用于性能对比的 baseline 实现 `baseline/chalamet`

编译：
PIR_NUMBER_OF_ELEMENTS_EXP=2 \
PIR_LWE_DIM=1774 \
PIR_ELEM_SIZE_BITS=2048 \
PIR_PLAINTEXT_BITS=9 \
BENCH_DB_GEN=false \
BENCH_KV=true \
cargo bench --bench bench