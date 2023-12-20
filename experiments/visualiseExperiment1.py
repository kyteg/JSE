# Create graphs for experiment 1 results. 
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

jazzer_cov = []
with open("experiments/jazzer_cov_0.1_exp1", "r") as f:
    cov = []
    line = f.readline()
    while line:
        cov.append(int(line))
        line = f.readline()
    jazzer_cov.append(cov)
with open("experiments/jazzer_cov_0.5_exp1", "r") as f:
    cov = []
    line = f.readline()
    while line:
        cov.append(int(line))
        line = f.readline()
    jazzer_cov.append(cov)
with open("experiments/jazzer_cov_1_exp1", "r") as f:
    cov = []
    line = f.readline()
    while line:
        cov.append(int(line))
        line = f.readline()
    jazzer_cov.append(cov)


stats = []
for result in jse_results:
    id = result["id"]
    with open("randjs-exp1/{}.stats.json".format(id), "r") as f:
        stat = json.loads(f.readline())
        stat["id"] = id
        stats.append(stat)
    
print(jse_results)
print(jazzer_cov)
print(stats)

jse_results = [entry for entry in jse_results if entry['return_code'] == 0]
stats = [entry for entry in stats if entry['id'] in [item['id'] for item in jse_results]]
jazzer_cov[0] = [jazzer_cov[0][entry["id"]-1] for entry in jse_results]
jazzer_cov[1] = [jazzer_cov[1][entry["id"]-1] for entry in jse_results]
jazzer_cov[2] = [jazzer_cov[2][entry["id"]-1] for entry in jse_results]

# Extract data
ids = [entry['id'] for entry in stats]
times = [entry['time'] for entry in jse_results if entry['id'] in ids]

# Plot histogram
plt.figure(figsize=(8, 5))
sns.histplot(times, bins=20, kde=True, color='blue')
plt.xlabel('Time (seconds)', **xyLabelFont)
plt.ylabel('Frequency', **xyLabelFont)
plt.title('Distribution of Execution Times', **titleFont)
plt.show()

# Merge data into a single DataFrame
df = pd.merge(pd.DataFrame(jse_results), pd.DataFrame(stats), on='id')

# Set 'id' as index for better visualization
df.set_index('id', inplace=True)

# Extract data for the selected fields
selected_fields_set1 = ['AVE_BRANCH_LENGTH']
selected_fields_set2 = ['AVE_AST_DEPTH', 'NUM_BRANCHES']

# Create subplots for each selected field set and save each plot separately
for i, fields in enumerate([selected_fields_set1, selected_fields_set2]):
    fig, axes = plt.subplots(nrows=2, figsize=(11, 11))

    for j, field in enumerate(fields):
        axes[j].scatter(df[field],df['time'], label=field, color='black', alpha=0.7)
        axes[j].set_ylabel("Time (seconds)", **xyLabelFont)
        axes[j].grid(True, linestyle='--', alpha=0.7)
    if i == 0:
        axes[0].set_title("JSE Execution Time againts Average Branch Length", **titleFont)
        axes[0].set_xlabel("Average Branch Length", **xyLabelFont)
        # axes[1].set_title("JSE Execution Time againts Branching Factor", **titleFont)
        # axes[1].set_xlabel("Branching Factor", **xyLabelFont)
    else:
        axes[0].set_title("JSE Execution Time againts Average AST Depth", **titleFont)
        axes[0].set_xlabel("Average AST Depth", **xyLabelFont)
        axes[1].set_title("JSE Execution Time againts Total Number of Branches", **titleFont)
        axes[1].set_xlabel("Total Number of Branches", **xyLabelFont)

    # Adjust layout
    plt.tight_layout()
    plt.savefig(f"jseStats_subplot_{i+1}.png")
    plt.show()

field = "AVE_BRANCH_LENGTH"
fig, ax1 = plt.subplots(figsize=(8, 5))
ax1.scatter(df[field], df['time'], label=field, color='black', alpha=0.7)
ax1.set_xlabel('Average Branch Length', labelpad=10, **xyLabelFont)
ax1.set_ylabel('Time (seconds)', labelpad=10, **xyLabelFont)
ax2 = ax1.twinx()
sns.histplot(df[field], bins=30, kde=True, color='blue', ax=ax2, discrete=True)
ax2.set_ylabel('Frequency', labelpad=10, **xyLabelFont)
plt.title('JSE Execution Time and Frequency against Average Branch Length', **titleFont)
plt.legend()
plt.show()


