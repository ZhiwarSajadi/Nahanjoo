# -*- coding: utf-8 -*-
"""
Nahanjoo App - USB Portable Environment Builder
Author: Zhiwar Sajadi
Description: Downloads an embedded Python runtime, bootstraps pip, and installs all
             dependencies into the python_embed/ directory for a fully portable,
             self-contained USB distribution of the Nahanjoo App.
Copyright (c) 2026 Zhiwar Sajadi. All rights reserved.
Licensed under the MIT License.
"""

import os
import sys
import zipfile
import urllib.request
import shutil
import subprocess

def download_file(url, dest_path):
    print(f"[*] Downloading {url}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
        print(f"[+] Downloaded successfully to {dest_path}")
    except Exception as e:
        print(f"[-] Error downloading {url}: {e}")
        sys.exit(1)

def setup_portable_python():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    embed_dir = os.path.join(base_dir, "python_embed")
    
    # 1. Clean existing python_embed if present
    if os.path.exists(embed_dir):
        print("[*] Cleaning existing python_embed folder...")
        shutil.rmtree(embed_dir)
    os.makedirs(embed_dir, exist_ok=True)

    # 2. Download Windows Python Embeddable zip
    python_zip_url = "https://www.python.org/ftp/python/3.12.3/python-3.12.3-embed-amd64.zip"
    zip_dest = os.path.join(base_dir, "python_embed.zip")
    download_file(python_zip_url, zip_dest)

    # 3. Extract Python Embeddable zip
    print(f"[*] Extracting Python Embeddable to {embed_dir}...")
    with zipfile.ZipFile(zip_dest, 'r') as zip_ref:
        zip_ref.extractall(embed_dir)
    os.remove(zip_dest)
    print("[+] Extracted Python Embeddable successfully.")

    # 4. Uncomment 'import site' in python*._pth
    print("[*] Configuring python*._pth to enable site packages...")
    pth_file = None
    for file in os.listdir(embed_dir):
        if file.startswith("python") and file.endswith("._pth"):
            pth_file = os.path.join(embed_dir, file)
            break
            
    if pth_file:
        with open(pth_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        new_lines = []
        for line in lines:
            if "import site" in line:
                # Uncomment the import site line
                new_lines.append("import site\n")
            else:
                new_lines.append(line)
                
        with open(pth_file, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print(f"[+] Configured {os.path.basename(pth_file)} successfully.")
    else:
        print("[-] Warning: python*._pth file not found!")

    # 5. Download get-pip.py
    pip_script_url = "https://bootstrap.pypa.io/get-pip.py"
    pip_script_dest = os.path.join(base_dir, "get-pip.py")
    download_file(pip_script_url, pip_script_dest)

    # 6. Install Pip
    print("[*] Installing pip inside the embedded environment...")
    python_exe = os.path.join(embed_dir, "python.exe")
    try:
        subprocess.run([python_exe, pip_script_dest], check=True)
        print("[+] Pip installed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"[-] Error installing pip: {e}")
        sys.exit(1)
    finally:
        if os.path.exists(pip_script_dest):
            os.remove(pip_script_dest)

    # 7. Install requirements
    requirements_file = os.path.join(base_dir, "requirements.txt")
    if os.path.exists(requirements_file):
        print("[*] Installing requirements from requirements.txt...")
        
        # Use a short root-level folder on the same drive (e.g. D:\t) to avoid Windows MAX_PATH (260 char limit)
        drive = os.path.splitdrive(base_dir)[0]
        short_temp_dir = os.path.join(drive + os.sep, "t")
        
        if os.path.exists(short_temp_dir):
            shutil.rmtree(short_temp_dir)
        os.makedirs(short_temp_dir, exist_ok=True)
        
        custom_env = os.environ.copy()
        custom_env["TEMP"] = short_temp_dir
        custom_env["TMP"] = short_temp_dir
        custom_env["PYTHONNOUSERSITE"] = "1"
        
        try:
            # We run python.exe -m pip install to ensure we install dependencies locally
            # We add --extra-index-url to fetch prebuilt CPU wheels for llama-cpp-python directly, avoiding compilation errors
            subprocess.run(
                [
                    python_exe, "-m", "pip", "install", 
                    "--extra-index-url", "https://abetlen.github.io/llama-cpp-python/whl/cpu",
                    "-r", requirements_file
                ], 
                check=True,
                env=custom_env
            )
            print("[+] All dependencies installed successfully in python_embed.")
        except subprocess.CalledProcessError as e:
            print(f"[-] Error installing requirements: {e}")
            sys.exit(1)
        finally:
            # Clean up the short temp folder
            if os.path.exists(short_temp_dir):
                try:
                    shutil.rmtree(short_temp_dir)
                except Exception:
                    pass
    else:
        print("[-] Warning: requirements.txt not found!")

    print("\n=======================================================")
    print("[+] Portable USB Python environment built successfully!")
    print("=======================================================")

if __name__ == "__main__":
    setup_portable_python()
