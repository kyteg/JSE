##############################################################################
### Experiment 2 - Performance Enhancement via Targeted Symbolic Execution ###
##############################################################################

import os
import time
import json

NUM_FILES = 500

# Create JS files with RandJS, noting down the parameters used.
for i in range(NUM_FILES):
    os.system('npm run randJS -- --writeToFile="{}"'.format(i+1))

#########################################################################
##### Run JSE on base files in preparation, to make the diff files. #####
#########################################################################
jse_results = []
for i in range(NUM_FILES):
    start = time.time()
    code = os.system('gtimeout 10s node --max-old-space-size=34359 build/driver.js --file="randjs/{}.jse.js" --writecache'.format(i+1))
    end = time.time()
    print("base: elapsed time: {}".format(end-start))
    jse_results.append(json.dumps({"id": i+1, "time": end-start, "return_code": code}))

# output results to a file
with open("experiments/jse_base", "w") as f:
    for line in jse_results:
        f.write(line + "\n")

###############################################
##### Run targeted analysis on the diffs. #####
###############################################
jse_results = []
for i in range(NUM_FILES):
    start = time.time()
    code = os.system('gtimeout 10s npm run diff -- --a="randjs/{}.jse.js" --b="randjs/{}.jse.diff.js" --resultFilePath="randjs/{}.diff" && npm run jse -- --diff --cache="results/JSE{}/cache" --diffFile="randjs/{}.diff"'.format(i+1, i+1, i+1, i+1, i+1))
    end = time.time()
    print("base: elapsed time: {}".format(end-start))
    jse_results.append(json.dumps({"id": i+1, "time": end-start, "return_code": code}))

# output results to a file
with open("experiments/jse_diff_analysis", "w") as f:
    for line in jse_results:
        f.write(line + "\n")
