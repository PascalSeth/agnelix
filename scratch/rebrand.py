import os

replacements = [
    ("Galienix", "Galien"),
    ("Galienix", "galien"),
    ("GalienIX", "GALIEN")
]

target_dirs = [
    "app",
    "components",
    "lib",
    "public",
    "scripts",
    "docs"
]

target_files = [
    "package.json"
]

def process_file(filepath):
    # Skip binary or lock files
    if filepath.endswith(('.png', '.fbx', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.tsbuildinfo', '.lock')):
        return
    # Skip package-lock.json to avoid corrupting integrity hashes
    if "package-lock.json" in filepath:
        return
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        # Some files might be binary or have encoding issues, skip them
        return

    new_content = content
    replaced = False
    for old, new in replacements:
        if old in new_content:
            new_content = new_content.replace(old, new)
            replaced = True
            
    if replaced:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Rebranded: {filepath}")
        except Exception as e:
            print(f"Error writing to {filepath}: {e}")

# Process files in target directories
for target_dir in target_dirs:
    # Resolve relative paths relative to the workspace root (parent of scratch folder)
    workspace_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), target_dir)
    if not os.path.exists(workspace_dir):
        workspace_dir = target_dir # Fallback
        
    for root, dirs, files in os.walk(workspace_dir):
        if "node_modules" in root or ".next" in root or ".git" in root:
            continue
        for file in files:
            filepath = os.path.join(root, file)
            process_file(filepath)

# Process standalone target files
for file in target_files:
    workspace_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), file)
    if os.path.exists(workspace_file):
        process_file(workspace_file)
    elif os.path.exists(file):
        process_file(file)

print("Rebranding search and replace completed.")
