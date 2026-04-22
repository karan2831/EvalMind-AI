
import os

def check_link_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".tsx"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "<Link" in content and "import Link" not in content:
                        print(f"MISSING IMPORT IN: {path}")

check_link_imports("c:/Users/bodhg/Desktop/Evalmind_ai/app")
