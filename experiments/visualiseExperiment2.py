# Create graphs for experiment 1 results. 
import json
import matplotlib.pyplot as plt
import seaborn as sns  # Seaborn for enhanced visualization
import pandas as pd
import os

xyLabelFont = {'size': 14}
titleFont = {'size': 16, 'weight': 'bold'}

#####################################
##### READ DATA FIRST           #####
#####################################
jse_base = []
with open("experiments/jse_base", "r") as f:
    line = f.readline()
    while line: 
        jse_base.append(json.loads(line[0:-1]))
        line = f.readline()
jse_base = [entry for entry in jse_base if entry['return_code'] == 0]

jse_diff = []
with open("experiments/jse_diff_analysis", "r") as f:
    line = f.readline()
    while line: 
        jse_diff.append(json.loads(line[0:-1]))
        line = f.readline()
jse_diff = [entry for entry in jse_diff if entry['return_code'] == 0]

stats = []
for result in jse_diff:
    id = result["id"]
    with open("randjs/{}.stats.json".format(id), "r") as f:
        stat = json.loads(f.readline())
        stat["id"] = id
        stats.append(stat)
stats = [entry for entry in stats if entry['id'] in [item['id'] for item in jse_diff]]

#####################################
##### execution time comparison #####
#####################################

plt.boxplot([[i["time"] for i in jse_base], [i["time"] for i in jse_diff]], labels=['JSE without TA', 'JSE with TA'])
# Add labels and title
plt.ylabel('Time (seconds)', **xyLabelFont)
plt.title('JSE Performance with and without Targeted Analysis (TA)', **titleFont)
plt.show()

########################################
##### execution time against stats #####
########################################

# Merge data into a single DataFrame
df = pd.merge(pd.DataFrame(jse_diff), pd.DataFrame(stats), on='id')

# Set 'id' as index for better visualization
df.set_index('id', inplace=True)

# Extract data for the selected fields
selected_fields_set1 = ['AVE_BRANCH_LENGTH', 'AVE_CONDITIONALS_PER_BRANCH']
selected_fields_set2 = ['AVE_AST_DEPTH', 'NUM_BRANCHES']

# Create subplots for each selected field set and save each plot separately
for i, fields in enumerate([selected_fields_set1, selected_fields_set2]):
    fig, axes = plt.subplots(nrows=2, figsize=(11, 11))

    for j, field in enumerate(fields):
        axes[j].scatter(df[field],df['time'], label=field, color='black', alpha=0.7)
        axes[j].set_ylabel("Time (seconds)", **xyLabelFont)
        axes[j].grid(True, linestyle='--', alpha=0.7)
    if i == 0:
        axes[0].set_title("JSE Execution Time (With Targeted Analysis) againts Average Branch Length", **titleFont)
        axes[0].set_xlabel("Average Branch Length", **xyLabelFont)
        axes[1].set_title("JSE Execution Time (With Targeted Analysis) againts Branching Factor", **titleFont)
        axes[1].set_xlabel("Branching Factor", **xyLabelFont)
    else:
        axes[0].set_title("JSE Execution Time (With Targeted Analysis) againts Average AST Depth", **titleFont)
        axes[0].set_xlabel("Average AST Depth", **xyLabelFont)
        axes[1].set_title("JSE Execution Time (With Targeted Analysis) againts Total Number of Branches", **titleFont)
        axes[1].set_xlabel("Total Number of Branches", **xyLabelFont)

    # Adjust layout
    plt.tight_layout()
    plt.savefig(f"jseStats_subplot_{i+1}.png")
    plt.show()

field = "AVE_BRANCH_LENGTH"
fig, ax1 = plt.subplots(figsize=(8, 5))
ax1.scatter(df[field], df['time'], label=field, color='black', alpha=0.7)
ax1.set_xlabel('Average Branch Length', labelpad=10, **xyLabelFont)
ax1.set_ylabel('Time /s', labelpad=10, **xyLabelFont)
ax2 = ax1.twinx()
sns.histplot(df[field], bins=30, kde=True, color='blue', ax=ax2, discrete=True)
ax2.set_ylabel('Frequency', labelpad=10, **xyLabelFont)
plt.title('JSE Execution Time (With Targeted Analysis) and Frequency against Average Branch Length', **titleFont)
plt.legend()
plt.show()

#############################################
##### Cache Size against execution time #####
#############################################

cacheSizes = []
for i in [j["id"] for j in jse_diff]:
    cacheSize = 0
    path = "results/JSE{}/cache".format(i)
    if os.path.exists(path):
        cacheSize = os.path.getsize(path)

    cacheSizes.append(cacheSize/1000000)
plt.hist(cacheSizes, bins=30, edgecolor='black')
plt.xlabel('Cache Size (MB)', **xyLabelFont)
plt.ylabel('Frequency', **xyLabelFont)
plt.title('Distribution of Cache Sizes', **titleFont)
plt.show()

plt.scatter(cacheSizes, [i["time"] for i in jse_diff], color='black', marker='o', alpha=0.7)
plt.xlabel("Cache Size (MB)", **xyLabelFont)
plt.ylabel('Execution Time (sec)', **xyLabelFont)
plt.title("JSE Execution Time against Cache Size for Targeted Analysis", **titleFont)
plt.show()



####################################
##### Cache Size against stats #####
####################################

# Extract data for the selected fields
selected_fields_set1 = ['AVE_BRANCH_LENGTH', 'AVE_CONDITIONALS_PER_BRANCH']
selected_fields_set2 = ['AVE_AST_DEPTH', 'NUM_BRANCHES']

# Create subplots for each selected field set and save each plot separately
for i, fields in enumerate([selected_fields_set1, selected_fields_set2]):
    fig, axes = plt.subplots(nrows=2, figsize=(11, 11))

    for j, field in enumerate(fields):
        axes[j].scatter([i[field] for i in stats], cacheSizes, label=field, color='black', alpha=0.7)
        axes[j].set_ylabel("Cache Size (MB)", **xyLabelFont)
        axes[j].grid(True, linestyle='--', alpha=0.7)
    if i == 0:
        axes[0].set_title("JSE Targeted Analysis Cache Size againts Average Branch Length", **titleFont)
        axes[0].set_xlabel("Average Branch Length", **xyLabelFont)
        axes[1].set_title("JSE Targeted Analysis Cache Size againts Branching Factor", **titleFont)
        axes[1].set_xlabel("Branching Factor", **xyLabelFont)
    else:
        axes[0].set_title("JSE Targeted Analysis Cache Size againts Average AST Depth", **titleFont)
        axes[0].set_xlabel("Average AST Depth", **xyLabelFont)
        axes[1].set_title("JSE Targeted Analysis Cache Size againts Total Number of Branches", **titleFont)
        axes[1].set_xlabel("Total Number of Branches", **xyLabelFont)

    # Adjust layout
    plt.tight_layout()
    plt.savefig(f"jseStats_cachesize_subplot_{i+1}.png")
    plt.show()
