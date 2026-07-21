import os
import sys
import site

# Prevent global user site-packages from polluting sys.path
site.ENABLE_USER_SITE = False
user_site = getattr(site, 'USER_SITE', None)
sys.path = [
    p for p in sys.path
    if (not user_site or not p.startswith(user_site))
    and 'appdata\\roaming\\python' not in p.lower()
]

import time
import urllib.request
from typing import Callable

def print_progress(filename: str) -> Callable[[int, int, int], None]:
    """Returns a reporthook function to display download progress."""
    last_reported_percent = -1

    def reporthook(block_num: int, block_size: int, total_size: int):
        nonlocal last_reported_percent
        if total_size <= 0:
            return
        
        downloaded = block_num * block_size
        percent = min(100, int(downloaded * 100 / total_size))
        
        # Only print if percentage changed to avoid flooding stdout
        if percent != last_reported_percent:
            last_reported_percent = percent
            # Print inline progress bar
            bar_length = 20
            filled_length = int(bar_length * percent // 100)
            bar = '#' * filled_length + '-' * (bar_length - filled_length)
            
            # Format sizes to MB
            downloaded_mb = downloaded / (1024 * 1024)
            total_mb = total_size / (1024 * 1024)
            
            sys.stdout.write(f"\r[*] {filename}: |{bar}| {percent}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)")
            sys.stdout.flush()
            if percent >= 100:
                sys.stdout.write("\n")
                sys.stdout.flush()

    return reporthook

def download_file(url: str, dest_path: str, filename: str, max_retries: int = 3):
    """Downloads a file from a URL to a local destination path with progress report.
    Retries up to max_retries times on failure with a 2-second delay between attempts.
    """
    if os.path.exists(dest_path):
        # Check size to ensure it wasn't a failed 0-byte download
        if os.path.getsize(dest_path) > 0:
            print(f"[+] File already exists and is valid: {filename}")
            return
        else:
            print(f"[*] Removing empty file: {filename}")
            os.remove(dest_path)

    print(f"[*] Downloading {filename} from {url}...")
    for attempt in range(1, max_retries + 1):
        try:
            # Some CDNs block default python user-agent, let's supply a standard user agent
            opener = urllib.request.build_opener()
            opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')]
            urllib.request.install_opener(opener)
            
            urllib.request.urlretrieve(url, dest_path, reporthook=print_progress(filename))
            print(f"[+] Download complete: {filename}")
            return  # Success — exit the retry loop
        except Exception as e:
            print(f"[-] Attempt {attempt}/{max_retries} failed for {filename}: {e}")
            if os.path.exists(dest_path):
                os.remove(dest_path)  # Remove any incomplete partial file
            if attempt < max_retries:
                print(f"[*] Retrying in 2 seconds...")
                time.sleep(2)
            else:
                print(f"[-] All {max_retries} attempts failed. Cannot download {filename}.")
                sys.exit(1)

def download_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "Models")
    embedding_dir = os.path.join(models_dir, "embedding")

    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(embedding_dir, exist_ok=True)

    print("=== Nahanjoo App Model Downloader ===")
    print("[*] Base Source Mirror: hf-mirror.com")
    
    # 1. Download Qwen 2.5 3B Instruct GGUF Model
    llm_url = "https://hf-mirror.com/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf"
    llm_dest = os.path.join(models_dir, "Qwen2.5-3B-Instruct-Q4_K_M.gguf")
    download_file(llm_url, llm_dest, "Qwen2.5-3B-Instruct-Q4_K_M.gguf")

    # 2. Download Embedding Model Files (sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
    embedding_files = [
        "config.json",
        "config_sentence_transformers.json",
        "modules.json",
        "pytorch_model.bin",
        "sentence_bert_config.json",
        "sentencepiece.bpe.model",
        "special_tokens_map.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "1_Pooling/config.json"
    ]
    
    print("\n[*] Downloading Embedding model files...")
    for filename in embedding_files:
        file_url = f"https://hf-mirror.com/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/{filename}"
        file_dest = os.path.join(embedding_dir, filename)
        # Ensure parent subdirectory (like 1_Pooling) is created
        os.makedirs(os.path.dirname(file_dest), exist_ok=True)
        download_file(file_url, file_dest, f"embedding/{filename}")

    # 3. Download Vazirmatn Font
    fonts_dir = os.path.join(models_dir, "fonts")
    os.makedirs(fonts_dir, exist_ok=True)
    font_url = "https://github.com/rastikerdar/vazirmatn/raw/master/fonts/ttf/Vazirmatn-Regular.ttf"
    font_dest = os.path.join(fonts_dir, "Vazirmatn-Regular.ttf")
    
    print("\n[*] Downloading Persian font...")
    download_file(font_url, font_dest, "Vazirmatn-Regular.ttf")

    print("\n=== All models and assets downloaded successfully! ===")

if __name__ == "__main__":
    download_models()
