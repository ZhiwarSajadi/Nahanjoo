# -*- coding: utf-8 -*-
"""
Nahanjoo App - PySide6 GUI Frontend
Author: Zhiwar Sajadi
Description: Implements the RTL dark-themed chat interface, sidebar documents, and history management.
Copyright (c) 2026 Zhiwar Sajadi. All rights reserved.
Licensed under the MIT License.
"""

import os
import shutil
import json
from datetime import datetime
from PySide6.QtCore import Qt, QThread, Signal, Slot, QTimer
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QTextEdit,
    QLineEdit, QPushButton, QLabel, QScrollArea, QFrame,
    QListWidget, QProgressBar, QMessageBox, QSplitter, QFileDialog, QDialog,
    QListWidgetItem, QSizePolicy
)
from PySide6.QtGui import QFont, QFontDatabase, QColor, QPalette, QIcon

from rag_engine import RAGEngine

# Dictionary for Persian (fa) and English (en) UI translations
TRANSLATIONS = {
    "fa": {
        "help_menu": "راهنما",
        "usage_guide": "راهنمای استفاده",
        "about_app": "درباره برنامه",
        "chats_title": "گفتگوها (Chats)",
        "new_chat": "گفتگوی جدید",
        "delete_chat": "حذف گفتگو",
        "docs_title": "پوشه اسناد (Documents)",
        "add_doc": "افزودن سند",
        "remove_doc": "حذف سند",
        "sync_docs": "همگام‌سازی اسناد",
        "factory_reset": "پاکسازی",
        "header_title": "دستیار هوشمند نهانجو",
        "header_subtitle": "پایگاه دانش محلی 100% آفلاین (مدل Qwen 2.5 3B)",
        "input_placeholder": "سوال خود را به زبان فارسی یا انگلیسی درباره اسناد بپرسید...",
        "send_button": "ارسال سوال",
        "disclaimer": "هوش مصنوعی نهانجو ممکن است اشتباه کند، صحت اطلاعات را ارزیابی کنید.",
        "lang_toggle_btn": "🌐 English",
        "status_waiting": "وضعیت: در انتظار...",
        "status_ready_loaded": "وضعیت: پایگاه داده اسناد بارگذاری شد (آماده).",
        "status_ready_rebuilt": "وضعیت: نمایه‌سازی اسناد با موفقیت انجام شد (آماده).",
        "status_preparing": "در حال آماده‌سازی موتور هوش مصنوعی...",
        "status_generating": "در حال تولید پاسخ هوشمند...",
        "status_error_models": "خطا: مدل‌ها دانلود نشده‌اند.",
        "status_ready_general": "وضعیت: پایگاه داده اسناد آماده است.",
        "status_error_init": "خطا در راه‌اندازی پایگاه دانش.",
        "status_error_occurred": "خطایی رخ داد.",
        "status_reset_done": "وضعیت: برنامه بازنشانی شد. لطفاً اسناد جدید اضافه کنید.",
        "empty_docs_list": "پوشه خالی است (فایل pdf پیدا نشد)",
        "sources_header": "<b>منابع استخراج شده:</b>",
        "source_page": "صفحه",
        "chat_item_default": "گفتگوی جدید",
        "confirm_delete_chat_title": "حذف گفتگو",
        "confirm_delete_chat_msg": "آیا از حذف این گفتگو اطمینان دارید؟",
        "confirm_reset_title": "بازنشانی برنامه",
        "confirm_reset_msg": "با انجام این عمل، برنامه با انجام بازنشانی و پاکسازی، تمام چت ها و اسناد افزوده شده را پاک میکند. آیا از انجام آن اطمینان دارید؟",
        "reset_success_msg": "بازنشانی برنامه با موفقیت انجام شد.",
        "delete_pdf_title": "حذف سند",
        "delete_pdf_msg": "آیا از حذف سند '{filename}' و به‌روزرسانی پایگاه دانش مطمئن هستید؟",
        "select_pdf_title": "انتخاب اسناد PDF",
        "sync_success_title": "موفقیت",
        "sync_success_msg": "نمایه‌سازی و همگام‌سازی اسناد با موفقیت انجام شد.",
        "error_title": "خطا",
        "close_btn": "بستن",
        "help_dialog_title": "راهنمای استفاده از نهانجو",
        "about_dialog_title": "درباره نهانجو - Nahanjoo v1.0",
        "thinking_placeholder": "<i>نهانجو در حال جستجو در اسناد و پاسخ‌دهی است... لطفاً شکیبا باشید.</i>",
        "analyzing_placeholder": "<i>در حال تحلیل اسناد و تولید پاسخ...</i>"
    },
    "en": {
        "help_menu": "Help",
        "usage_guide": "Usage Guide",
        "about_app": "About App",
        "chats_title": "Conversations",
        "new_chat": "New Chat",
        "delete_chat": "Delete Chat",
        "docs_title": "Documents Directory",
        "add_doc": "Add Document",
        "remove_doc": "Delete Document",
        "sync_docs": "Sync Documents",
        "factory_reset": "Factory Reset",
        "header_title": "Nahanjoo AI Assistant",
        "header_subtitle": "100% Offline Local Knowledge Base (Qwen 2.5 3B Model)",
        "input_placeholder": "Ask your question about documents in English or Persian...",
        "send_button": "Send Question",
        "disclaimer": "Nahanjoo AI may make mistakes. Verify important information.",
        "lang_toggle_btn": "🌐 فارسی",
        "status_waiting": "Status: Waiting...",
        "status_ready_loaded": "Status: Document database loaded (Ready).",
        "status_ready_rebuilt": "Status: Document indexing completed successfully (Ready).",
        "status_preparing": "Preparing AI engine...",
        "status_generating": "Generating intelligent response...",
        "status_error_models": "Error: Models are not downloaded.",
        "status_ready_general": "Status: Document database is ready.",
        "status_error_init": "Error initializing knowledge base.",
        "status_error_occurred": "An error occurred.",
        "status_reset_done": "Status: Application reset. Please add new documents.",
        "empty_docs_list": "Directory is empty (No PDF files found)",
        "sources_header": "<b>Extracted Sources:</b>",
        "source_page": "Page",
        "chat_item_default": "New Chat",
        "confirm_delete_chat_title": "Delete Conversation",
        "confirm_delete_chat_msg": "Are you sure you want to delete this conversation?",
        "confirm_reset_title": "Factory Reset",
        "confirm_reset_msg": "This action will completely reset the application and erase all chats and added documents. Are you sure?",
        "reset_success_msg": "Application reset completed successfully.",
        "delete_pdf_title": "Delete Document",
        "delete_pdf_msg": "Are you sure you want to delete '{filename}' and update the knowledge base?",
        "select_pdf_title": "Select PDF Documents",
        "sync_success_title": "Success",
        "sync_success_msg": "Document indexing and synchronization completed successfully.",
        "error_title": "Error",
        "close_btn": "Close",
        "help_dialog_title": "Nahanjoo Usage Guide",
        "about_dialog_title": "About Nahanjoo v1.0",
        "thinking_placeholder": "<i>Nahanjoo is searching documents and generating an answer... Please wait.</i>",
        "analyzing_placeholder": "<i>Analyzing documents and generating response...</i>"
    }
}

