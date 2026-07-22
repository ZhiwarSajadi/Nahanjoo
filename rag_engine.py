# -*- coding: utf-8 -*-
"""
Nahanjoo App - RAG Processing Engine
Author: Zhiwar Sajadi
Description: Handles PyMuPDF Persian text extraction, FAISS vector indexing, and local Qwen LLM inference.
Copyright (c) 2026 Zhiwar Sajadi. All rights reserved.
Licensed under the MIT License.
"""

import os
import re
import json
import unicodedata
from typing import List, Dict, Any, Tuple


class PersianNormalizer:
    """Utility class to normalize Persian text and fix common PyMuPDF ligature extraction bugs."""
    
    LIGATURE_MAP = {
        "اسالم": "اسلام",
        "اسالمی": "اسلامی",
        "اطالعات": "اطلاعات",
        "اطالعاتی": "اطلاعاتی",
        "اعالم": "اعلام",
        "انقالب": "انقلاب",
        "انقالبی": "انقلابی",
        "ایالت": "ایالات",
        "باال": "بالا",
        "باالی": "بالای",
        "برنامهریزی": "برنامه ریزی",
        "تصصی": "تخصصی",
        "دانشگاههای": "دانشگاه های",
        "دانشجویان": "دانشجویان",
        "رشتههای": "رشته های",
        "ساله": "سالانه",
        "صالحیت": "صلاحیت",
        "صالحیتها": "صلاحیت ها",
        "سقفی": "سقف",
        "قوانین": "قوانین",
        "کالس": "کلاس",
        "کالسها": "کلاس ها",
        "مقررات": "مقررات",
        "مالقات": "ملاقات",
        "نامههای": "نامه های",
        "نیمسلا": "نیمسال",
        "نیمسالهای": "نیمسال های",
        "همکاران": "همکاران",
        "واحدها": "واحدها",
        "واحدهای": "واحدهای"
    }

    @classmethod
    def normalize(cls, text: str) -> str:
        if not text:
            return ""

        text = unicodedata.normalize('NFKC', text)

        # Clean line breaks
        text = text.replace('\r\n', '\n')
        text = text.replace('\n\n', '___PARAGRAPH___')
        text = text.replace('\n', ' ')
        text = text.replace('___PARAGRAPH___', '\n\n')

        # Standardize Arabic letters to Persian
        for ar_char, fa_char in [('ي', 'ی'), ('ك', 'ک')]:
            text = text.replace(ar_char, fa_char)

        # Replace Zero-Width Non-Joiner with a standard space
        text = text.replace('\u200c', ' ')

        # Translate digits to standard ASCII English digits
        fa_digits = "۰۱۲۳۴۵۶۷۸۹"
        ar_digits = "٠١٢٣٤٥٦٧٨٩"
        en_digits = "0123456789"
        for fa_d, en_d in zip(fa_digits, en_digits):
            text = text.replace(fa_d, en_d)
        for ar_d, en_d in zip(ar_digits, en_digits):
            text = text.replace(ar_d, en_d)

        # Swap 'ال' with 'لا' using dictionary
        for broken, corrected in cls.LIGATURE_MAP.items():
            text = text.replace(broken, corrected)

        # Regex swap 'ال' to 'لا'
        text = re.sub(r'([سطقکعخ])ال', r'\1لا', text)

        # Safe space normalization: collapse multiple spaces/tabs to a single space.
        # NOTE: We use [ \t]+ instead of \s+ so that paragraph line breaks (\n\n),
        # which were explicitly preserved earlier in this function, are not collapsed.
        text = re.sub(r'[ \t]+', ' ', text)

        return text.strip()