field = "AVE_AST_DEPTH"
fig, ax1 = plt.subplots(figsize=(8, 5))
ax1.scatter(df[field], df['time'], label=field, c=df["AVE_CONDITIONALS_PER_BRANCH"], cmap='viridis', alpha=0.7, vmin=0.4)
ax1.set_xlabel('Average AST Depth', labelpad=10, **xyLabelFont)
ax1.set_ylabel('Time (seconds)', labelpad=10, **xyLabelFont)
plt.suptitle('JSE Execution Time against Average AST Depth', **titleFont)
plt.title('Dark colours = lower number of execution branches, light colours = higher number of execution branches')
plt.show()

field = "NUM_BRANCHES"
fig, ax1 = plt.subplots(figsize=(8, 5))
ax1.scatter(df[field], df['time'], label=field, c=df["AVE_AST_DEPTH"], cmap='viridis', vmin=0.42)
ax1.set_xlabel('Total Number of Branches', labelpad=10, **xyLabelFont)
ax1.set_ylabel('Time (seconds)', labelpad=10, **xyLabelFont)
plt.suptitle('JSE Execution Time against Total Number of Branches', **titleFont)
plt.title('Dark colours = low average AST depth, light colours = high average AST depth')
plt.show()


# # Plot each field individually
# for field in stats[0]:
#     if field != 'id' and field != 'MAX_BRANCH_LENGTH':
#         # Create a new plot for each field
#         plt.figure(figsize=(8, 5))

#         # Plot the field
#         values = [entry[field] for entry in stats if entry['id'] in ids]
#         plt.scatter(times, values)
#         plt.xlabel('Time /sec')
#         plt.ylabel(field)
#         plt.title(f'Scatter Plot: Time vs {field}')

#         # Show the plot
#         plt.show()


for field in ['AVE_BRANCH_LENGTH', 'AVE_CONDITIONALS_PER_BRANCH', 'AVE_AST_DEPTH', 'NUM_BRANCHES']:
    coverages = []
    field_values = []

    for i in range(len(jazzer_cov[2])):
        # Find the corresponding index in stats
        stat = stats[i]

        stat_value = stat[field] if field == 'AVE_AST_DEPTH' else stat[field]
        num_branches = stat["NUM_BRANCHES"]
        coverage = 0 if num_branches == 0 else jazzer_cov[2][i] / (num_branches)
        coverages.append(coverage)
        field_values.append(stat_value)

    # Plot coverage against field values in stats
    plt.scatter(field_values, coverages, color='black', marker='o', alpha=0.7)
    plt.xlabel(field, fontsize=12)
    plt.ylabel('Coverage', fontsize=12)
    plt.title(f'Coverage vs {field}', fontsize=14)
    plt.show()


box1 = []
box2 = []
box2Stats = []
box3 = []
box3Stats = []
box4 = []
box4Stats = []
for i in range(len(jse_results)):
    result = jse_results[i]
    stat = next((stat for stat in stats if stat["id"] == result["id"]), None)
    box1.append(stat["NUM_BRANCHES"] / result["time"])
    # print(stat["NUM_BRANCHES"])
    # print(result["time"])

    box2.append(jazzer_cov[0][i] / 0.1)
    box2Stats.append(jazzer_cov[0][i] / stat["NUM_BRANCHES"])
    box3.append(jazzer_cov[1][i] / 0.5)
    box3Stats.append(jazzer_cov[1][i] / stat["NUM_BRANCHES"])
    box4.append(jazzer_cov[2][i] / 1)
    box4Stats.append(jazzer_cov[2][i] / stat["NUM_BRANCHES"])
    print(jazzer_cov[2][i])
    print(jazzer_cov[1][i])
    print(jazzer_cov[0][i])

plt.boxplot([box1, box2, box3, box4], labels=['JSE\n100% coverage', 'Jazzer.js 0.1 sec\n{}% coverage'.format(int(sum(box2Stats)/len(box2Stats)*100)), 'Jazzer.js 0.5 sec\n{}% coverage'.format(int(sum(box3Stats)/len(box3Stats)*100)), 'Jazzer.js 1 sec\n{}% coverage'.format(int(sum(box4Stats)/len(box4Stats)*100))])
# Add labels and title
plt.ylabel('Number of branches reached (seconds)', **xyLabelFont)
plt.title('Performance Comparison between JSE and Jazzer.js', **titleFont)
plt.show()

print(box2Stats)
plt.boxplot([[1], box2Stats, box3Stats, box4Stats], labels=["JSE\n100% coverage", "Jazzer.js 0.1s\naverage = {}%".format(int(sum(box2Stats)/len(box2Stats)*100)), "Jazzer.js 0.5s\naverage = {}%".format(int(sum(box3Stats)/len(box3Stats)*100)), "Jazzer.js 1s\naverage = {}%".format(int(sum(box4Stats)/len(box4Stats)*100))])
plt.ylabel('Coverage', **xyLabelFont)
plt.title('Program Coverage Comparison between JSE and Jazzer.js', **titleFont)
plt.show()
