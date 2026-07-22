<div dir="rtl" align="center">

# نهانجو (Nahanjoo) — دستیار هوشمند اسناد محلی

</div>

<div align="center">

**A Fully Offline, Local RAG Desktop Assistant for Persian PDF Documents**

[![License: MIT](https://img.shields.io/badge/License-MIT-a78bfa.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-6366f1.svg)](https://www.python.org/)
[![PySide6](https://img.shields.io/badge/UI-PySide6%20(Qt6)-4f46e5.svg)](https://doc.qt.io/qtforpython/)
[![LLM](https://img.shields.io/badge/LLM-Qwen%202.5%203B%20Instruct-059669.svg)](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct)
[![Vector Store](https://img.shields.io/badge/Vector%20Store-FAISS-0284c7.svg)](https://github.com/facebookresearch/faiss)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0ea5e9.svg)](https://www.microsoft.com/windows)

> **دست‌یابی به پاسخ‌های دقیق و هوشمند از میان اسناد متنی فارسی — ۱۰۰٪ آفلاین، بدون نیاز به اینترنت و بدون ارسال داده‌ها به ابر**

*Bachelor of Computer Engineering Capstone Project — Computer Engineering / Information Technology*  
*Azad University of Sanandaj*

---

</div>

## 📋 Project Overview

**Nahanjoo (نهانجو)** — meaning *"Hidden Seeker"* in Kurdish — is a privacy-first, fully local **Retrieval-Augmented Generation (RAG)** desktop application engineered specifically for Persian-language document analysis. Built to address the security, privacy, and linguistic challenges of processing sensitive Persian documents, Nahanjoo enables users to index their personal PDF libraries and perform natural-language query answering with source-cited accuracy — entirely on their local hardware without any external API calls or cloud dependencies.

Traditional online LLM solutions pose severe data privacy risks when handling confidential institutional, legal, or personal documents. Furthermore, standard PDF extraction engines frequently fail on Persian text due to right-to-left (RTL) rendering quirks, broken ligatures (such as `ال` vs `لا`), character encoding inconsistencies, and mixed English/Persian numerals. 

Nahanjoo solves these challenges by integrating a specialized **Persian Text Normalizer**, local vector similarity search via **FAISS**, multilingual embeddings (`paraphrase-multilingual-MiniLM-L12-v2`), and quantized local LLM inference via **Qwen 2.5 3B Instruct** running on `llama-cpp-python`.

---

## ✨ Key Features

| Feature | Technical Implementation & Description |
|---|---|
| 🔒 **100% Offline & Privacy-Preserving** | All text extraction, embedding generation, vector search, and LLM inference occur locally on CPU/RAM. Zero network telemetry or cloud API calls. |
| 🌐 **Bilingual Interface & Query Matching** | One-click language toggle button (`🌐 English` / `🌐 فارسی`) switching between Persian (**RTL**) and English (**LTR**) layouts. Questions asked in English automatically receive English responses (`Analysis: ... Final Answer: ...`), and questions in Persian receive Persian responses (`تحلیل: ... پاسخ نهایی: ...`). |
| 🇮🇷 **Persian Ligature & Unicode Normalizer** | Custom regex and dictionary-based pipeline (`PersianNormalizer`) correcting PyMuPDF extraction bugs, NFKC normalization, Arabic-to-Persian character standardization, ZWNJ space handling, and numeral unification. |
| 🔍 **High-Precision Vector Retrieval** | FAISS vector store powered by HuggingFace multilingual MiniLM embeddings. Implements chunk deduplication to prevent redundant contexts from polluting the prompt window. |
| 🤖 **Quantized Local LLM Inference** | High-speed CPU inference with **Qwen 2.5 3B Instruct** (Q4_K_M GGUF) via `llama-cpp-python`. Real-time token streaming with zero latency lag. |
| 💡 **Chain-of-Thought (CoT) Grounded Prompts** | Deterministic generation (T=0.0) enforcing strict 2-stage answers (`Analysis/Final Answer` in EN or `تحلیل/پاسخ نهایی` in FA) and strict zero-hallucination rules. |
| 🖥️ **Native Dual-Language PySide6 Interface** | Sleek, dark-themed Qt6 graphical user interface with full right-to-left (RTL) and left-to-right (LTR) layout support and high-legibility Vazirmatn Persian typography. |
| 🔄 **Non-Blocking Multi-Threaded Execution** | Background Qt worker threads (`QThread`) handle FAISS index building and LLM streaming to maintain complete UI responsiveness. |
| 📚 **Multi-Document Auto-Synchronization** | Automatic document tracking via SHA/metadata hashing (`source_metadata.json`). Rebuilds vector indices only when PDF files are added, modified, or deleted. |
| 💬 **Persistent Local Chat Sessions** | Saves conversation histories locally as structured JSON files in `/Chats`. Re-load past sessions, switch chats, or delete conversations on demand. |
| 🚀 **Portable USB Runtime Builder** | Includes `build_usb_portable.py` to bundle an isolated Python 3.12 runtime and pre-cached models into a self-contained portable USB folder. |

---

## 🏗️ System Architecture & Workflow

Nahanjoo operates through two primary execution pipelines: **Document Ingestion & Indexing** and **Query Retrieval & Response Generation**.

```
==================================================================================================
1. DOCUMENT INGESTION & INDEXING PIPELINE
==================================================================================================

  [ Persian PDF Files ] ──► PyMuPDF (fitz) ──► [ PersianNormalizer ] ──► [ Recursive Text Splitter ]
   (in ./Documents)          Text Extraction     - NFKC Normalization     - Chunk Size: 800 chars
                                                 - Ligature Correction    - Chunk Overlap: 200 chars
                                                 - Numeral Conversion
                                                                                    │
                                                                                    ▼
  [ FAISS Vector Index ] ◄── FAISS.from_texts() ◄── HuggingFace Embeddings ◄── [ Normalized Chunks ]
   (saved to ./VectorStore)                           (MiniLM-L12-v2 CPU)

==================================================================================================
2. RAG QUERY RETRIEVAL & RESPONSE PIPELINE
==================================================================================================

  User Query (Persian or English)
         │
         ▼
  [ Automatic Language Detector ] ──► Detects question language (English vs Persian)
         │
         ▼
  [ FAISS Retriever ] ──────────► Top-K Vector Similarity Search (k=5)
         │                         Sub-string Chunk Deduplication & Metadata Assembly
         ▼
  [ Context Builder ] ──────────► Formats Document Passages + Source Page Metadata
         │
         ▼
  [ CoT Prompt Engine ] ────────► System Instructions:
         │                         - Language-Matched Output (English/Persian CoT)
         │                         - Enforce zero hallucination ("No information found" / "اطلاعاتی یافت نشد.")
         │                         - Format: Analysis / Final Answer (EN) or تحلیل / پاسخ نهایی (FA)
         ▼
  [ Qwen 2.5 3B LLM ] ─────────► llama-cpp-python (Streaming, Temp=0.0, max_tokens=1024)
         │
         ▼
  Streamed UI Display + Source Citations (Document Name & Page Numbers)
```

---

## 🛠️ Technology Stack

| Layer | Technology / Library | Purpose |
|---|---|---|
| **User Interface** | [PySide6 (Qt 6)](https://doc.qt.io/qtforpython/) | Cross-platform RTL desktop UI, custom QThread asynchronous event handling |
| **Local LLM Engine** | [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) | C++ quantized GGUF model runner optimized for CPU execution |
| **Base Language Model** | [Qwen 2.5 3B Instruct (Q4_K_M GGUF)](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct) | State-of-the-art multilingual 3B parameter model by Alibaba Cloud |
| **Embedding Model** | [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | 384-dimensional dense vector embeddings for 50+ languages |
| **Vector Indexing** | [FAISS (Facebook AI Similarity Search)](https://github.com/facebookresearch/faiss) | Ultra-fast in-memory dense vector similarity search |
| **RAG Orchestration** | [LangChain](https://github.com/langchain-ai/langchain) & [LangChain-Community](https://pypi.org/project/langchain-community/) | Document chunking, vector store abstraction, and prompt management |
| **PDF Parser** | [PyMuPDF (fitz)](https://github.com/pymupdf/PyMuPDF) | High-speed C-backed PDF text and page metadata extraction |
| **Typography & Font** | [Vazirmatn Font](https://github.com/rastikerdar/vazirmatn) | SIL Open Font licensed Persian typeface by Saber Rastikerdar |
| **Language & Runtime** | Python 3.10+ (Win32 AMD64) | Core application execution environment |

---

## 📁 Repository Directory Structure

```
Nahanjoo App/
 ├── main.py                 # Application launcher & Qt environment setup
 ├── gui.py                  # PySide6 RTL interface, themes, & QThread background workers
 ├── rag_engine.py           # RAG processing core: Persian normalizer, FAISS, & LLM inference
 ├── download_models.py      # Automated model & asset downloader script (with retry & mirror support)
 ├── build_usb_portable.py   # Windows portable Python 3.12 embedded runtime builder
 ├── Run_Nahanjoo.bat        # One-click Windows executable batch launcher
 ├── requirements.txt        # Python dependency manifest
 ├── logo.jpg                # Application icon branding asset
 ├── LICENSE                 # MIT License & Third-Party legal disclosures
 ├── README.md               # Repository documentation
 │
 ├── Documents/              # [User Directory] Place source Persian PDF documents here
 ├── Models/                 # [Generated] Local model weights & fonts directory
 │   ├── Qwen2.5-3B-Instruct-Q4_K_M.gguf      # ~2.0 GB Local LLM weights
 │   ├── embedding/                          # Sentence-Transformers embedding model files
 │   └── fonts/                              # Vazirmatn-Regular.ttf Persian font
 ├── VectorStore/            # [Generated] Persisted FAISS vector index & source metadata
 │   ├── index.faiss                         # FAISS dense index binary
 │   ├── index.pkl                           # Document metadata pickle mapping
 │   └── source_metadata.json                # Document file hashes & modification timestamps
 └── Chats/                  # [Generated] Local chat session JSON files
```

---

## ⚙️ Installation & Setup

### Prerequisites & Hardware Requirements

- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Python Version:** Python 3.10 or higher ([python.org](https://www.python.org/downloads/))
- **System RAM:** 
  - *Minimum:* 8 GB RAM
  - *Recommended:* 16 GB RAM (for seamless background indexing and instant response)
- **Disk Storage:** Minimum 5 GB free disk space (for storing LLM and embedding model weights)
- **C++ Compiler (Optional for source compilation):** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with Desktop development with C++ workload (only required if compiling `llama-cpp-python` from source).

---

### Installation Steps

#### Step 1: Clone the Repository

```bash
git clone https://github.com/ZhiwarSajadi/nahanjoo.git
cd nahanjoo
```

#### Step 2: Create & Activate a Virtual Environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### Step 3: Install Required Dependencies

```bash
pip install -r requirements.txt
```

> 💡 **Note for Windows Users:** If compiling `llama-cpp-python` fails due to missing C++ compilers, install the official prebuilt CPU wheel directly:
> ```bash
> pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
> ```

#### Step 4: Download Models & Assets (One-Time Setup)

Run the automated model downloader while connected to the internet. This script fetches the LLM, embedding weights, and UI fonts into the `./Models` directory:

```bash
python download_models.py
```

*Downloaded Assets:*
1. **Qwen2.5-3B-Instruct-Q4_K_M.gguf** (~2.0 GB) — Quantized local LLM
2. **paraphrase-multilingual-MiniLM-L12-v2** — Multilingual text embedding model
3. **Vazirmatn-Regular.ttf** — Persian font typeface

#### Step 5: Launch the Application

```bash
python main.py
```

Alternatively, double-click **`Run_Nahanjoo.bat`** in the project root directory.

---

## 🚀 Usage Guide

### 1. Document Ingestion & Management
- Click **"افزودن سند"** (Add Document) in the sidebar or copy text-based PDF files directly into the `./Documents/` folder.
- Click **"همگام‌سازی اسناد"** (Sync Documents) to trigger automatic vector indexing. Nahanjoo parses, normalizes, chunks, and indexes your PDFs in a background thread.

### 2. Asking Questions & Viewing Citations
- Type your question in Persian in the prompt box at the bottom of the interface and press **Enter** or click **"ارسال سوال"** (Send Question).
- The application retrieves the most relevant passage chunks from your documents and streams the AI response token by token.
- Expand the **"منابع استفاده شده"** (Used Sources) container above the answer to inspect exact document filenames and page numbers referenced by the system.

### 3. Session & Chat History Management
- Previous chat sessions are automatically serialized and listed in the **"گفتگوها"** (Chats) sidebar panel.
- Click any past session to inspect or resume the conversation.
- Use the **"حذف گفتگو"** button to remove unwanted sessions.

### 4. System Maintenance & Reset
- **Factory Reset:** Click **"تنظیمات کارخانه"** to wipe all cached FAISS indices, chat history JSON files, and indexed document references.

---

## 💾 Portable USB Distribution Guide

Nahanjoo includes a built-in builder script (`build_usb_portable.py`) that packages an isolated, self-contained Windows Python runtime. This allows you to distribute the complete application on a USB flash drive or offline machine without requiring Python or administrative installation permissions on the target computer.

To build a portable distribution:

```bash
python build_usb_portable.py
```

### What this command does:
1. Downloads the official Windows Python 3.12 embeddable zip package.
2. Extracts it to `./python_embed/` and configures `python312._pth` to enable site packages.
3. Installs `pip` and all dependencies specified in `requirements.txt` directly into `./python_embed/`.
4. Configures `Run_Nahanjoo.bat` to launch `main.py` using `./python_embed/pythonw.exe` with user site isolation (`PYTHONNOUSERSITE=1`).

To transfer to another Windows computer, copy the entire project folder to a USB drive and double-click `Run_Nahanjoo.bat`.

---

## 🔧 Troubleshooting & Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Error building llama-cpp-python on Windows</b></summary>

**Cause:** Missing Microsoft Visual C++ Build Tools.  
**Solution:** Run the following command to install pre-compiled CPU binaries without compiling:
```bash
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
```
</details>

<details>
<summary><b>2. "اطلاعاتی در اسناد یافت نشد" (No information found in documents) response</b></summary>

**Causes:**
- The PDF document is a scanned image (OCR is not supported; PDFs must contain selectable text).
- The question topic is not mentioned in any indexed PDF files.
- The document index has not been synchronized after adding new PDFs. Click **"همگام‌سازی اسناد"** to rebuild the index.
</details>

<details>
<summary><b>3. Model download speeds are slow or timing out</b></summary>

**Solution:** The downloader script uses `hf-mirror.com` by default. If your connection drops, re-run `python download_models.py`. The script automatically checks existing file sizes and resumes missing chunks without re-downloading completed files.
</details>

<details>
<summary><b>4. High CPU or RAM usage during search</b></summary>

**Explanation:** During vector retrieval and LLM prompt processing, CPU utilization will spike as all cores evaluate model matrix multiplications. RAM usage typically stabilizes around ~3.5 GB to ~4.5 GB total for the entire application stack.
</details>

---

## ⚖️ Security, Privacy & Legal Disclaimer

> [!WARNING]
> **AI Hallucination Notice:** Nahanjoo relies on a local 3-billion-parameter language model (Qwen 2.5 3B). While Chain-of-Thought prompts and vector context strictly constrain the model, small language models can occasionally misinterpret complex phrasing or output incorrect details. **Do not use this software as the sole authority for critical legal, financial, or medical decisions.** Always verify the generated answer against the source PDF pages cited in the response.
>
> **Privacy Guarantee:** Nahanjoo does not track, collect, or transmit any user data, uploaded documents, or chat transcripts. All data resides exclusively on your local hard drive.

---

## 📄 License & Legal Attribution

This project is open-source and released under the **[MIT License](LICENSE)**.

### Third-Party Software Component Disclosures:
- **PySide6 (Qt6):** Licensed under [LGPL v3](https://www.qt.io/licensing/).
- **llama-cpp-python:** Licensed under the [MIT License](https://github.com/abetlen/llama-cpp-python).
- **Qwen 2.5 3B Instruct Model:** Base model by Alibaba Cloud released under the [Qwen License Agreement](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct).
- **sentence-transformers / MiniLM:** Licensed under [Apache License 2.0](https://github.com/UKPLab/sentence-transformers).
- **FAISS:** Copyright Meta Platforms, Inc., licensed under the [MIT License](https://github.com/facebookresearch/faiss).
- **LangChain:** Licensed under the [MIT License](https://github.com/langchain-ai/langchain).
- **PyMuPDF:** Licensed under [GNU AGPL v3 / Commercial License](https://github.com/pymupdf/PyMuPDF).
- **Vazirmatn Font:** Copyright Saber Rastikerdar, licensed under the [SIL Open Font License 1.1](https://github.com/rastikerdar/vazirmatn).

---

## 🎓 Academic Metadata & Author Information

**Project Title:** Nahanjoo App — Fully Offline Persian Local RAG Assistant  
**Degree Program:** Bachelor of Computer Engineering / Information Technology  
**Institution:** Azad University of Sanandaj (دانشگاه آزاد اسلامی واحد سنندج)

- **Author / Lead Developer:** **Zhiwar Sajadi (ژیوار سجادی)**  
  - GitHub: [@ZhiwarSajadi](https://github.com/ZhiwarSajadi)
- **Academic Supervisor:** **Dr. Keyhan Khamforoosh (دکتر کیهان خامفروش)**  
  - Profile: [Google Scholar](https://scholar.google.com/citations?user=BgY3ap0AAAAJ&hl=en)

---

<div align="center">

Made with ❤️ for the Persian-speaking community & open-source software ecosystem  
ساخته شده با ❤️ برای جامعه علمی و فارسی‌زبان

</div>