class RAGEngine:
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.base_dir = base_dir

        self.documents_dir = os.path.join(self.base_dir, "Documents")
        self.models_dir = os.path.join(self.base_dir, "Models")
        self.vector_store_dir = os.path.join(self.base_dir, "VectorStore")
        self.embedding_model_dir = os.path.join(self.models_dir, "embedding")
        self.llm_model_path = os.path.join(self.models_dir, "Qwen2.5-3B-Instruct-Q4_K_M.gguf")
        
        # Ensure directories exist
        os.makedirs(self.documents_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.vector_store_dir, exist_ok=True)

        self.embeddings = None
        self.vector_store = None
        self.llm = None

    def check_models_exist(self) -> Tuple[bool, str]:
        """Checks if the GGUF model and Embedding model exist in the Models folder."""
        if not os.path.exists(self.llm_model_path):
            return False, f"LLM model not found at: {self.llm_model_path}. Please run download_models.py first."
        if not os.path.exists(os.path.join(self.embedding_model_dir, "config.json")):
            return False, f"Embedding model not found in: {self.embedding_model_dir}. Please run download_models.py first."
        return True, "All models present."

    def get_documents_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Scans the Documents/ folder and returns filenames with their sizes and modified times."""
        metadata = {}
        if not os.path.exists(self.documents_dir):
            return metadata

        for filename in os.listdir(self.documents_dir):
            if filename.lower().endswith(".pdf"):
                file_path = os.path.join(self.documents_dir, filename)
                stat = os.stat(file_path)
                metadata[filename] = {
                    "size": stat.st_size,
                    "mtime": stat.st_mtime
                }
        return metadata

    def should_rebuild_index(self) -> bool:
        """Determines if the FAISS index needs to be rebuilt based on document metadata changes."""
        metadata_file = os.path.join(self.vector_store_dir, "source_metadata.json")
        faiss_index_file = os.path.join(self.vector_store_dir, "index.faiss")
        
        if not os.path.exists(faiss_index_file) or not os.path.exists(metadata_file):
            return True

        current_metadata = self.get_documents_metadata()
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                saved_metadata = json.load(f)
        except Exception:
            return True

        return current_metadata != saved_metadata

    def extract_text_from_pdfs(self) -> List[Dict[str, Any]]:
        """Extracts and normalizes text from PDFs in Documents/."""
        import fitz  # Deferred import for faster app startup
        
        documents = []
        if not os.path.exists(self.documents_dir):
            return documents

        for filename in os.listdir(self.documents_dir):
            if filename.lower().endswith(".pdf"):
                file_path = os.path.join(self.documents_dir, filename)
                try:
                    with fitz.open(file_path) as doc:
                        for page_num in range(len(doc)):
                            page = doc[page_num]
                            raw_text = page.get_text("text")
                            
                            # Apply Persian text normalization to fix ligatures, newlines, and numerals
                            normalized_text = PersianNormalizer.normalize(raw_text)
                            
                            if normalized_text.strip():
                                documents.append({
                                    "text": normalized_text,
                                    "metadata": {
                                        "source": filename,
                                        "page": page_num + 1
                                    }
                                })
                except Exception as e:
                    print(f"Error reading PDF {filename}: {e}")
        return documents

    def initialize_embeddings(self):
        """Loads HuggingFaceEmbeddings using the local model files."""
        if self.embeddings is None:
            exists, err = self.check_models_exist()
            if not exists:
                raise ValueError(err)

            # Avoid thread contention in PyTorch on CPU by limiting threads
            try:
                import torch
                torch.set_num_threads(max(1, (os.cpu_count() or 4) // 2))
                torch.set_grad_enabled(False)
            except Exception:
                pass

            # Deferred import for faster app startup
            from langchain_huggingface import HuggingFaceEmbeddings

            # Load the embedding model locally forcing cpu device
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.embedding_model_dir,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )

    def load_or_build_vector_store(self, force: bool = False) -> str:
        """Loads the existing FAISS index or builds a new one from scratch."""
        # Fast path: if vector store is already loaded and metadata has not changed, don't read from disk
        if self.vector_store is not None and not force and not self.should_rebuild_index():
            return "loaded"

        self.initialize_embeddings()

        rebuild = force or self.should_rebuild_index()
        faiss_index_file = os.path.join(self.vector_store_dir, "index.faiss")

        # Deferred import for FAISS
        from langchain_community.vectorstores import FAISS

        if not rebuild and os.path.exists(faiss_index_file):
            print("[*] Loading existing FAISS index...")
            try:
                self.vector_store = FAISS.load_local(
                    self.vector_store_dir, 
                    self.embeddings,
                    allow_dangerous_deserialization=True  # Required for loading local pickle files
                )
                return "loaded"
            except Exception as e:
                print(f"[-] Error loading local index: {e}. Rebuilding instead...")
                rebuild = True

        if rebuild:
            print("[*] Rebuilding FAISS index from PDFs...")
            raw_docs = self.extract_text_from_pdfs()
            if not raw_docs:
                return "no_documents"

            # Deferred import for RecursiveCharacterTextSplitter
            from langchain_text_splitters import RecursiveCharacterTextSplitter

            # Split into chunks: Size=800, Overlap=200 to keep context blocks complete
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,
                chunk_overlap=200,
                separators=["\n\n", "\n", " ", ""]
            )
            
            texts = []
            metadatas = []
            for doc in raw_docs:
                chunks = text_splitter.split_text(doc["text"])
                for chunk in chunks:
                    if chunk.strip():
                        texts.append(chunk)
                        metadatas.append(doc["metadata"])

            if not texts:
                return "no_text_extracted"

            # Create vector store
            self.vector_store = FAISS.from_texts(
                texts=texts,
                embedding=self.embeddings,
                metadatas=metadatas
            )

            # Save vector store and source metadata
            self.vector_store.save_local(self.vector_store_dir)
            current_metadata = self.get_documents_metadata()
            metadata_file = os.path.join(self.vector_store_dir, "source_metadata.json")
            with open(metadata_file, "w", encoding="utf-8") as f:
                json.dump(current_metadata, f, ensure_ascii=False, indent=4)

            return "rebuilt"

        # Should never reach here, but return a fallback status to avoid implicit None
        return "error"

    def initialize_llm(self):
        """Loads the GGUF model via llama-cpp-python."""
        if self.llm is None:
            exists, err = self.check_models_exist()
            if not exists:
                raise ValueError(err)

            # Deferred import for faster app startup
            from llama_cpp import Llama

            print(f"[*] Loading LLM: {self.llm_model_path}...")
            # We set physical threads to avoid hyperthreading slowdowns
            threads = os.cpu_count()
            n_threads = max(1, threads // 2) if threads else 4
            n_threads_batch = threads if threads else 4
            
            # We set n_ctx=5120 to support reasonable context windows while saving RAM/VRAM
            # n_batch=512 evaluates prompt chunks quickly. n_gpu_layers=-1 uses hardware acceleration.
            # flash_attn=True significantly accelerates prompt evaluation.
            self.llm = Llama(
                model_path=self.llm_model_path,
                n_ctx=4096,
                n_batch=1024,
                n_gpu_layers=-1,
                n_threads=n_threads,
                n_threads_batch=n_threads_batch,
                flash_attn=True,
                verbose=False
            )
            print("[+] LLM loaded successfully.")

    @staticmethod
    def detect_language(text: str) -> str:
        """Detects whether the given question text is English ('en') or Persian ('fa')."""
        if not text:
            return "fa"
        
        latin_chars = len(re.findall(r'[a-zA-Z]', text))
        persian_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))
        
        if latin_chars > 0 and persian_chars == 0:
            return "en"
        elif persian_chars > 0 and latin_chars == 0:
            return "fa"
        elif latin_chars > 0 and persian_chars > 0:
            text_lower = text.lower().strip()
            english_starters = ("what ", "how ", "where ", "who ", "why ", "which ", "when ", "is ", "are ", "can ", "could ", "does ", "did ", "do ")
            if any(text_lower.startswith(starter) for starter in english_starters):
                return "en"
            if latin_chars > (persian_chars * 1.5):
                return "en"
            return "fa"
            
        return "fa"

    def query(self, question: str, k: int = 5, lang: str = None):
        """Queries the vector store and runs LLM inference for RAG response (Streaming)."""
        question_lang = self.detect_language(question)
        if question_lang == "en":
            target_lang = "en"
        elif lang:
            target_lang = lang
        else:
            target_lang = "fa"

        load_status = None
        if self.vector_store is None:
            load_status = self.load_or_build_vector_store()
            
        if self.vector_store is None:
            if target_lang == "en":
                if load_status == "no_documents":
                    err_text = "No PDF documents found in Documents directory. Please add PDF files first."
                elif load_status == "no_text_extracted":
                    err_text = "No text could be extracted from PDFs. Verify files are not scanned images."
                else:
                    err_text = "Document database is not ready. Please place PDF files in Documents directory."
            else:
                if load_status == "no_documents":
                    err_text = "هیچ سند PDF در پوشه Documents یافت نشد. لطفاً ابتدا فایل‌های PDF اضافه کنید."
                elif load_status == "no_text_extracted":
                    err_text = "متنی از اسناد PDF استخراج نشد. بررسی کنید فایل‌ها اسکن تصویری نباشند."
                else:
                    err_text = "پایگاه داده اسناد آماده نیست. لطفاً ابتدا فایل‌های PDF را در پوشه Documents قرار دهید."
            yield {"type": "error", "text": err_text}
            return

        # 1. Retrieve top chunks using LangChain retriever interface
        search_query = question
        retriever = self.vector_store.as_retriever(search_kwargs={"k": k})
        retrieved_docs = retriever.invoke(search_query)

        # Assemble context and sources with substring-based chunk deduplication
        context_blocks = []
        sources = []
        unique_docs = []
        
        for doc in retrieved_docs:
            content_norm = re.sub(r'\s+', ' ', doc.page_content).strip()
            is_redundant = False
            for idx, existing_doc in enumerate(unique_docs):
                existing_norm = re.sub(r'\s+', ' ', existing_doc.page_content).strip()
                if content_norm in existing_norm:
                    # Current doc content is fully contained in an existing one, skip it
                    is_redundant = True
                    break
                elif existing_norm in content_norm:
                    # Existing doc content is fully contained in current larger one, replace it
                    unique_docs[idx] = doc
                    is_redundant = True
                    break
            if not is_redundant:
                unique_docs.append(doc)

        for doc in unique_docs:
            if target_lang == "en":
                src = f"Document: {doc.metadata.get('source', 'Unknown')} (Page {doc.metadata.get('page', 1)})"
            else:
                src = f"سند: {doc.metadata.get('source', 'نامشخص')} (صفحه {doc.metadata.get('page', 1)})"
            clean_content = re.sub(r'\s+', ' ', doc.page_content).strip()
            context_blocks.append(f"[{src}]: {clean_content}")
            sources.append({
                "source": doc.metadata.get("source"),
                "page": doc.metadata.get("page"),
                "content": doc.page_content
            })

        context_text = "\n".join(context_blocks)

        # Yield sources first so GUI can show them immediately
        yield {
            "type": "sources",
            "sources": sources
        }

        # 2. Setup prompt and run LLM
        self.initialize_llm()

        # Deferred import
        from langchain_core.prompts import PromptTemplate

        if target_lang == "en":
            system_prompt = (
                "You are an AI document information extraction assistant.\n"
                "Strict and unchangeable rules:\n"
                "1. Answer ONLY based on the provided document text. If the answer is not in the text, explicitly state: \"No information found in documents.\" Do not hallucinate or make up any facts.\n"
                "2. Do not guess any section numbers, clause numbers, or names. Only state details explicitly mentioned in the text.\n"
                "3. The ENTIRE answer MUST be in clear, fluent English.\n"
                "4. Carefully verify relationships, conditions, names, and requirements mentioned in the text.\n"
                "Your response structure MUST follow this exact format:\n"
                "Analysis: [Step-by-step evaluation of the document text and matching concepts]\n"
                "Final Answer: [Definitive answer]"
            )
            user_prompt_template = PromptTemplate.from_template(
                "Document Content:\n{context}\n\nUser Question: {question}\n\nPlease answer strictly following the required structure (Analysis: ... Final Answer: ...):"
            )
        else:
            system_prompt = (
                "شما یک دستیار هوش مصنوعی استخراج اطلاعات از اسناد هستید.\n"
                "قوانین اکید و غیرقابل تغییر:\n"
                "۱. فقط و فقط بر اساس متن ارائه شده پاسخ دهید. اگر پاسخ در متن نیست، صراحتاً بنویسید: «اطلاعاتی در اسناد یافت نشد.» و هیچ چیزی از خودتان نسازید.\n"
                "۲. حق ندارید هیچ شماره ماده یا تبصره‌ای را حدس بزنید. فقط شماره‌هایی را ذکر کنید که دقیقاً در متن به آنها اشاره شده است.\n"
                "۳. استفاده از کلمات انگلیسی (مانند Maximum یا Minimum) کاملاً ممنوع است. تمام پاسخ باید به زبان فارسی روان باشد.\n"
                "۴. حتماً بررسی کنید که آیا بین کلماتی مثل حداقل/حداکثر و کمتر/بیشتر ارتباطی در متن وجود دارد یا خیر.\n"
                "ساختار پاسخ شما باید دقیقاً اینگونه باشد:\n"
                "تحلیل: [بررسی قدم به قدم متن و تطبیق مفاهیم]\n"
                "پاسخ نهایی: [جواب قطعی]"
            )
            user_prompt_template = PromptTemplate.from_template(
                "متن اسناد:\n{context}\n\nسوال کاربر: {question}\n\nاکنون دقیقاً طبق ساختار خواسته شده (تحلیل: ... پاسخ نهایی: ...) پاسخ بده:"
            )

        user_content = user_prompt_template.format(context=context_text, question=question)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            # Set temperature=0.0 and max_tokens=1024 for Chain-of-Thought outputs, enable streaming
            response_stream = self.llm.create_chat_completion(
                messages=messages,
                temperature=0.0,
                max_tokens=1024,
                stream=True
            )
            for chunk in response_stream:
                choices = chunk.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    token = delta.get("content")
                    if token:
                        yield {
                            "type": "token",
                            "text": token
                        }
        except Exception as e:
            err_prefix = "Error generating LLM response" if target_lang == "en" else "خطا در تولید پاسخ از مدل"
            yield {
                "type": "error",
                "text": f"{err_prefix}: {str(e)}"
            }


