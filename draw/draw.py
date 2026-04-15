import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
import os

zh_font = 'SimSun'

plt.rcParams['axes.labelsize'] = 19      # 坐标轴标题 (18-20pt)
plt.rcParams['xtick.labelsize'] = 17     # 坐标刻度 (16-18pt)
plt.rcParams['ytick.labelsize'] = 17     # 坐标刻度 (16-18pt)
plt.rcParams['legend.fontsize'] = 17     # 图例 (16-18pt)
plt.rcParams['axes.titlesize'] = 21      # 图标题 (20-22pt)
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
schemes = ['ChalametPIR', 'KPIR$^{\\mathrm{index}}$', '本工作']

# 吞吐量数据
t_chalamet = [x[0] for x in tuntu]
t_kpir = [x[1] for x in tuntu]
t_ours = [x[2] for x in tuntu]

# 通信量数据
c_chalamet = [x[0] for x in communication]
c_kpir = [x[1] for x in communication]
c_ours = [x[2] for x in communication]

# 创建图表
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14.5, 5.5))  # 增大整体图的水平长度，增加子图之间的空间
markers = ['o', 's', '^']

# 图 1：通信量
ax1.plot(x_labels, c_chalamet, marker=markers[0], label=schemes[0], linewidth=2)
ax1.plot(x_labels, c_kpir, marker=markers[1], label=schemes[1], linewidth=2)
ax1.plot(x_labels, c_ours, marker=markers[2], label=schemes[2], linewidth=2)
ax1.set_ylim(-0.2, 6.0)  # 设置 Y 轴范围，留出顶部空间给图例
ax1.set_xlabel('数据库规模 ($\\times$ 1KB)', fontname=zh_font)
ax1.set_ylabel('通信量 (MB)', fontname=zh_font)  # 补充了单位
ax1.set_title('(a) 通信量', y=-0.4, fontname=zh_font)
ax1.legend(loc='upper left', prop={'family': zh_font, 'size': 14})  # 独立把图例字体适当缩小以防遮挡
ax1.grid(True, linestyle='--', alpha=0.6)

# 图 2：吞吐量
ax2.plot(x_labels, t_chalamet, marker=markers[0], label=schemes[0], linewidth=2)
ax2.plot(x_labels, t_kpir, marker=markers[1], label=schemes[1], linewidth=2)
ax2.plot(x_labels, t_ours, marker=markers[2], label=schemes[2], linewidth=2)
ax2.set_ylim(-5000, 120000)  # 设置 Y 轴范围，留出顶部空间给图例
ax2.set_xlabel('数据库规模 ($\\times$ 1KB)', fontname=zh_font)
ax2.set_ylabel('吞吐量 (MB/s)', fontname=zh_font)  # 补充了单位
ax2.set_title('(b) 吞吐量', y=-0.4, fontname=zh_font)
ax2.legend(loc='upper left', prop={'family': zh_font, 'size': 14})  # 独立把图例字体适当缩小以防遮挡
ax2.grid(True, linestyle='--', alpha=0.6)

plt.tight_layout()
plt.subplots_adjust(bottom=0.3, wspace=0.3)  # 增加 wspace 来放大两张图中间的空白间距
plt.savefig('通信量与吞吐量对比.svg', dpi=300, bbox_inches='tight', format='svg')  # 保存SVG
plt.savefig('通信量与吞吐量对比.png', dpi=600, bbox_inches='tight', format='png')  # 保存PNG
plt.show()