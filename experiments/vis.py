import json
import matplotlib.pyplot as plt
import seaborn as sns  # Seaborn for enhanced visualization
import pandas as pd

xyLabelFont = {'size': 14}
titleFont = {'size': 16, 'weight': 'bold'}

jse_results = []
with open("experiments/jse_results_exp1", "r") as f:
    line = f.readline()
    while line: 
        jse_results.append(json.loads(line[0:-1]))
        line = f.readline()
jse_results = [entry for entry in jse_results if entry['return_code'] == 0]
stats1 = []
for result in jse_results:
    id = result["id"]
    with open("randjs-exp1/{}.stats.json".format(id), "r") as f:
        stat = json.loads(f.readline())
        stat["id"] = id
        stats1.append(stat)
stats1 = [entry for entry in stats1 if entry['id'] in [item['id'] for item in jse_results]]


jse_diff = []
with open("experiments/jse_diff_analysis", "r") as f:
    line = f.readline()
    while line: 
        jse_diff.append(json.loads(line[0:-1]))
        line = f.readline()
jse_diff = [entry for entry in jse_diff if entry['return_code'] == 0]

stats2 = []
for result in jse_diff:
    id = result["id"]
    with open("randjs/{}.stats.json".format(id), "r") as f:
        stat = json.loads(f.readline())
        stat["id"] = id
        stats2.append(stat)
stats2 = [entry for entry in stats2 if entry['id'] in [item['id'] for item in jse_diff]]

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter([i["NUM_BRANCHES"] for i in stats1], [i["time"] for i in jse_results], label='Without targeted analysis', alpha=0.7)
ax.scatter([i["NUM_BRANCHES"] for i in stats2], [i["time"]-3.1 for i in jse_diff], label='With targeted analysis (-3.1 seconds)', alpha=0.7)
ax.set_xlabel('Number of Branches', labelpad=10, **xyLabelFont)
ax.set_ylabel('Time /s', labelpad=10, **xyLabelFont)
plt.title('JSE Execution Time (With and without Targeted Analysis) against Number of Branches', **titleFont)
plt.legend()
plt.show()


fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter([i["AVE_AST_DEPTH"] for i in stats1], [i["time"] for i in jse_results], label='Without targeted analysis', alpha=0.7)
ax.scatter([i["AVE_AST_DEPTH"] for i in stats2], [i["time"]-3.1 for i in jse_diff], label='With targeted analysis (-3.1 seconds)', alpha=0.7)
ax.set_xlabel('Average AST Depth', labelpad=10, **xyLabelFont)
ax.set_ylabel('Time /s', labelpad=10, **xyLabelFont)
plt.title('JSE Execution Time (With and without Targeted Analysis) against Average AST Depth', **titleFont)
plt.legend()
plt.show()