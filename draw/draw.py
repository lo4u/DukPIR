import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
import os

zh_font = 'SimSun'

plt.rcParams['axes.labelsize'] = 30      # 坐标轴标题 (18-20pt)
plt.rcParams['xtick.labelsize'] = 30     # 坐标刻度 (16-18pt)
plt.rcParams['ytick.labelsize'] = 30     # 坐标刻度 (16-18pt)
plt.rcParams['legend.fontsize'] = 15     # 图例 (16-18pt)
plt.rcParams['axes.titlesize'] = 30      # 图标题 (20-22pt)
plt.rcParams['font.family'] = 'DejaVu Serif'
plt.rcParams['mathtext.fontset'] = 'stix'  # 让公式里的英文字体表现类似 Times
plt.rcParams['axes.unicode_minus'] = False  # 用来正常显示负号

tuntu = [
    (2540.89, 853.11, 59040.59),
    (2475.92, 1391.61, 80553.81),
    (2168.76, 1916.89, 80961.42),
    (1892.93, 1998.75, 74289.03),
    (1984.77, 2510.79, 88673.36)
]

communication = [
    (0.3031, 0.10, 0.20),
    (0.5931, 0.13, 0.22),
    (1.1631, 0.17, 0.28),
    (2.2835, 0.22, 0.40),
    (4.5035, 0.30, 0.58)
]

# x轴标签
x_labels = ['$2^{16}$', '$2^{17}$', '$2^{18}$', '$2^{19}$', '$2^{20}$']

# 解析数据
schemes = ['ChalametPIR', 'KPIR$^{\\mathrm{index}}$', '本文方案']

# 吞吐量数据
t_chalamet = [x[0] / 10000.0 for x in tuntu]
t_kpir = [x[1] / 10000.0 for x in tuntu]
t_ours = [x[2] / 10000.0 for x in tuntu]

# 通信量数据
c_chalamet = [x[0] for x in communication]
c_kpir = [x[1] for x in communication]
c_ours = [x[2] for x in communication]

# 创建图表
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14.5, 7.0))  # 增大整体图的水平长度，增加子图之间的空间
markers = ['o', 's', '^']

# 图 1：通信量
ax1.plot(x_labels, c_chalamet, marker=markers[0], color='black', linestyle=':', label=schemes[0], linewidth=2, markersize=12, markerfacecolor='none')
ax1.plot(x_labels, c_kpir, marker=markers[1], color='black', linestyle='--', label=schemes[1], linewidth=2, markersize=12, markerfacecolor='none')
ax1.plot(x_labels, c_ours, marker=markers[2], color='black', linestyle='-', label=schemes[2], linewidth=2, markersize=12, markerfacecolor='none')
# 移除了 ax1.set_ylim(-0.2, 6.0)，交由自动缩放
ax1.margins(x=0.1)  # 放大y轴和图像上第一个数据点之间的距离
ax1.set_xlabel('数据库规模 ($\\times$ 1KB)', fontname=zh_font, labelpad=10)
ax1.set_ylabel('通信开销 (MB)', fontname=zh_font, labelpad=10)  # 补充了单位，并放大间距
ax1.set_title('(a)通信开销', y=-0.43, fontname=zh_font)
ax1.grid(True, linestyle='--', alpha=0.6)

# 图 2：吞吐量
ax2.plot(x_labels, t_chalamet, marker=markers[0], color='black', linestyle=':', label=schemes[0], linewidth=2, markersize=12, markerfacecolor='none')
ax2.plot(x_labels, t_kpir, marker=markers[1], color='black', linestyle='--', label=schemes[1], linewidth=2, markersize=12, markerfacecolor='none')
ax2.plot(x_labels, t_ours, marker=markers[2], color='black', linestyle='-', label=schemes[2], linewidth=2, markersize=12, markerfacecolor='none')
# 移除了 ax2.set_ylim(-0.5, 12.0)，交由自动缩放
ax2.margins(x=0.1)  # 放大y轴和图像上第一个数据点之间的距离
ax2.set_xlabel('数据库规模 ($\\times$ 1KB)', fontname=zh_font, labelpad=10)
ax2.set_ylabel('吞吐量 ($\\times 10^4$ MB/s)', fontname=zh_font, labelpad=10)  # 补充了单位，并放大间距
ax2.set_title('(b)吞吐量', y=-0.43, fontname=zh_font)
ax2.grid(True, linestyle='--', alpha=0.6)

# 统一放置在全局正上方
handles, labels = ax1.get_legend_handles_labels()
leg = fig.legend(handles, labels, loc='upper center', bbox_to_anchor=(0.5, 1), ncol=3, prop={'family': zh_font, 'size': 28}, frameon=False, columnspacing=6, handletextpad=0.5)

# 防止 x 轴标题和图标题被裁剪，自动排版时不包含图例，然后为图例留出上方空间
plt.tight_layout()
plt.subplots_adjust(top=0.85, bottom=0.25, wspace=0.2)  # top=0.85 留出上方空间给图例, 缩小wspace
plt.savefig('通信量与吞吐量对比.svg', dpi=300, bbox_inches='tight', bbox_extra_artists=(leg,), format='svg')  # 保存SVG
plt.savefig('通信量与吞吐量对比.png', dpi=600, bbox_inches='tight', bbox_extra_artists=(leg,), format='png')  # 保存PNG
plt.show()