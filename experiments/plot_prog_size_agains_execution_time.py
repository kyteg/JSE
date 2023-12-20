import json
import matplotlib.pyplot as plt
import seaborn as sns  # Seaborn for enhanced visualization
import pandas as pd
import os

xyLabelFont = {'size': 14}
titleFont = {'size': 16, 'weight': 'bold'}

jse_results = []
with open("experiments/jse_diff_analysis", "r") as f:
    line = f.readline()
    while line: 
        jse_results.append(json.loads(line[0:-1]))
        line = f.readline()

stats = []
for result in jse_results:
    id = result["id"]
    with open("randjs/{}.stats.json".format(id), "r") as f:
        stat = json.loads(f.readline())
        stat["id"] = id
        stats.append(stat)

jse_results = [entry for entry in jse_results if entry['return_code'] == 0]
stats = [entry for entry in stats if entry['id'] in [item['id'] for item in jse_results]]


directory = "randjs"

# Initialize an empty list to store the number of lines for each file
lines_count_list = []

# Iterate over each dictionary in the stat list
for entry in stats:
    # Extract the id from the current dictionary
    current_id = int(entry["id"])

    # Construct the file path using the id
    file_path = os.path.join(directory, f"{current_id}.jse.js")

    # Check if the file exists
    if os.path.exists(file_path):
        # Open the file and count the number of lines
        with open(file_path, "r") as file:
            lines_count = sum(1 for line in file)

        # Append the number of lines to the list
        lines_count_list.append(lines_count)
    else:
        # If the file doesn't exist, append a placeholder value (e.g., -1)
        lines_count_list.append(-1)

# Print or use lines_count_list as needed
print(lines_count_list)
print(jse_results)

plt.scatter(lines_count_list, [i["time"] for i in jse_results], color='black', marker='o', alpha=0.7)
plt.xlabel("Program Size (lines of code)", fontsize=16)
plt.ylabel('Total Execution Time (sec)', fontsize=16)
plt.title(f'Total Execution Time vs Program Size', fontsize=20)
plt.show()





directory = "results"

# Initialize an empty list to store the file sizes
file_size_list = []

# Iterate over each dictionary in the stat list
for entry in stats:
    # Extract the id from the current dictionary
    current_id = int(entry["id"])

    # Construct the file path using the id
    file_path = os.path.join(directory, f"JSE{current_id}", "cache")

    # Check if the file exists
    if os.path.exists(file_path):
        # Get the size of the file
        file_size = os.path.getsize(file_path)

        # Append the file size to the list
        file_size_list.append(file_size/1000000)
    else:
        # If the file doesn't exist, append a placeholder value (e.g., -1)
        file_size_list.append(-1)

plt.scatter(lines_count_list,file_size_list, color='black', marker='o', alpha=0.7)
plt.ylabel("Cache Size (MB)", **xyLabelFont)
plt.xlabel('Program Size (lines of code)', **xyLabelFont)
plt.title(f'Program Size agains Cache Size in JSE Targeted Analysis', **titleFont)
plt.show()