# Define QThreads for background execution

class IndexWorker(QThread):
    """Background worker to index PDFs without freezing the UI."""
    started = Signal()
    progress = Signal(str)
    finished = Signal(str, bool)  # status_code, success

    def __init__(self, rag_engine: RAGEngine, force: bool = False):
        super().__init__()
        self.rag_engine = rag_engine
        self.force = force

    def run(self):
        self.started.emit()
        try:
            # First, check if models exist
            models_ok, err_msg = self.rag_engine.check_models_exist()
            if not models_ok:
                self.finished.emit(err_msg, False)
                return

            self.progress.emit("در حال راه‌اندازی مدل تعبیه‌ساز...")
            self.rag_engine.initialize_embeddings()

            self.progress.emit("در حال پردازش اسناد PDF و ساخت بردارها...")
            status = self.rag_engine.load_or_build_vector_store(force=self.force)
            
            # Pre-load the LLM in the background so it's warm and ready for the first query
            self.progress.emit("در حال بارگذاری مدل زبانی در حافظه...")
            self.rag_engine.initialize_llm()
            
            if status == "no_documents":
                self.finished.emit("هیچ سند PDF در پوشه Documents یافت نشد. لطفاً چند فایل PDF اضافه کنید.", False)
            elif status == "no_text_extracted":
                self.finished.emit("متنی از اسناد PDF استخراج نشد. بررسی کنید فایل‌ها اسکن شده (تصویری) نباشند.", False)
            else:
                self.finished.emit(status, True)
        except Exception as e:
            self.finished.emit(f"خطا در نمایه‌سازی اسناد: {str(e)}", False)


class QueryWorker(QThread):
    """Background worker to query the RAG pipeline with streaming."""
    sources_ready = Signal(list)
    new_token = Signal(str)
    finished = Signal(str, list)  # Final answer, sources
    error_occurred = Signal(str)

    def __init__(self, rag_engine: RAGEngine, question: str, lang: str = "fa"):
        super().__init__()
        self.rag_engine = rag_engine
        self.question = question
        self.lang = lang
        self._is_running = True

    def run(self):
        try:
            self.rag_engine.initialize_llm()
            
            sources = []
            full_answer = ""
            
            for chunk in self.rag_engine.query(self.question, lang=self.lang):
                if not self._is_running:
                    break
                    
                chunk_type = chunk.get("type")
                if chunk_type == "sources":
                    sources = chunk.get("sources", [])
                    self.sources_ready.emit(sources)
                elif chunk_type == "token":
                    token = chunk.get("text", "")
                    full_answer += token
                    self.new_token.emit(token)
                elif chunk_type == "error":
                    err_msg = chunk.get("text") or chunk.get("answer") or ("Error occurred." if self.lang == "en" else "خطایی رخ داد.")
                    self.error_occurred.emit(err_msg)
                    return
            
            if self._is_running:
                full_answer_fixed = full_answer.replace("نیمسلا", "نیمسال")
                self.finished.emit(full_answer_fixed, sources)
                
        except Exception as e:
            err_prefix = "Error processing question" if self.lang == "en" else "خطا در پردازش سوال"
            self.error_occurred.emit(f"{err_prefix}: {str(e)}")

    def terminate_query(self):
        self._is_running = False


# Custom Chat Bubble Widget
class ChatBubble(QFrame):
    def __init__(self, text: str, is_user: bool, sources: list = None, lang: str = "fa", parent=None):
        super().__init__(parent)
        self.lang = lang
        self.setFrameShape(QFrame.StyledPanel)
        
        # Main Layout inside the bubble
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(6)

        # Message Text Label (supports HTML for formatting sources)
        self.text_label = QLabel(self)
        self.text_label.setTextFormat(Qt.RichText)
        self.text_label.setWordWrap(True)
        self.text_label.setTextInteractionFlags(Qt.TextSelectableByMouse)
        
        # Clean up text for HTML display
        formatted_text = text.replace("\n", "<br>")
        self.text_label.setText(formatted_text)
        layout.addWidget(self.text_label)

        # UI Styling based on sender
        if is_user:
            # User Bubble: Indigo Gradient
            self.setStyleSheet("""
                QFrame {
                    background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #6366f1, stop:1 #4f46e5);
                    border-radius: 12px;
                    border: none;
                }
                QLabel {
                    color: #ffffff;
                    font-size: 11pt;
                }
            """)
        else:
            # AI Bubble: Dark Gray glassmorphism
            self.setStyleSheet("""
                QFrame {
                    background-color: rgba(42, 43, 54, 0.85);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                QLabel {
                    color: #e2e8f0;
                    font-size: 11pt;
                    line-height: 1.5;
                }
            """)

            # Add source documents if present and not empty
            if sources:
                self.add_sources(sources)

    def update_text(self, text: str):
        formatted_text = text.replace("\n", "<br>")
        self.text_label.setText(formatted_text)

    def add_sources(self, sources):
        if not sources:
            return
        tr = TRANSLATIONS.get(self.lang, TRANSLATIONS["fa"])
        source_header = QLabel(tr["sources_header"], self)
        source_header.setStyleSheet("color: #a78bfa; font-size: 9pt; margin-top: 5px;")
        self.layout().addWidget(source_header)

        unique_sources = {}
        for src in sources:
            s_name = src.get("source")
            s_page = src.get("page")
            if s_name:
                if s_name not in unique_sources:
                    unique_sources[s_name] = set()
                unique_sources[s_name].add(s_page)

        page_word = tr["source_page"]
        sources_text = ""
        for s_name, pages in unique_sources.items():
            pages_str = ", ".join(str(p) for p in sorted(pages))
            sources_text += f"• {s_name} ({page_word} {pages_str})<br>"

        sources_label = QLabel(sources_text, self)
        sources_label.setWordWrap(True)
        sources_label.setStyleSheet("color: #94a3b8; font-size: 8.5pt;")
        self.layout().addWidget(sources_label)


