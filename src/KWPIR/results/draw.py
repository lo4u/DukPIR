#!/usr/bin/env python3
"""统计并绘图：针对每个 distribution 的前若干条查询，计算 Type=0/1/2 的比例，并绘制 Type=0 的折线图。

生成文件：
- results/summary_correctness.csv
- results/correct_rate.png

用法：
    python3 results/draw.py
"""
import csv
import glob
import os
import re
from collections import Counter

import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 这些参数我一般都放这里，后面调版面时只改一处就行。
zh_font = 'SimSun'
PLOT_STYLE = {
    # font sizes
    'axes_labelsize': 36,
    'xtick_labelsize': 24,
    'ytick_labelsize': 24,
    'legend_fontsize': 30,
    'axes_titlesize': 36,
    'xlabel_fontsize': 29,
    'xlabel_labelpad': 10,
    # figure layout: adjusted to match draw/draw.py proportions
    'figure_size': (14.5, 7.0),
    'subplot_top': 0.85,
    'subplot_bottom': 0.25,
    'subplot_wspace': 0.20,
    # legend / subtitle
    'legend_fontsize_fig': 28,
    'legend_ncol': 4,
    'legend_anchor_y': 1.0,
    'subtitle_y': 0.075,
    'subtitle_fontsize': 30,
}

plt.rcParams['axes.labelsize'] = PLOT_STYLE['axes_labelsize']
plt.rcParams['xtick.labelsize'] = PLOT_STYLE['xtick_labelsize']
plt.rcParams['ytick.labelsize'] = PLOT_STYLE['ytick_labelsize']
plt.rcParams['legend.fontsize'] = PLOT_STYLE['legend_fontsize']
plt.rcParams['axes.titlesize'] = PLOT_STYLE['axes_titlesize']
plt.rcParams['font.family'] = 'DejaVu Serif'
plt.rcParams['mathtext.fontset'] = 'stix'
plt.rcParams['axes.unicode_minus'] = False


PREFIX_SIZES = [50, 100, 200, 400, 600, 800, 1000]
LINE_STYLES = [(':', 'o'), ('--', 's'), ('-', '^'), ('-.', 'D')]
# matches names like 'result_91_01' (we match against filename without extension)
RUN_FILE_RE = re.compile(r'^(?P<config>result_\d+)_(?P<run>\d{2})$')


def parse_result_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        header = f.readline()
        types = []
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            # Expect last column to be Type (0/1/2)
            try:
                t = int(parts[-1])
            except Exception:
                # fallback: if not int, skip
                continue
            types.append(t)
    return types


def group_result_files(files):
    groups = {}
    legacy_files = []
    for path in files:
        name = os.path.splitext(os.path.basename(path))[0]
        match = RUN_FILE_RE.match(name)
        if match:
            config_name = match.group('config')
            groups.setdefault(config_name, []).append(path)
        else:
            legacy_files.append(path)

    # 兼容旧格式：如果没有按 run 编号命名的文件，再把旧的单文件结果按配置名收进来。
    if not groups:
        for path in legacy_files:
            name = os.path.splitext(os.path.basename(path))[0]
            groups.setdefault(name, []).append(path)

    for config_name in groups:
        groups[config_name] = sorted(groups[config_name])
    return groups


def summarize(types, prefixes):
    rows = []
    n_total = len(types)
    for p in prefixes:
        use_n = min(p, n_total)
        slice_types = types[:use_n]
        c = Counter(slice_types)
        cnt0 = c.get(0, 0)
        cnt1 = c.get(1, 0)
        cnt2 = c.get(2, 0)
        prop0 = cnt0 / use_n if use_n else 0.0
        prop1 = cnt1 / use_n if use_n else 0.0
        prop2 = cnt2 / use_n if use_n else 0.0
        rows.append((p, use_n, cnt0, cnt1, cnt2, prop0, prop1, prop2))
    return rows


