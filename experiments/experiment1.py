####################################################################################
### Experiment 1 - JSE Performance Comparison with Dynamic Fuzz Testing - Jazzer ###
####################################################################################

import os
import time
import json

NUM_FILES = 1000
JAZZER_TIMES = [0.1, 0.5, 1]

# Create JS files with RandJS, noting down the parameters used.
# ranjsOutDir = "randJSOut"
# if not os.path.exists("../"+ranjsOutDir): 
#     os.makedirs("../"+ranjsOutDir)
# for i in range(NUM_FILES):
#     os.system('npm run randJS -- --writeToFile="{}"'.format(i+1))

# Run JSE on the JS files, timing the executution. (coverage will always be 100% at the moment)
jse_results = []
for i in range(NUM_FILES):
    start = time.time()
    code = os.system('gtimeout 5s node --max-old-space-size=34359 build/driver.js --file="randjs/{}.jse.js"'.format(i+1))
    end = time.time()
    print("elapsed time: {}".format(end-start))
    jse_results.append(json.dumps({"id": i+1, "time": end-start, "return_code": code}))

# output results to a file
with open("experiments/jse_results", "w") as f:
    for line in jse_results:
        f.write(line + "\n")

# Run Jazzer on the JS files, varying the execution time and measuring coverage.
os.system("rm experiments/jazzer_cov")
for i in range(NUM_FILES):
    for t in JAZZER_TIMES:
        os.system('npx jazzer randjs/{}.jazzer.js -- -max_total_time=1 -print_final_stats=1 | grep "branch: "| awk -F ": " \'{{print $2}}\' | sort -n | tail -n 1 >> experiments/jazzer_cov_{}'.format(i+1, t))
