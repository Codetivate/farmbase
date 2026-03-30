import os

filename = r"c:\Users\nesnk\Desktop\Farmbase\farmbase\ai_engine\isaac_bridge\build_farm.py"
with open(filename, "r", encoding="utf-8") as f:
    code = f.read()

bad_import = '    import csv, os'
good_import = '    import csv'

if bad_import in code:
    code = code.replace(bad_import, good_import)
    
    # ensure global os is imported
    if "import os\n" not in code and "import os\r" not in code:
        code = "import os\n" + code

    with open(filename, "w", encoding="utf-8") as f:
        f.write(code)
    print("Fixed UnboundLocalError by removing local `import os`.")
else:
    print("Could not find the bad import.")
