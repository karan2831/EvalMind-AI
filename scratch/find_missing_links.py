
import os
import re

def check_link_imports(directory):
    missing_files = []
    for root, dirs, files in os.walk(directory):
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
            
        for file in files:
            if file.endswith(".tsx"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        # Look for <Link tag but no Link import from next/link
                        if "<Link" in content and not re.search(r'import\s+Link\s+from\s+["\']next/link["\']', content):
                            missing_files.append(path)
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    return missing_files

if __name__ == "__main__":
    results = check_link_imports("c:/Users/bodhg/Desktop/Evalmind_ai")
    if results:
        print("FILES MISSING LINK IMPORT:")
        for r in results:
            print(r)
    else:
        print("NO FILES MISSING LINK IMPORT FOUND.")