class NahanjooGUI(QMainWindow):
    def __init__(self, rag_engine: RAGEngine):
        super().__init__()
        self.rag_engine = rag_engine
        
        # Language & Status Tracking
        self.current_lang = "fa"
        self.current_status_key = "status_waiting"
        self.current_status_custom = None

        # Initialize Chat Session Management variables
        self.chats_dir = os.path.join(self.rag_engine.base_dir, "Chats")
        os.makedirs(self.chats_dir, exist_ok=True)
        self.current_chat_id = None
        self.current_messages = []
        self.is_manual_sync = False
        
        # Setup window parameters
        self.setWindowTitle("Nahanjoo")
        self.resize(1100, 750)
        self.setMinimumSize(900, 650)

        # Set Window Icon
        logo_path = os.path.join(self.rag_engine.base_dir, "logo.jpg")
        if os.path.exists(logo_path):
            self.setWindowIcon(QIcon(logo_path))

        # Force RTL layout globally for Persian language
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

        # Setup modern typography
        self.setup_fonts()

        # Apply rich styling stylesheet
        self.apply_stylesheet()

        # Initialize UI Components
        self.init_ui()

        # Load chats list and select the most recent or start new
        self.update_chats_list()
        if self.chats_list.count() > 0:
            first_item = self.chats_list.item(0)
            chat_id = first_item.data(Qt.UserRole)
            self.load_chat_by_id(chat_id)
            self.chats_list.setCurrentItem(first_item)
        else:
            self.start_new_chat()

        # Check models and build index automatically on startup
        self.startup_check()

    def setup_fonts(self):
        # Use rag_engine.base_dir which correctly handles frozen EXE and embedded Python environments
        base_dir = self.rag_engine.base_dir
        font_path = os.path.join(base_dir, "Models", "fonts", "Vazirmatn-Regular.ttf")
        if os.path.exists(font_path):
            QFontDatabase.addApplicationFont(font_path)
            font = QFont("Vazirmatn", 10)
            QApplication.setFont(font)
        else:
            font = QFont("Segoe UI", 10)
            QApplication.setFont(font)

    def apply_stylesheet(self):
        # Deep dark theme with glassmorphic accents, tailored HSL colors (purples/grays)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #0f0e15;
            }
            QWidget {
                color: #e2e8f0;
                font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
            }
            
            /* Menu Bar Styling */
            QMenuBar {
                background-color: #161420;
                border-bottom: 1px solid #222030;
                color: #cbd5e1;
                font-weight: bold;
            }
            QMenuBar::item {
                background-color: transparent;
                padding: 6px 12px;
                border-radius: 4px;
            }
            QMenuBar::item:selected {
                background-color: #2d293d;
                color: #ffffff;
            }
            QMenu {
                background-color: #161420;
                border: 1px solid #222030;
                color: #cbd5e1;
            }
            QMenu::item {
                padding: 6px 20px;
            }
            QMenu::item:selected {
                background-color: #4f46e5;
                color: #ffffff;
            }
            
            /* Sidebar Styling */
            #SidebarFrame {
                background-color: #161420;
                border-left: 1px solid #222030;
            }
            .SidebarTitle {
                color: #a78bfa;
                font-weight: bold;
                font-size: 11pt;
                padding: 5px 0;
            }
            QListWidget {
                background-color: #1e1b29;
                border: 1px solid #2d293d;
                border-radius: 8px;
                padding: 5px;
                color: #cbd5e1;
            }
            QListWidget::item {
                padding: 6px;
                border-radius: 4px;
            }
            QListWidget::item:hover {
                background-color: #2d293d;
                color: #ffffff;
            }
            QListWidget::item:selected {
                background-color: #4f46e5;
                color: #ffffff;
            }
            
            /* Main Chat Area Styling */
            #ChatContainer {
                background-color: #0f0e15;
            }
            #HeaderFrame {
                background-color: #161420;
                border-bottom: 1px solid #222030;
                padding: 15px;
            }
            #HeaderTitle {
                color: #ffffff;
                font-size: 15pt;
                font-weight: bold;
            }
            #HeaderSubtitle {
                color: #94a3b8;
                font-size: 9pt;
            }
            
            /* Scroll Area Styling */
            QScrollArea {
                border: none;
                background-color: transparent;
            }
            #ChatScrollWidget {
                background-color: transparent;
            }
            
            /* ScrollBar Styling */
            QScrollBar:vertical {
                border: none;
                background: #0f0e15;
                width: 8px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background: #2d293d;
                min-height: 20px;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical:hover {
                background: #4c4463;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
            
            /* Input Area Styling */
            #InputAreaFrame {
                background-color: #161420;
                border-top: 1px solid #222030;
                padding: 10px 15px;
            }
            QTextEdit#ChatInput {
                background-color: #1e1b29;
                border: 1px solid #2d293d;
                border-radius: 8px;
                padding: 6px 8px;
                color: #ffffff;
                font-size: 10.5pt;
            }
            QTextEdit#ChatInput:focus {
                border: 1px solid #6366f1;
            }
            
            /* Buttons */
            QPushButton {
                background-color: #4f46e5;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                font-weight: bold;
                font-size: 10pt;
            }
            QPushButton:hover {
                background-color: #6366f1;
            }
            QPushButton:pressed {
                background-color: #4338ca;
            }
            QPushButton:disabled {
                background-color: #3b3a4a;
                color: #64748b;
            }
            
            #SyncButton {
                background-color: #1e1b29;
                border: 1px solid #4f46e5;
                color: #cbd5e1;
            }
            #SyncButton:hover {
                background-color: #4f46e5;
                color: #ffffff;
            }
            
            /* Status / Labels */
            #StatusLabel {
                color: #94a3b8;
                font-size: 9pt;
            }
            #DisclaimerLabel {
                color: #64748b;
                font-size: 8.5pt;
                padding-top: 2px;
                padding-bottom: 2px;
            }

            /* Language Toggle Button */
            #LangToggleBtn {
                background-color: #1e1b29;
                border: 1px solid #6366f1;
                color: #a78bfa;
                border-radius: 8px;
                padding: 6px 14px;
                font-size: 9.5pt;
                font-weight: bold;
            }
            #LangToggleBtn:hover {
                background-color: #4f46e5;
                color: #ffffff;
            }
        """)

    def init_ui(self):
        tr = TRANSLATIONS[self.current_lang]

        # Create Menu Bar
        menubar = self.menuBar()
        self.help_menu = menubar.addMenu(tr["help_menu"])
        self.usage_action = self.help_menu.addAction(tr["usage_guide"])
        self.usage_action.triggered.connect(self.show_help_dialog)
        self.help_menu.addSeparator()
        self.about_action = self.help_menu.addAction(tr["about_app"])
        self.about_action.triggered.connect(self.show_about_dialog)

        # Create Central Widget
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)
        
        # Main Horizontal Layout using Splitter
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        splitter = QSplitter(Qt.Horizontal)
        splitter.setHandleWidth(1)
        splitter.setStyleSheet("QSplitter::handle { background-color: #222030; }")

        # ------------------ SIDEBAR PANEL ------------------
        sidebar = QFrame()
        sidebar.setObjectName("SidebarFrame")
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(12, 12, 12, 12)
        sidebar_layout.setSpacing(10)

        # --- Chats Section ---
        self.chats_title = QLabel(tr["chats_title"])
        self.chats_title.setProperty("class", "SidebarTitle")
        self.chats_title.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(self.chats_title)

        self.new_chat_button = QPushButton(tr["new_chat"])
        self.new_chat_button.setCursor(Qt.PointingHandCursor)
        self.new_chat_button.clicked.connect(self.start_new_chat)
        sidebar_layout.addWidget(self.new_chat_button)

        self.chats_list = QListWidget()
        self.chats_list.itemClicked.connect(self.load_chat_item)
        sidebar_layout.addWidget(self.chats_list, 2)  # Stretch factor 2

        self.delete_chat_button = QPushButton(tr["delete_chat"])
        self.delete_chat_button.setStyleSheet("background-color: #ef4444;")
        self.delete_chat_button.setCursor(Qt.PointingHandCursor)
        self.delete_chat_button.clicked.connect(self.delete_selected_chat)
        sidebar_layout.addWidget(self.delete_chat_button)

        # Horizontal separator
        sep = QFrame()
        sep.setFrameShape(QFrame.HLine)
        sep.setFrameShadow(QFrame.Sunken)
        sep.setStyleSheet("background-color: #222030; max-height: 1px; margin: 5px 0;")
        sidebar_layout.addWidget(sep)

        # --- Documents Section ---
        self.docs_title = QLabel(tr["docs_title"])
        self.docs_title.setProperty("class", "SidebarTitle")
        self.docs_title.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(self.docs_title)

        self.pdf_list = QListWidget()
        sidebar_layout.addWidget(self.pdf_list, 3)  # Stretch factor 3

        # Add & Remove PDF buttons
        doc_buttons_layout = QHBoxLayout()
        doc_buttons_layout.setSpacing(6)
        
        self.add_pdf_button = QPushButton(tr["add_doc"])
        self.add_pdf_button.setCursor(Qt.PointingHandCursor)
        self.add_pdf_button.clicked.connect(self.add_pdf_files)
        doc_buttons_layout.addWidget(self.add_pdf_button)

        self.remove_pdf_button = QPushButton(tr["remove_doc"])
        self.remove_pdf_button.setStyleSheet("background-color: #ef4444;")
        self.remove_pdf_button.setCursor(Qt.PointingHandCursor)
        self.remove_pdf_button.clicked.connect(self.remove_selected_pdf)
        doc_buttons_layout.addWidget(self.remove_pdf_button)

        sidebar_layout.addLayout(doc_buttons_layout)

        # Sync/Refresh Button
        self.sync_button = QPushButton(tr["sync_docs"])
        self.sync_button.setObjectName("SyncButton")
        self.sync_button.setCursor(Qt.PointingHandCursor)
        self.sync_button.clicked.connect(lambda: self.run_indexing(force=True, manual=True))
        sidebar_layout.addWidget(self.sync_button)

        # Sync Progress Bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.setVisible(False)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setFixedHeight(6)
        sidebar_layout.addWidget(self.progress_bar)

        # Status Label
        self.status_label = QLabel(tr["status_waiting"])
        self.status_label.setObjectName("StatusLabel")
        self.status_label.setWordWrap(True)
        sidebar_layout.addWidget(self.status_label)

        # Factory Reset Button
        self.reset_button = QPushButton(tr["factory_reset"])
        self.reset_button.setStyleSheet("background-color: #dc2626; color: #ffffff; font-weight: bold;")
        self.reset_button.setCursor(Qt.PointingHandCursor)
        self.reset_button.clicked.connect(self.factory_reset)
        sidebar_layout.addWidget(self.reset_button)

        # Add sidebar to splitter
        splitter.addWidget(sidebar)

        # ------------------ MAIN CHAT PANEL ------------------
        chat_panel = QFrame()
        chat_panel.setObjectName("ChatContainer")
        chat_layout = QVBoxLayout(chat_panel)
        chat_layout.setContentsMargins(0, 0, 0, 0)
        chat_layout.setSpacing(0)

        # Header Frame
        header_frame = QFrame()
        header_frame.setObjectName("HeaderFrame")
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(20, 12, 20, 12)
        header_layout.setSpacing(10)

        header_text_layout = QVBoxLayout()
        header_text_layout.setSpacing(4)

        self.header_title = QLabel(tr["header_title"])
        self.header_title.setObjectName("HeaderTitle")
        header_text_layout.addWidget(self.header_title)

        self.header_subtitle = QLabel(tr["header_subtitle"])
        self.header_subtitle.setObjectName("HeaderSubtitle")
        header_text_layout.addWidget(self.header_subtitle)

        header_layout.addLayout(header_text_layout, 1)

        # Language Toggle Button
        self.lang_toggle_btn = QPushButton(tr["lang_toggle_btn"])
        self.lang_toggle_btn.setObjectName("LangToggleBtn")
        self.lang_toggle_btn.setCursor(Qt.PointingHandCursor)
        self.lang_toggle_btn.clicked.connect(self.toggle_language)
        header_layout.addWidget(self.lang_toggle_btn, 0)

        chat_layout.addWidget(header_frame)

        # Chat Area (Scroll Area) - Maximum vertical space
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        
        self.chat_scroll_widget = QWidget()
        self.chat_scroll_widget.setObjectName("ChatScrollWidget")
        
        self.chat_history_layout = QVBoxLayout(self.chat_scroll_widget)
        self.chat_history_layout.setContentsMargins(20, 20, 20, 20)
        self.chat_history_layout.setSpacing(15)
        self.chat_history_layout.addStretch()  # Initial stretch
        
        self.scroll_area.setWidget(self.chat_scroll_widget)
        
        # Maximize scroll area space using layout stretch factors
        chat_layout.addWidget(self.scroll_area, 1)

        # Input Area Frame - Kept at absolute bottom
        input_area_frame = QFrame()
        input_area_frame.setObjectName("InputAreaFrame")
        input_area_container_layout = QVBoxLayout(input_area_frame)
        input_area_container_layout.setContentsMargins(15, 8, 15, 6)
        input_area_container_layout.setSpacing(6)

        input_row_layout = QHBoxLayout()
        input_row_layout.setContentsMargins(0, 0, 0, 0)
        input_row_layout.setSpacing(10)

        self.chat_input = QTextEdit()
        self.chat_input.setObjectName("ChatInput")
        self.chat_input.setPlaceholderText(tr["input_placeholder"])
        self.chat_input.setFixedHeight(45)
        self.chat_input.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        # Enable Enter key to send message (Shift+Enter for newline)
        self.chat_input.installEventFilter(self)
        input_row_layout.addWidget(self.chat_input)

        self.send_button = QPushButton(tr["send_button"])
        self.send_button.setCursor(Qt.PointingHandCursor)
        self.send_button.setFixedHeight(45)
        self.send_button.clicked.connect(self.send_question)
        input_row_layout.addWidget(self.send_button)

        input_area_container_layout.addLayout(input_row_layout)

        # Permanent Disclaimer Label at bottom of input area
        self.disclaimer_label = QLabel(tr["disclaimer"])
        self.disclaimer_label.setObjectName("DisclaimerLabel")
        self.disclaimer_label.setAlignment(Qt.AlignCenter)
        input_area_container_layout.addWidget(self.disclaimer_label)

        chat_layout.addWidget(input_area_frame, 0)

        # Add chat panel to splitter
        splitter.addWidget(chat_panel)
        
        # Set default splitter proportions (Sidebar: 25%, Chat: 75%)
        splitter.setSizes([260, 840])
        main_layout.addWidget(splitter)

        # Disable chat input until index is loaded/ready
        self.set_chat_enabled(False)

    def set_status(self, key: str = None, custom_text: str = None):
        if key:
            self.current_status_key = key
            self.current_status_custom = None
            text = TRANSLATIONS[self.current_lang].get(key, key)
        elif custom_text:
            self.current_status_custom = custom_text
            text = custom_text
        else:
            text = ""
        self.status_label.setText(text)

    def toggle_language(self):
        """Switches the UI interface between Persian (fa) and English (en)."""
        self.current_lang = "en" if self.current_lang == "fa" else "fa"
        self.apply_language()

    def apply_language(self):
        lang = self.current_lang
        tr = TRANSLATIONS[lang]

        # Layout direction: RTL for Persian, LTR for English
        layout_dir = Qt.LayoutDirection.RightToLeft if lang == "fa" else Qt.LayoutDirection.LeftToRight
        QApplication.setLayoutDirection(layout_dir)
        self.setLayoutDirection(layout_dir)

        # Menu Bar
        self.help_menu.setTitle(tr["help_menu"])
        self.usage_action.setText(tr["usage_guide"])
        self.about_action.setText(tr["about_app"])

        # Sidebar
        self.chats_title.setText(tr["chats_title"])
        self.new_chat_button.setText(tr["new_chat"])
        self.delete_chat_button.setText(tr["delete_chat"])
        self.docs_title.setText(tr["docs_title"])
        self.add_pdf_button.setText(tr["add_doc"])
        self.remove_pdf_button.setText(tr["remove_doc"])
        self.sync_button.setText(tr["sync_docs"])
        self.reset_button.setText(tr["factory_reset"])

        # Header
        self.header_title.setText(tr["header_title"])
        self.header_subtitle.setText(tr["header_subtitle"])
        self.lang_toggle_btn.setText(tr["lang_toggle_btn"])

        # Input Area
        self.chat_input.setPlaceholderText(tr["input_placeholder"])
        self.send_button.setText(tr["send_button"])
        self.disclaimer_label.setText(tr["disclaimer"])

        # Status & PDF list
        self.update_pdf_list()
        self.set_status(key=self.current_status_key, custom_text=self.current_status_custom)

    def eventFilter(self, obj, event):
        """Intercepts key presses in ChatInput to handle Enter key properly."""
        if obj == self.chat_input and event.type() == event.Type.KeyPress:
            if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
                if event.modifiers() & Qt.KeyboardModifier.ShiftModifier:
                    # Let Shift+Enter drop a new line
                    return False
                else:
                    # Normal Enter key sends the question
                    self.send_question()
                    return True
        return super().eventFilter(obj, event)

    def set_chat_enabled(self, enabled: bool):
        self.chat_input.setEnabled(enabled)
        self.send_button.setEnabled(enabled)

    def update_pdf_list(self):
        """Reads files from the Documents directory and lists them in the UI."""
        self.pdf_list.clear()
        if os.path.exists(self.rag_engine.documents_dir):
            pdfs = [f for f in os.listdir(self.rag_engine.documents_dir) if f.lower().endswith(".pdf")]
            if pdfs:
                self.pdf_list.addItems(pdfs)
            else:
                self.pdf_list.addItem(TRANSLATIONS[self.current_lang]["empty_docs_list"])

    def startup_check(self):
        """Checks model assets and runs indexing in background on startup."""
        self.set_chat_enabled(False)
        self.update_pdf_list()
        
        models_ok, err_msg = self.rag_engine.check_models_exist()
        if not models_ok:
            self.set_status(key="status_error_models")
            tr = TRANSLATIONS[self.current_lang]
            QMessageBox.critical(
                self, 
                tr["error_title"], 
                f"{err_msg}\n\nPlease run download_models.py."
            )
            return

        # Models exist. Trigger checking/indexing in the background
        self.run_indexing(force=False)

    def run_indexing(self, force: bool = False, manual: bool = False):
        """Starts background indexing thread."""
        self.is_manual_sync = manual
        self.sync_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.set_status(key="status_preparing")

        self.index_worker = IndexWorker(self.rag_engine, force=force)
        self.index_worker.progress.connect(self.on_index_progress)
        self.index_worker.finished.connect(self.on_index_finished)
        self.index_worker.start()

    @Slot(str)
    def on_index_progress(self, message: str):
        self.set_status(custom_text=message)

    @Slot(str, bool)
    def on_index_finished(self, status: str, success: bool):
        self.progress_bar.setVisible(False)
        self.sync_button.setEnabled(True)
        self.update_pdf_list()
        tr = TRANSLATIONS[self.current_lang]

        if success:
            self.set_chat_enabled(True)
            if status == "loaded":
                self.set_status(key="status_ready_loaded")
            elif status == "rebuilt":
                self.set_status(key="status_ready_rebuilt")
                if self.is_manual_sync:
                    QMessageBox.information(self, tr["sync_success_title"], tr["sync_success_msg"])
        else:
            self.set_status(key="status_error_init")
            QMessageBox.warning(self, tr["error_title"], status)

    def add_message_bubble_to_ui(self, text: str, is_user: bool, sources: list = None) -> QWidget:
        """Helper to create and add a styled chat bubble to the scroll layout."""
        container = QWidget()
        container_layout = QHBoxLayout(container)
        container_layout.setContentsMargins(0, 0, 0, 0)

        bubble = ChatBubble(text, is_user, sources, lang=self.current_lang, parent=self)
        
        if is_user:
            container_layout.addWidget(bubble)
            container_layout.addStretch()
        else:
            container_layout.addStretch()
            container_layout.addWidget(bubble)

        count = self.chat_history_layout.count()
        self.chat_history_layout.insertWidget(count - 1, container)
        
        self.scroll_to_bottom()
        return container

    def scroll_to_bottom(self):
        """Scrolls the chat area to the very bottom to show the latest messages."""
        vsb = self.scroll_area.verticalScrollBar()
        vsb.setValue(vsb.maximum())

    def send_question(self):
        """Prepares and triggers the query background worker."""
        question_text = self.chat_input.toPlainText().strip()
        if not question_text:
            return

        self.chat_input.clear()
        self.current_messages.append({"role": "user", "content": question_text})
        self.save_current_chat()
        self.add_message_bubble_to_ui(question_text, is_user=True)
        self.set_chat_enabled(False)
        self.set_status(key="status_generating")

        tr = TRANSLATIONS[self.current_lang]
        self.typing_placeholder = self.add_message_bubble_to_ui(
            tr["thinking_placeholder"], 
            is_user=False
        )

        self.active_bubble = None
        self.active_text = ""
        self.active_sources = []

        self.query_worker = QueryWorker(self.rag_engine, question_text, lang=self.current_lang)
        self.query_worker.sources_ready.connect(self.on_sources_ready)
        self.query_worker.new_token.connect(self.on_new_token)
        self.query_worker.finished.connect(self.on_query_finished)
        self.query_worker.error_occurred.connect(self.on_query_error)
        self.query_worker.start()

    @Slot(list)
    def on_sources_ready(self, sources):
        if hasattr(self, 'typing_placeholder') and self.typing_placeholder:
            self.chat_history_layout.removeWidget(self.typing_placeholder)
            self.typing_placeholder.deleteLater()
            self.typing_placeholder = None

        self.active_sources = sources
        self.active_text = ""
        tr = TRANSLATIONS[self.current_lang]
        self.active_bubble_container = self.add_message_bubble_to_ui(tr["analyzing_placeholder"], is_user=False, sources=sources)
        self.active_bubble = self.active_bubble_container.findChild(ChatBubble)

    @Slot(str)
    def on_new_token(self, token):
        if self.active_bubble:
            if self.active_text == "":
                self.active_bubble.update_text("")
            
            self.active_text += token
            display_text = self.active_text.replace("نیمسلا", "نیمسال")
            self.active_bubble.update_text(display_text)
            self.scroll_to_bottom()

    @Slot(str, list)
    def on_query_finished(self, final_answer, sources):
        self.set_chat_enabled(True)
        self.set_status(key="status_ready_general")

        if hasattr(self, 'typing_placeholder') and self.typing_placeholder:
            self.chat_history_layout.removeWidget(self.typing_placeholder)
            self.typing_placeholder.deleteLater()
            self.typing_placeholder = None

        if self.active_bubble:
            final_answer_fixed = final_answer.replace("نیمسلا", "نیمسال")
            self.active_bubble.update_text(final_answer_fixed)
            self.current_messages.append({"role": "assistant", "content": final_answer_fixed, "sources": sources})
            self.save_current_chat()
            self.scroll_to_bottom()
            
        self.active_bubble = None
        self.active_text = ""

    @Slot(str)
    def on_query_error(self, error_msg):
        self.set_chat_enabled(True)
        self.set_status(key="status_error_occurred")

        if hasattr(self, 'typing_placeholder') and self.typing_placeholder:
            self.chat_history_layout.removeWidget(self.typing_placeholder)
            self.typing_placeholder.deleteLater()
            self.typing_placeholder = None

        self.add_message_bubble_to_ui(error_msg, is_user=False)

    # --- Chat Session Management ---

    def start_new_chat(self):
        """Starts a clean chat session."""
        self.current_chat_id = f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.current_messages = []
        self.clear_chat_ui()
        self.chat_input.clear()
        self.set_chat_enabled(True)
        
        self.chats_list.blockSignals(True)
        self.chats_list.clearSelection()
        self.chats_list.blockSignals(False)

    def save_current_chat(self):
        """Saves current messages list to JSON on disk."""
        if not self.current_chat_id:
            self.current_chat_id = f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
        tr = TRANSLATIONS[self.current_lang]
        title = tr["chat_item_default"]
        if self.current_messages:
            first_user_msg = next((m for m in self.current_messages if m["role"] == "user"), None)
            if first_user_msg:
                text = first_user_msg["content"]
                title = text[:25] + ("..." if len(text) > 25 else "")
                
        filepath = os.path.join(self.chats_dir, f"{self.current_chat_id}.json")
        session_data = {
            "id": self.current_chat_id,
            "title": title,
            "messages": self.current_messages
        }
        
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(session_data, f, ensure_ascii=False, indent=4)
        except Exception as e:
            print(f"Error saving chat session: {e}")
            
        self.update_chats_list()

    def update_chats_list(self):
        """Finds all chat JSONs on disk and syncs them to side sidebar list."""
        self.chats_list.blockSignals(True)
        self.chats_list.clear()
        
        if os.path.exists(self.chats_dir):
            files = [f for f in os.listdir(self.chats_dir) if f.lower().endswith(".json")]
            files.sort(key=lambda x: os.path.getmtime(os.path.join(self.chats_dir, x)), reverse=True)
            
            for file in files:
                filepath = os.path.join(self.chats_dir, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    chat_id = data.get("id")
                    title = data.get("title", TRANSLATIONS[self.current_lang]["chat_item_default"])
                    
                    item = QListWidgetItem(title)
                    item.setData(Qt.UserRole, chat_id)
                    self.chats_list.addItem(item)
                    
                    if chat_id == self.current_chat_id:
                        self.chats_list.setCurrentItem(item)
                except Exception as e:
                    print(f"Error loading chat metadata: {e}")
                    
        self.chats_list.blockSignals(False)

    def load_chat_item(self, item):
        """Triggers chat loading when sidebar session is clicked."""
        chat_id = item.data(Qt.UserRole)
        if chat_id == self.current_chat_id:
            return
        self.load_chat_by_id(chat_id)

    def load_chat_by_id(self, chat_id):
        self.current_chat_id = chat_id
        filepath = os.path.join(self.chats_dir, f"{chat_id}.json")
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.current_messages = data.get("messages", [])
            self.clear_chat_ui()
            
            for msg in self.current_messages:
                self.add_message_bubble_to_ui(
                    msg["content"], 
                    msg["role"] == "user", 
                    msg.get("sources")
                )
            
            self.set_chat_enabled(True)
        except Exception as e:
            tr = TRANSLATIONS[self.current_lang]
            QMessageBox.critical(self, tr["error_title"], f"{e}")

    def clear_chat_ui(self):
        """Clears all bubble widgets in the scroll history layout."""
        while self.chat_history_layout.count() > 1:
            item = self.chat_history_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def delete_selected_chat(self):
        """Deletes the active or selected chat session file from disk."""
        current_item = self.chats_list.currentItem()
        if not current_item:
            return
            
        chat_id = current_item.data(Qt.UserRole)
        tr = TRANSLATIONS[self.current_lang]
        
        reply = QMessageBox.question(
            self,
            tr["confirm_delete_chat_title"],
            tr["confirm_delete_chat_msg"],
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            filepath = os.path.join(self.chats_dir, f"{chat_id}.json")
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    QMessageBox.warning(self, tr["error_title"], f"{e}")
            
            if chat_id == self.current_chat_id:
                self.start_new_chat()
            
            self.update_chats_list()

    def factory_reset(self):
        """Performs a factory reset, clearing all chats, documents, and vector stores."""
        tr = TRANSLATIONS[self.current_lang]
        reply = QMessageBox.warning(
            self,
            tr["confirm_reset_title"],
            tr["confirm_reset_msg"],
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            if hasattr(self, 'index_worker') and self.index_worker.isRunning():
                self.index_worker.terminate()
                self.index_worker.wait()
            if hasattr(self, 'query_worker') and self.query_worker.isRunning():
                self.query_worker.terminate()
                self.query_worker.wait()

            if os.path.exists(self.chats_dir):
                for filename in os.listdir(self.chats_dir):
                    filepath = os.path.join(self.chats_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting chat file {filename}: {e}")

            if os.path.exists(self.rag_engine.documents_dir):
                for filename in os.listdir(self.rag_engine.documents_dir):
                    filepath = os.path.join(self.rag_engine.documents_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting doc file {filename}: {e}")

            if os.path.exists(self.rag_engine.vector_store_dir):
                for filename in os.listdir(self.rag_engine.vector_store_dir):
                    filepath = os.path.join(self.rag_engine.vector_store_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting index file {filename}: {e}")

            self.rag_engine.vector_store = None
            self.update_pdf_list()
            self.update_chats_list()
            self.start_new_chat()
            self.set_chat_enabled(False)
            self.set_status(key="status_reset_done")
            
            QMessageBox.information(self, tr["sync_success_title"], tr["reset_success_msg"])

    # --- Document Management Functions ---

    def add_pdf_files(self):
        """Copies custom PDFs selected by the user to the local folder and indexes them."""
        tr = TRANSLATIONS[self.current_lang]
        files, _ = QFileDialog.getOpenFileNames(
            self,
            tr["select_pdf_title"],
            "",
            "PDF Files (*.pdf)"
        )
        if not files:
            return
            
        os.makedirs(self.rag_engine.documents_dir, exist_ok=True)
        copied = 0
        
        for file in files:
            dest = os.path.join(self.rag_engine.documents_dir, os.path.basename(file))
            try:
                shutil.copy(file, dest)
                copied += 1
            except Exception as e:
                QMessageBox.warning(self, tr["error_title"], f"{os.path.basename(file)}: {e}")
                
        if copied > 0:
            self.update_pdf_list()
            self.run_indexing(force=True, manual=False)

    def remove_selected_pdf(self):
        """Removes the selected PDF from local storage and rebuilds the index."""
        current_item = self.pdf_list.currentItem()
        if not current_item:
            return
            
        filename = current_item.text()
        tr = TRANSLATIONS[self.current_lang]
        if filename in [tr["empty_docs_list"], "پوشه خالی است (فایل pdf پیدا نشد)", "Directory is empty (No PDF files found)"]:
            return
            
        reply = QMessageBox.question(
            self,
            tr["delete_pdf_title"],
            tr["delete_pdf_msg"].format(filename=filename),
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            filepath = os.path.join(self.rag_engine.documents_dir, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    QMessageBox.warning(self, tr["error_title"], f"{e}")
                    return
            
            self.update_pdf_list()
            self.run_indexing(force=True, manual=False)

    # --- Help & About Dialogs ---

    def show_help_dialog(self):
        """Opens the Usage Guide dialog."""
        lang = self.current_lang
        tr = TRANSLATIONS[lang]

        dialog = QDialog(self)
        dialog.setWindowTitle(tr["help_dialog_title"])
        dialog.setLayoutDirection(Qt.LayoutDirection.RightToLeft if lang == "fa" else Qt.LayoutDirection.LeftToRight)
        logo_path = os.path.join(self.rag_engine.base_dir, "logo.jpg")
        if os.path.exists(logo_path):
            dialog.setWindowIcon(QIcon(logo_path))
        dialog.setMinimumWidth(520)
        dialog.setMinimumHeight(480)
        dialog.setStyleSheet(self.styleSheet())

        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(14)

        title_label = QLabel(f"<h2>{tr['help_dialog_title']}</h2>")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)

        highlight_text = (
            "&#x2728; قابل استفاده برای جستوجو و پاسخ دهی هوشمند بر اساس اسناد استاندارد متنی"
            if lang == "fa" else
            "&#x2728; Intelligent search & QA powered by local document processing"
        )
        highlight_label = QLabel(
            f"<div style='background-color:#3b1f6e; border-radius:8px; padding:10px 14px;'>"
            f"<span style='color:#c4b5fd; font-size:10.5pt; font-weight:bold;'>"
            f"{highlight_text}"
            f"</span></div>"
        )
        highlight_label.setTextFormat(Qt.RichText)
        highlight_label.setWordWrap(True)
        layout.addWidget(highlight_label)

        if lang == "fa":
            help_text = (
                "<b>&#x2460; افزودن اسناد PDF</b><br>"
                "از نوار کناری (Sidebar) بر روی دکمه <b>«افزودن سند»</b> کلیک کنید و فایل‌های PDF "
                "متنی (غیر اسکنی) مورد نظر خود را انتخاب کنید. برنامه به‌صورت خودکار اسناد را "
                "نمایه‌سازی (Index) می‌کند.<br><br>"
                "<b>&#x2461; پرسیدن سوال</b><br>"
                "سوال خود را به زبان فارسی یا انگلیسی در کادر پایین صفحه تایپ کنید و کلید <b>Enter</b> یا دکمه "
                "<b>«ارسال سوال»</b> را بزنید. برای درج خط جدید، از <b>Shift+Enter</b> استفاده کنید.<br><br>"
                "<b>&#x2462; مشاهده پاسخ و منابع</b><br>"
                "دستیار نهانجو پاسخ را به همراه منابع استخراج‌شده (نام سند و شماره صفحه) نمایش "
                "می‌دهد.<br><br>"
                "<b>&#x2463; مدیریت گفتگوها</b><br>"
                "تاریخچه گفتگوها به‌صورت خودکار ذخیره می‌شود. از بخش <b>«گفتگوها»</b> در نوار کناری "
                "می‌توانید چت‌های قبلی را بارگذاری یا حذف کنید.<br><br>"
                "<b>&#x2464; همگام‌سازی اسناد</b><br>"
                "پس از افزودن یا حذف اسناد، دکمه <b>«همگام‌سازی اسناد»</b> را بزنید تا پایگاه داده "
                "برداری به‌روزرسانی شود.<br><br>"
                "<b>&#x2465; پاکسازی کامل (Factory Reset)</b><br>"
                "دکمه <b>«پاکسازی»</b> تمام چت‌ها، اسناد و ایندکس‌ها را حذف کرده و برنامه را به "
                "حالت اولیه باز می‌گرداند.<br><br>"
                "<hr>"
                "<b>&#x26A0; نکات مهم:</b><br>"
                "&#x2022; این برنامه کاملاً آفلاین است و به اینترنت نیاز ندارد.<br>"
                "&#x2022; فایل‌های PDF باید متنی (Text-based) باشند.<br>"
                "&#x2022; مدل هوش مصنوعی ممکن است در برخی موارد پاسخ‌های نادرست تولید کند."
            )
        else:
            help_text = (
                "<b>&#x2460; Add PDF Documents</b><br>"
                "Click <b>\"Add Document\"</b> in the sidebar to select text-based PDF files. The application automatically indexes your documents.<br><br>"
                "<b>&#x2461; Ask Questions</b><br>"
                "Type your question in the text box at the bottom and press <b>Enter</b> or click <b>\"Send Question\"</b>. Use <b>Shift+Enter</b> for a new line.<br><br>"
                "<b>&#x2462; View Answers & Citations</b><br>"
                "Nahanjoo streams the response along with extracted source citations (document name & page numbers).<br><br>"
                "<b>&#x2463; Manage Conversations</b><br>"
                "Chat histories are saved automatically. Access or delete past sessions from the <b>\"Conversations\"</b> sidebar.<br><br>"
                "<b>&#x2464; Synchronize Documents</b><br>"
                "After adding or deleting documents, click <b>\"Sync Documents\"</b> to update the vector database index.<br><br>"
                "<b>&#x2465; Factory Reset</b><br>"
                "Clicking <b>\"Factory Reset\"</b> clears all chats, documents, and cached indices.<br><br>"
                "<hr>"
                "<b>&#x26A0; Important Notes:</b><br>"
                "&#x2022; 100% offline — no internet connection required.<br>"
                "&#x2022; PDFs must be text-based (scanned image PDFs are not supported).<br>"
                "&#x2022; AI models may occasionally produce inaccuracies. Always verify important details."
            )

        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setFrameShape(QFrame.NoFrame)
        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 8, 0)

        help_label = QLabel(help_text)
        help_label.setWordWrap(True)
        help_label.setTextFormat(Qt.RichText)
        help_label.setAlignment(Qt.AlignJustify if lang == "fa" else Qt.AlignLeft)
        help_label.setStyleSheet("line-height: 1.6; font-size: 10pt;")
        content_layout.addWidget(help_label)
        content_layout.addStretch()
        scroll_area.setWidget(content_widget)
        layout.addWidget(scroll_area, 1)

        close_btn = QPushButton(tr["close_btn"])
        close_btn.setCursor(Qt.PointingHandCursor)
        close_btn.clicked.connect(dialog.accept)
        layout.addWidget(close_btn)

        dialog.exec()

    def show_about_dialog(self):
        """Opens the About dialog with project details and clickable links."""
        lang = self.current_lang
        tr = TRANSLATIONS[lang]

        dialog = QDialog(self)
        dialog.setWindowTitle(tr["about_dialog_title"])
        dialog.setLayoutDirection(Qt.LayoutDirection.RightToLeft if lang == "fa" else Qt.LayoutDirection.LeftToRight)
        logo_path = os.path.join(self.rag_engine.base_dir, "logo.jpg")
        if os.path.exists(logo_path):
            dialog.setWindowIcon(QIcon(logo_path))
        dialog.setMinimumWidth(500)
        dialog.setStyleSheet(self.styleSheet())

        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(14)

        dialog_title_text = "<h2>نهانجو (Nahanjoo) — نسخه ۱.۰</h2>" if lang == "fa" else "<h2>Nahanjoo — Version 1.0</h2>"
        title_label = QLabel(dialog_title_text)
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)

        subtitle_text = (
            "پروژه کارشناسی دانشگاه آزاد سنندج &nbsp;|&nbsp; ژیوار سجادی"
            if lang == "fa" else
            "Bachelor of Computer Engineering Capstone Project &nbsp;|&nbsp; Azad University of Sanandaj &nbsp;|&nbsp; Zhiwar Sajadi"
        )
        subtitle_label = QLabel(
            f"<div style='text-align:center; color:#94a3b8; font-size:9pt;'>{subtitle_text}</div>"
        )
        subtitle_label.setTextFormat(Qt.RichText)
        subtitle_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(subtitle_label)

        highlight_text = (
            "&#x2728; قابل استفاده برای جستوجو و پاسخ دهی هوشمند بر اساس اسناد استاندارد متنی"
            if lang == "fa" else
            "&#x2728; Intelligent search & QA powered by local document processing"
        )
        highlight_label = QLabel(
            f"<div style='background-color:#3b1f6e; border-radius:8px; padding:10px 14px;'>"
            f"<span style='color:#c4b5fd; font-size:10.5pt; font-weight:bold;'>{highlight_text}</span></div>"
        )
        highlight_label.setTextFormat(Qt.RichText)
        highlight_label.setWordWrap(True)
        layout.addWidget(highlight_label)

        if lang == "fa":
            desc_text = (
                "نهانجو یک سیستم چت دسکتاپ کاملاً آفلاین و محلی است که با استفاده از فناوری "
                "بازیابی اطلاعات تقویت‌شده (RAG) به کاربر امکان می‌دهد از اسناد PDF خود "
                "سوال بپرسد و پاسخ هوشمند دریافت کند.<br><br>"
                "<b>فناوری‌های مورد استفاده:</b><br>"
                "&#x2022; مدل زبانی: <b>Qwen 2.5-3B-Instruct (GGUF Q4_K_M)</b> — اجرا شده روی CPU<br>"
                "&#x2022; تعبیه‌سازی متن: <b>paraphrase-multilingual-MiniLM-L12-v2</b><br>"
                "&#x2022; پایگاه داده برداری: <b>FAISS</b> — جستجوی شباهت سریع<br>"
                "&#x2022; رابط کاربری: <b>PySide6 (Qt for Python)</b><br>"
                "&#x2022; استخراج متن PDF: <b>PyMuPDF (fitz)</b><br><br>"
                "<b>مشخصات نسخه:</b><br>"
                "&#x2022; نسخه: <b>1.0.0</b> — نسخه نهایی پروژه کارشناسی<br>"
                "&#x2022; مجوز: MIT License (متن‌باز و آزاد)<br><br>"
                "توسعه‌دهنده: <a href='https://github.com/ZhiwarSajadi'><b>Zhiwar Sajadi (ژیوار سجادی)</b></a><br>"
                "استاد راهنما: دکتر <a href='https://scholar.google.com/citations?user=BgY3ap0AAAAJ&amp;hl=en'><b>Keyhan Khamforoosh (کیهان خامفروش)</b></a>"
            )
        else:
            desc_text = (
                "Nahanjoo is a 100% local, offline desktop RAG application enabling users to query their PDF documents with source-cited accuracy.<br><br>"
                "<b>Technologies Used:</b><br>"
                "&#x2022; Language Model: <b>Qwen 2.5-3B-Instruct (GGUF Q4_K_M)</b> — CPU Execution<br>"
                "&#x2022; Text Embeddings: <b>paraphrase-multilingual-MiniLM-L12-v2</b><br>"
                "&#x2022; Vector Store: <b>FAISS</b> — Fast similarity search<br>"
                "&#x2022; User Interface: <b>PySide6 (Qt for Python)</b> — Dual Persian/English RTL & LTR support<br>"
                "&#x2022; PDF Parser: <b>PyMuPDF (fitz)</b><br><br>"
                "<b>Release Specifications:</b><br>"
                "&#x2022; Version: <b>1.0.0</b> — Capstone Project Release<br>"
                "&#x2022; License: MIT License (Open Source)<br><br>"
                "Developer: <a href='https://github.com/ZhiwarSajadi'><b>Zhiwar Sajadi (ژیوار سجادی)</b></a><br>"
                "Academic Supervisor: Dr. <a href='https://scholar.google.com/citations?user=BgY3ap0AAAAJ&amp;hl=en'><b>Keyhan Khamforoosh (کیهان خامفروش)</b></a>"
            )

        desc_label = QLabel(desc_text)
        desc_label.setWordWrap(True)
        desc_label.setOpenExternalLinks(True)
        desc_label.setTextFormat(Qt.RichText)
        desc_label.setAlignment(Qt.AlignJustify if lang == "fa" else Qt.AlignLeft)
        desc_label.setStyleSheet("font-size: 10pt; line-height: 1.6;")
        layout.addWidget(desc_label)

        close_btn = QPushButton(tr["close_btn"])
        close_btn.setCursor(Qt.PointingHandCursor)
        close_btn.clicked.connect(dialog.accept)
        layout.addWidget(close_btn)

        dialog.exec()

    # --- Close Override to release memory ---

    def closeEvent(self, event):
        """Strictly terminates all running background QThreads to prevent zombie processes."""
        if hasattr(self, 'index_worker') and self.index_worker.isRunning():
            self.index_worker.terminate()
            self.index_worker.wait()
        if hasattr(self, 'query_worker') and self.query_worker.isRunning():
            self.query_worker.terminate()
            self.query_worker.wait()
            
        # Releasing LLM model memory explicitly
        if hasattr(self.rag_engine, 'llm') and self.rag_engine.llm is not None:
            del self.rag_engine.llm
            self.rag_engine.llm = None
            
        event.accept()