def summarize_group(files, prefixes):
    per_run_rows = []
    for path in files:
        types = parse_result_file(path)
        per_run_rows.append(summarize(types, prefixes))

    if not per_run_rows:
        return []

    summary_rows = []
    for prefix_index, prefix in enumerate(prefixes):
        values = [run_rows[prefix_index] for run_rows in per_run_rows if prefix_index < len(run_rows)]
        if not values:
            continue
        use_n = values[0][1]
        avg_cnt0 = sum(row[2] for row in values) / len(values)
        avg_cnt1 = sum(row[3] for row in values) / len(values)
        avg_cnt2 = sum(row[4] for row in values) / len(values)
        avg_prop0 = sum(row[5] for row in values) / len(values)
        avg_prop1 = sum(row[6] for row in values) / len(values)
        avg_prop2 = sum(row[7] for row in values) / len(values)
        summary_rows.append((prefix, use_n, avg_cnt0, avg_cnt1, avg_cnt2, avg_prop0, avg_prop1, avg_prop2))
    return summary_rows


def plot_black_white(ax, data_map, prefixes, title, show_legend=True, title_y=-0.43):
    # use equal-spaced x positions to ensure visible gaps between ticks
    x_positions = list(range(len(prefixes)))
    for idx, (name, props) in enumerate(sorted(data_map.items())):
        linestyle, marker = LINE_STYLES[idx % len(LINE_STYLES)]
        ax.plot(
            x_positions[:len(props)],
            props,
            color='black',
            linestyle=linestyle,
            marker=marker,
            label=name,
            linewidth=2,
            markersize=10,
            markerfacecolor='none',
        )
    ax.set_xlabel('查询次数', fontname=zh_font, fontsize=PLOT_STYLE['xlabel_fontsize'], labelpad=PLOT_STYLE['xlabel_labelpad'])
    # do not set title here; subtitles will be placed below images in the figure
    # (title parameter retained for API compatibility)
    ax.set_xticks(x_positions)
    ax.set_xticklabels([str(p) for p in prefixes], fontsize=16)
    ax.set_xlim(x_positions[0] - 0.5, x_positions[-1] + 0.5)
    # ensure consistent tick label sizes
    ax.tick_params(axis='x', labelsize=PLOT_STYLE['xtick_labelsize'])
    ax.tick_params(axis='y', labelsize=PLOT_STYLE['ytick_labelsize'])
    ax.grid(True, linestyle='--', alpha=0.5)
    if show_legend:
        ax.legend(prop={'size': PLOT_STYLE['legend_fontsize'] // 1})


def main():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    results_dir = script_dir
    pattern = os.path.join(results_dir, 'result_*.txt')
    files = sorted(glob.glob(pattern))
    if not files:
        print('未找到任何 result_*.txt 文件于', results_dir)
        return

    grouped_files = group_result_files(files)
    # Edit these labels directly to change the legend text.
    # Keys should match result file basenames, for example result_91.
    legend_labels = {
        'result_64': 'α=2.262',
        'result_73': 'α=1.421',
        'result_82': 'α=1.161',
        'result_91': 'α=1.048',
    }

    if not grouped_files:
        print('未找到可用于聚合的 result_*.txt 文件于', results_dir)
        return

    # 先收集每个配置的结果文件并用于计算最大样本数
    types_map = {}
    for config_name, config_files in grouped_files.items():
        types_map[config_name] = [parse_result_file(path) for path in config_files]

    # 根据最大样本数生成自适应前缀刻度
    max_n = max((len(t) for runs in types_map.values() for t in runs), default=0)
    def generate_prefixes(max_n):
        if max_n <= 0:
            return PREFIX_SIZES
        base = [50, 100, 200, 400, 600, 800, 1000]
        prefixes = [p for p in base if p < max_n]
        if not prefixes:
            prefixes = [min(50, max_n)]
        last = prefixes[-1]
        while last < max_n:
            next_val = last * 2
            if next_val >= max_n:
                next_val = max_n
            prefixes.append(next_val)
            last = next_val
            if last == max_n:
                break
        prefixes = sorted(dict.fromkeys(prefixes))
        return prefixes

    prefixes = generate_prefixes(max_n)

    summary_rows = []
    plot_data = {}
    plot_data01 = {}

    # 使用自适应前缀对每个配置的多个 run 进行聚合统计
    for name, run_types_list in types_map.items():
        rows = summarize_group(grouped_files[name], prefixes)
        for p, use_n, cnt0, cnt1, cnt2, prop0, prop1, prop2 in rows:
            summary_rows.append((name, p, use_n, cnt0, cnt1, cnt2, prop0, prop1, prop2))
        plot_data[name] = [r[5] for r in rows]
        plot_data01[name] = [r[5] + r[6] for r in rows]

    # 写 CSV
    csv_path = os.path.join(results_dir, 'summary_correctness.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as cf:
        writer = csv.writer(cf)
        writer.writerow(['result_file', 'prefix', 'used', 'count0', 'count1', 'count2', 'prop0', 'prop1', 'prop2'])
        for r in summary_rows:
            writer.writerow(r)

    # # 保存单独两张图
    # plt.figure(figsize=(8, 5))
    # ax = plt.gca()
    # plot_black_white(ax, plot_data, '平均正确率', 'Correct rate (Type=0) vs Prefix Size')
    # out_png = os.path.join(results_dir, 'correct_rate.png')
    # plt.tight_layout()
    # plt.savefig(out_png)

    # plt.figure(figsize=(8, 5))
    # ax = plt.gca()
    # plot_black_white(ax, plot_data01, '显式正确率', 'Explicit correct rate (Type=0 or 1) vs Prefix Size')
    # out_png2 = os.path.join(results_dir, 'explicit_correct_rate.png')
    # plt.tight_layout()
    # plt.savefig(out_png2)

    fig, axes = plt.subplots(1, 2, figsize=PLOT_STYLE['figure_size'])
    # 左侧：显式正确率 (Type=0 or Type=1)
    plot_black_white(axes[0], plot_data01, prefixes, '(a)显式正确率', show_legend=False, title_y=-0.36)

    # 右侧：平均正确率 (Type=0)
    plot_black_white(axes[1], plot_data, prefixes, '(b)平均正确率', show_legend=False, title_y=-0.36)

    handles, labels = axes[0].get_legend_handles_labels()
    handle_map = dict(zip(sorted(plot_data01.keys()), handles))
    legend_keys = list(reversed(sorted(plot_data01.keys())))
    handles = [handle_map[name] for name in legend_keys]
    labels = [legend_labels.get(name, name) for name in legend_keys]
    # distribute labels across columns but keep legend centered above plots
    ncol = min(len(labels), PLOT_STYLE['legend_ncol'])
    fig.legend(
        handles,
        labels,
        loc='upper center',
        bbox_to_anchor=(0.5, PLOT_STYLE['legend_anchor_y']),
        ncol=ncol,
        prop={'size': PLOT_STYLE['legend_fontsize_fig']},
        frameon=False,
        columnspacing=1.5,
        handletextpad=0.5,
        handlelength=2.0,
    )

    combined_out = os.path.join(results_dir, 'combined_correct_rate.png')
    combined_svg = os.path.join(results_dir, 'combined_correct_rate.svg')
    fig.tight_layout()
    # 这里主要管上下留白，想挪就改这几个数
    fig.subplots_adjust(top=PLOT_STYLE['subplot_top'], bottom=PLOT_STYLE['subplot_bottom'], wspace=PLOT_STYLE['subplot_wspace'])

    # 子标题放在图下面，坐标是 figure 坐标，不跟着轴跑
    left_pos = axes[0].get_position()
    right_pos = axes[1].get_position()
    left_center = left_pos.x0 + left_pos.width / 2.0
    right_center = right_pos.x0 + right_pos.width / 2.0
    subtitle_y = PLOT_STYLE['subtitle_y']
    fig.text(left_center, subtitle_y, '(a) 显式正确率', ha='center', va='top', fontsize=PLOT_STYLE['subtitle_fontsize'], fontname=zh_font)
    fig.text(right_center, subtitle_y, '(b) 平均正确率', ha='center', va='top', fontsize=PLOT_STYLE['subtitle_fontsize'], fontname=zh_font)
    fig.savefig(combined_out)
    fig.savefig(combined_svg)

    print('已生成:', csv_path)
    # print('已生成:', out_png)
    # print('已生成:', out_png2)
    print('已生成:', combined_out)
    print('已生成:', combined_svg)


if __name__ == '__main__':
    main()
