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

    def __init__(self, rag_engine: RAGEngine, question: str):
        super().__init__()
        self.rag_engine = rag_engine
        self.question = question
        self._is_running = True

    def run(self):
        try:
            self.rag_engine.initialize_llm()
            
            sources = []
            full_answer = ""
            
            for chunk in self.rag_engine.query(self.question):
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
                    err_msg = chunk.get("text") or chunk.get("answer") or "خطایی رخ داد."
                    self.error_occurred.emit(err_msg)
                    return
            
            if self._is_running:
                full_answer_fixed = full_answer.replace("نیمسلا", "نیمسال")
                self.finished.emit(full_answer_fixed, sources)
                
        except Exception as e:
            self.error_occurred.emit(f"خطا در پردازش سوال: {str(e)}")

    def terminate_query(self):
        self._is_running = False


# Custom Chat Bubble Widget
class ChatBubble(QFrame):
    def __init__(self, text: str, is_user: bool, sources: list = None, parent=None):
        super().__init__(parent)
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
        self.text_label.repaint()  # Force immediate repaint on the screen for real-time streaming

    def add_sources(self, sources):
        if not sources:
            return
        source_header = QLabel("<b>منابع استخراج شده:</b>", self)
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

        sources_text = ""
        for s_name, pages in unique_sources.items():
            pages_str = ", ".join(str(p) for p in sorted(pages))
            sources_text += f"• {s_name} (صفحه {pages_str})<br>"

        sources_label = QLabel(sources_text, self)
        sources_label.setWordWrap(True)
        sources_label.setStyleSheet("color: #94a3b8; font-size: 8.5pt;")
        self.layout().addWidget(sources_label)


class NahanjooGUI(QMainWindow):
    def __init__(self, rag_engine: RAGEngine):
        super().__init__()
        self.rag_engine = rag_engine
        
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
        """)

    def init_ui(self):
        # Create Menu Bar
        menubar = self.menuBar()
        help_menu = menubar.addMenu("راهنما")
        usage_action = help_menu.addAction("راهنمای استفاده")
        usage_action.triggered.connect(self.show_help_dialog)
        help_menu.addSeparator()
        about_action = help_menu.addAction("درباره برنامه")
        about_action.triggered.connect(self.show_about_dialog)

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
        chats_title = QLabel("گفتگوها (Chats)")
        chats_title.setProperty("class", "SidebarTitle")
        chats_title.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(chats_title)

        self.new_chat_button = QPushButton("گفتگوی جدید")
        self.new_chat_button.setCursor(Qt.PointingHandCursor)
        self.new_chat_button.clicked.connect(self.start_new_chat)
        sidebar_layout.addWidget(self.new_chat_button)

        self.chats_list = QListWidget()
        self.chats_list.itemClicked.connect(self.load_chat_item)
        sidebar_layout.addWidget(self.chats_list, 2)  # Stretch factor 2

        self.delete_chat_button = QPushButton("حذف گفتگو")
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
        docs_title = QLabel("پوشه اسناد (Documents)")
        docs_title.setProperty("class", "SidebarTitle")
        docs_title.setAlignment(Qt.AlignCenter)
        sidebar_layout.addWidget(docs_title)

        self.pdf_list = QListWidget()
        sidebar_layout.addWidget(self.pdf_list, 3)  # Stretch factor 3

        # Add & Remove PDF buttons
        doc_buttons_layout = QHBoxLayout()
        doc_buttons_layout.setSpacing(6)
        
        self.add_pdf_button = QPushButton("افزودن سند")
        self.add_pdf_button.setCursor(Qt.PointingHandCursor)
        self.add_pdf_button.clicked.connect(self.add_pdf_files)
        doc_buttons_layout.addWidget(self.add_pdf_button)

        self.remove_pdf_button = QPushButton("حذف سند")
        self.remove_pdf_button.setStyleSheet("background-color: #ef4444;")
        self.remove_pdf_button.setCursor(Qt.PointingHandCursor)
        self.remove_pdf_button.clicked.connect(self.remove_selected_pdf)
        doc_buttons_layout.addWidget(self.remove_pdf_button)

        sidebar_layout.addLayout(doc_buttons_layout)

        # Sync/Refresh Button
        self.sync_button = QPushButton("همگام‌سازی اسناد")
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
        self.status_label = QLabel("وضعیت: در انتظار...")
        self.status_label.setObjectName("StatusLabel")
        self.status_label.setWordWrap(True)
        sidebar_layout.addWidget(self.status_label)

        # Factory Reset Button
        self.reset_button = QPushButton("پاکسازی")
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

        # Header
        header_frame = QFrame()
        header_frame.setObjectName("HeaderFrame")
        header_layout = QVBoxLayout(header_frame)
        header_layout.setContentsMargins(20, 12, 20, 12)
        header_layout.setSpacing(4)

        header_title = QLabel("دستیار هوشمند نهانجو")
        header_title.setObjectName("HeaderTitle")
        header_layout.addWidget(header_title)

        self.header_subtitle = QLabel("پایگاه دانش محلی 100% آفلاین (مدل Qwen 2.5 3B)")
        self.header_subtitle.setObjectName("HeaderSubtitle")
        header_layout.addWidget(self.header_subtitle)

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
        self.chat_input.setPlaceholderText("سوال خود را به زبان فارسی درباره اسناد بپرسید...")
        self.chat_input.setFixedHeight(45)
        self.chat_input.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        # Enable Enter key to send message (Shift+Enter for newline)
        self.chat_input.installEventFilter(self)
        input_row_layout.addWidget(self.chat_input)

        self.send_button = QPushButton("ارسال سوال")
        self.send_button.setCursor(Qt.PointingHandCursor)
        self.send_button.setFixedHeight(45)
        self.send_button.clicked.connect(self.send_question)
        input_row_layout.addWidget(self.send_button)

        input_area_container_layout.addLayout(input_row_layout)

        # Permanent Disclaimer Label at bottom of input area
        self.disclaimer_label = QLabel("هوش مصنوعی نهانجو ممکن است اشتباه کند، صحت اطلاعات را ارزیابی کنید.")
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
                self.pdf_list.addItem("پوشه خالی است (فایل pdf پیدا نشد)")

    def startup_check(self):
        """Checks model assets and runs indexing in background on startup."""
        # Ensure chat is disabled during initialization. load_chat_by_id() and
        # start_new_chat() called during __init__ may have re-enabled it. The
        # on_index_finished() callback will re-enable chat once the engine is ready.
        self.set_chat_enabled(False)
        self.update_pdf_list()
        
        models_ok, err_msg = self.rag_engine.check_models_exist()
        if not models_ok:
            self.status_label.setText("خطا: مدل‌ها دانلود نشده‌اند.")
            QMessageBox.critical(
                self, 
                "مدل‌ها یافت نشدند", 
                f"فایل مدل‌ها در پوشه Models وجود ندارد.\n\nجزئیات: {err_msg}\n\nلطفاً اسکریپت download_models.py را اجرا کنید."
            )
            return

        # Models exist. Trigger checking/indexing in the background
        self.run_indexing(force=False)

    def run_indexing(self, force: bool = False, manual: bool = False):
        """Starts background indexing thread."""
        self.is_manual_sync = manual
        self.sync_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.status_label.setText("در حال آماده‌سازی موتور هوش مصنوعی...")

        self.index_worker = IndexWorker(self.rag_engine, force=force)
        self.index_worker.progress.connect(self.on_index_progress)
        self.index_worker.finished.connect(self.on_index_finished)
        self.index_worker.start()

    @Slot(str)
    def on_index_progress(self, message: str):
        self.status_label.setText(message)

    @Slot(str, bool)
    def on_index_finished(self, status: str, success: bool):
        self.progress_bar.setVisible(False)
        self.sync_button.setEnabled(True)
        self.update_pdf_list()

        if success:
            self.set_chat_enabled(True)
            if status == "loaded":
                self.status_label.setText("وضعیت: پایگاه داده اسناد بارگذاری شد (آماده).")
            elif status == "rebuilt":
                self.status_label.setText("وضعیت: نمایه‌سازی اسناد با موفقیت انجام شد (آماده).")
                if self.is_manual_sync:
                    QMessageBox.information(self, "موفقیت", "نمایه‌سازی و همگام‌سازی اسناد با موفقیت انجام شد.")
        else:
            self.status_label.setText("خطا در راه‌اندازی پایگاه دانش.")
            QMessageBox.warning(self, "خطا در نمایه‌سازی", status)

    def add_message_bubble_to_ui(self, text: str, is_user: bool, sources: list = None) -> QWidget:
        """Helper to create and add a styled chat bubble to the scroll layout."""
        # Create container to hold the bubble and align it correctly
        container = QWidget()
        container_layout = QHBoxLayout(container)
        container_layout.setContentsMargins(0, 0, 0, 0)

        # Create custom bubble
        bubble = ChatBubble(text, is_user, sources, self)
        
        # RTL Alignment rules:
        if is_user:
            container_layout.addWidget(bubble)
            container_layout.addStretch()  # Stretch pushes the bubble to the right
        else:
            container_layout.addStretch()  # Stretch pushes the bubble to the left
            container_layout.addWidget(bubble)

        # Insert bubble before the last item (which is the stretch spacer)
        count = self.chat_history_layout.count()
        self.chat_history_layout.insertWidget(count - 1, container)
        
        # Scroll to bottom
        self.scroll_to_bottom()
        return container


    def scroll_to_bottom(self):
        """Scrolls the chat area to the very bottom to show the latest messages."""
        if self.scroll_area.widget() and self.scroll_area.widget().layout():
            self.scroll_area.widget().layout().activate()  # Force Qt to calculate new height immediately
        self.scroll_area.verticalScrollBar().setValue(
            self.scroll_area.verticalScrollBar().maximum()
        )
        self.scroll_area.viewport().update()
        
        # Fallback deferred scroll to ensure layout settling
        QTimer.singleShot(50, lambda: self.scroll_area.verticalScrollBar().setValue(
            self.scroll_area.verticalScrollBar().maximum()
        ))

    def send_question(self):
        """Prepares and triggers the query background worker."""
        question_text = self.chat_input.toPlainText().strip()
        if not question_text:
            return

        # Clear input field
        self.chat_input.clear()

        # Append message to list & save current chat session
        self.current_messages.append({"role": "user", "content": question_text})
        self.save_current_chat()

        # Add User Bubble
        self.add_message_bubble_to_ui(question_text, is_user=True)

        # Disable input while processing
        self.set_chat_enabled(False)
        self.status_label.setText("در حال تولید پاسخ هوشمند...")

        # Add a placeholder "Thinking..." AI bubble to show progress
        self.typing_placeholder = self.add_message_bubble_to_ui(
            "<i>نهانجو در حال جستجو در اسناد و پاسخ‌دهی است... لطفاً شکیبا باشید.</i>", 
            is_user=False
        )

        # Setup streaming variables
        self.active_bubble = None
        self.active_text = ""
        self.active_sources = []

        # Start background query worker
        self.query_worker = QueryWorker(self.rag_engine, question_text)
        self.query_worker.sources_ready.connect(self.on_sources_ready)
        self.query_worker.new_token.connect(self.on_new_token)
        self.query_worker.finished.connect(self.on_query_finished)
        self.query_worker.error_occurred.connect(self.on_query_error)
        self.query_worker.start()

    @Slot(list)
    def on_sources_ready(self, sources):
        # Remove placeholder typing bubble
        if hasattr(self, 'typing_placeholder') and self.typing_placeholder:
            self.chat_history_layout.removeWidget(self.typing_placeholder)
            self.typing_placeholder.deleteLater()
            self.typing_placeholder = None

        self.active_sources = sources
        self.active_text = ""
        # Create active bubble immediately with loading text and sources list so the user can read sources while the model evaluates prompt
        self.active_bubble_container = self.add_message_bubble_to_ui("<i>در حال تحلیل اسناد و تولید پاسخ...</i>", is_user=False, sources=sources)
        self.active_bubble = self.active_bubble_container.findChild(ChatBubble)

    @Slot(str)
    def on_new_token(self, token):
        if self.active_bubble:
            # If this is the first token, clear the initial loading status text
            if self.active_text == "":
                self.active_bubble.update_text("")
            
            self.active_text += token
            # Fix typos on the fly in the display text
            display_text = self.active_text.replace("نیمسلا", "نیمسال")
            self.active_bubble.update_text(display_text)
            self.scroll_to_bottom()

    @Slot(str, list)
    def on_query_finished(self, final_answer, sources):
        # Enable input
        self.set_chat_enabled(True)
        self.status_label.setText("وضعیت: پایگاه داده اسناد آماده است.")

        if hasattr(self, 'typing_placeholder') and self.typing_placeholder:
            # Fallback: remove placeholder if on_sources_ready() was never called
            # (e.g., error occurred before sources were emitted)
            self.chat_history_layout.removeWidget(self.typing_placeholder)
            self.typing_placeholder.deleteLater()
            self.typing_placeholder = None

        # Finalize the active bubble text (sources were already added in on_sources_ready)
        if self.active_bubble:
            final_answer_fixed = final_answer.replace("نیمسلا", "نیمسال")
            self.active_bubble.update_text(final_answer_fixed)
            
            # Append answer to memory & save
            self.current_messages.append({"role": "assistant", "content": final_answer_fixed, "sources": sources})
            self.save_current_chat()
            self.scroll_to_bottom()
            
        self.active_bubble = None
        self.active_text = ""

    @Slot(str)
    def on_query_error(self, error_msg):
        self.set_chat_enabled(True)
        self.status_label.setText("خطایی رخ داد.")

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
        
        # Deselect current items in side list
        self.chats_list.blockSignals(True)
        self.chats_list.clearSelection()
        self.chats_list.blockSignals(False)

    def save_current_chat(self):
        """Saves current messages list to JSON on disk."""
        if not self.current_chat_id:
            self.current_chat_id = f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
        title = "گفتگوی جدید"
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
                    title = data.get("title", "گفتگوی بدون نام")
                    
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
            QMessageBox.critical(self, "خطا", f"خطا در بارگذاری گفتگو: {e}")

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
        
        reply = QMessageBox.question(
            self,
            "حذف گفتگو",
            "آیا از حذف این گفتگو اطمینان دارید؟",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            filepath = os.path.join(self.chats_dir, f"{chat_id}.json")
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    QMessageBox.warning(self, "خطا", f"امکان حذف فایل گفتگو وجود ندارد: {e}")
            
            if chat_id == self.current_chat_id:
                self.start_new_chat()
            
            self.update_chats_list()

    def factory_reset(self):
        """Performs a factory reset, clearing all chats, documents, and vector stores."""
        reply = QMessageBox.warning(
            self,
            "بازنشانی برنامه",
            "با انجام این عمل، برنامه با انجام بازنشانی و پاکسازی، تمام چت ها و اسناد افزوده شده را پاک میکند. آیا از انجام آن اطمینان دارید؟",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            # 1. Stop any background threads first
            if hasattr(self, 'index_worker') and self.index_worker.isRunning():
                self.index_worker.terminate()
                self.index_worker.wait()
            if hasattr(self, 'query_worker') and self.query_worker.isRunning():
                self.query_worker.terminate()
                self.query_worker.wait()

            # 2. Delete all files in Chats directory
            if os.path.exists(self.chats_dir):
                for filename in os.listdir(self.chats_dir):
                    filepath = os.path.join(self.chats_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting chat file {filename}: {e}")

            # 3. Delete all files in Documents directory
            if os.path.exists(self.rag_engine.documents_dir):
                for filename in os.listdir(self.rag_engine.documents_dir):
                    filepath = os.path.join(self.rag_engine.documents_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting doc file {filename}: {e}")

            # 4. Delete all files in VectorStore directory
            if os.path.exists(self.rag_engine.vector_store_dir):
                for filename in os.listdir(self.rag_engine.vector_store_dir):
                    filepath = os.path.join(self.rag_engine.vector_store_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            os.remove(filepath)
                    except Exception as e:
                        print(f"Error deleting index file {filename}: {e}")

            # 5. Clear RAG engine vector store in memory
            self.rag_engine.vector_store = None

            # 6. Clear and refresh UI components
            self.update_pdf_list()
            self.update_chats_list()
            self.start_new_chat()
            self.set_chat_enabled(False)
            self.status_label.setText("وضعیت: برنامه بازنشانی شد. لطفاً اسناد جدید اضافه کنید.")
            
            QMessageBox.information(self, "موفقیت", "بازنشانی برنامه با موفقیت انجام شد.")

    # --- Document Management Functions ---

    def add_pdf_files(self):
        """Copies custom PDFs selected by the user to the local folder and indexes them."""
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "انتخاب اسناد PDF",
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
                QMessageBox.warning(self, "خطا", f"خطا در کپی {os.path.basename(file)}: {e}")
                
        if copied > 0:
            self.update_pdf_list()
            self.run_indexing(force=True, manual=False)

    def remove_selected_pdf(self):
        """Removes the selected PDF from local storage and rebuilds the index."""
        current_item = self.pdf_list.currentItem()
        if not current_item:
            return
            
        filename = current_item.text()
        if filename == "پوشه خالی است (فایل pdf پیدا نشد)":
            return
            
        reply = QMessageBox.question(
            self,
            "حذف سند",
            f"آیا از حذف سند '{filename}' و به‌روزرسانی پایگاه دانش مطمئن هستید؟",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            filepath = os.path.join(self.rag_engine.documents_dir, filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    QMessageBox.warning(self, "خطا", f"خطا در حذف فایل: {e}")
                    return
            
            self.update_pdf_list()
            self.run_indexing(force=True, manual=False)

    # --- Help & About Dialogs ---

    def show_help_dialog(self):
        """Opens the Usage Guide (راهنمای استفاده) dialog."""
        dialog = QDialog(self)
        dialog.setWindowTitle("راهنمای استفاده از نهانجو")
        logo_path = os.path.join(self.rag_engine.base_dir, "logo.jpg")
        if os.path.exists(logo_path):
            dialog.setWindowIcon(QIcon(logo_path))
        dialog.setMinimumWidth(520)
        dialog.setMinimumHeight(480)
        dialog.setStyleSheet(self.styleSheet())

        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(14)

        title_label = QLabel("<h2>راهنمای استفاده از نهانجو</h2>")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)

        # --- Highlighted capability phrase (mandatory requirement) ---
        highlight_label = QLabel(
            "<div style=\'background-color:#3b1f6e; border-radius:8px; padding:10px 14px;\'>"
            "<span style=\'color:#c4b5fd; font-size:10.5pt; font-weight:bold;\'>"
            "&#x2728; قابل استفاده برای جستوجو و پاسخ دهی هوشمند بر اساس اسناد استاندارد متنی"
            "</span></div>"
        )
        highlight_label.setTextFormat(Qt.RichText)
        highlight_label.setWordWrap(True)
        layout.addWidget(highlight_label)

        help_text = (
            "<b>&#x2460; افزودن اسناد PDF</b><br>"
            "از نوار کناری (Sidebar) بر روی دکمه <b>«افزودن سند»</b> کلیک کنید و فایل‌های PDF "
            "متنی (غیر اسکنی) مورد نظر خود را انتخاب کنید. برنامه به‌صورت خودکار اسناد را "
            "نمایه‌سازی (Index) می‌کند.<br><br>"

            "<b>&#x2461; پرسیدن سوال</b><br>"
            "سوال خود را به زبان فارسی در کادر پایین صفحه تایپ کنید و کلید <b>Enter</b> یا دکمه "
            "<b>«ارسال سوال»</b> را بزنید. برای درج خط جدید، از <b>Shift+Enter</b> استفاده کنید.<br><br>"

            "<b>&#x2462; مشاهده پاسخ و منابع</b><br>"
            "دستیار نهانجو پاسخ را به همراه منابع استخراج‌شده (نام سند و شماره صفحه) نمایش "
            "می‌دهد. می‌توانید از صحت پاسخ با مراجعه به صفحه ذکر شده اطمینان حاصل کنید.<br><br>"

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
            "&#x2022; فایل‌های PDF باید متنی (Text-based) باشند. فایل‌های اسکنی (تصویری) پشتیبانی نمی‌شوند.<br>"
            "&#x2022; مدل هوش مصنوعی ممکن است در برخی موارد پاسخ‌های نادرست تولید کند (AI Hallucination). "
            "همیشه پاسخ را با منابع ذکر شده راستی‌آزمایی کنید."
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
        help_label.setAlignment(Qt.AlignJustify)
        help_label.setStyleSheet("line-height: 1.6; font-size: 10pt;")
        content_layout.addWidget(help_label)
        content_layout.addStretch()
        scroll_area.setWidget(content_widget)
        layout.addWidget(scroll_area, 1)

        close_btn = QPushButton("بستن")
        close_btn.setCursor(Qt.PointingHandCursor)
        close_btn.clicked.connect(dialog.accept)
        layout.addWidget(close_btn)

        dialog.exec()

    def show_about_dialog(self):
        """Opens the About dialog with project details and clickable links."""
        dialog = QDialog(self)
        dialog.setWindowTitle("درباره نهانجو - Nahanjoo v1.0")
        logo_path = os.path.join(self.rag_engine.base_dir, "logo.jpg")
        if os.path.exists(logo_path):
            dialog.setWindowIcon(QIcon(logo_path))
        dialog.setMinimumWidth(500)
        dialog.setStyleSheet(self.styleSheet())

        layout = QVBoxLayout(dialog)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(14)

        title_label = QLabel("<h2>نهانجو (Nahanjoo) — نسخه ۱.۰</h2>")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)

        subtitle_label = QLabel(
            "<div style='text-align:center; color:#94a3b8; font-size:9pt;'>"
            "پروژه کارشناسی دانشگاه آزاد سنندج &nbsp;|&nbsp; ژیوار سجادی"
            "</div>"
        )
        subtitle_label.setTextFormat(Qt.RichText)
        subtitle_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(subtitle_label)

        # --- Highlighted capability phrase (mandatory requirement) ---
        highlight_label = QLabel(
            "<div style='background-color:#3b1f6e; border-radius:8px; padding:10px 14px;'>"
            "<span style='color:#c4b5fd; font-size:10.5pt; font-weight:bold;'>"
            "&#x2728; قابل استفاده برای جستوجو و پاسخ دهی هوشمند بر اساس اسناد استاندارد متنی"
            "</span></div>"
        )
        highlight_label.setTextFormat(Qt.RichText)
        highlight_label.setWordWrap(True)
        layout.addWidget(highlight_label)

        desc_text = (
            "نهانجو یک سیستم چت دسکتاپ کاملاً آفلاین و محلی است که با استفاده از فناوری "
            "بازیابی اطلاعات تقویت‌شده (RAG) به کاربر امکان می‌دهد از اسناد PDF فارسی خود "
            "سوال بپرسد و پاسخ هوشمند دریافت کند.<br><br>"

            "<b>فناوری‌های مورد استفاده:</b><br>"
            "&#x2022; مدل زبانی: <b>Qwen 2.5-3B-Instruct (GGUF Q4_K_M)</b> — اجرا شده روی CPU<br>"
            "&#x2022; تعبیه‌سازی متن: <b>paraphrase-multilingual-MiniLM-L12-v2</b><br>"
            "&#x2022; پایگاه داده برداری: <b>FAISS</b> — جستجوی شباهت سریع<br>"
            "&#x2022; رابط کاربری: <b>PySide6 (Qt for Python)</b> — طراحی RTL فارسی<br>"
            "&#x2022; استخراج متن PDF: <b>PyMuPDF (fitz)</b><br><br>"

            "<b>مشخصات نسخه:</b><br>"
            "&#x2022; نسخه: <b>1.0.0</b> — نسخه نهایی پروژه کارشناسی<br>"
            "&#x2022; مجوز: MIT License (متن‌باز و آزاد)<br>"


            "توسعه‌دهنده: <a href='https://github.com/ZhiwarSajadi'><b>Zhiwar Sajadi (ژیوار سجادی)</b></a><br>"
            "استاد راهنما: دکتر <a href='https://scholar.google.com/citations?user=BgY3ap0AAAAJ&amp;hl=en'><b>Keyhan Khamforoosh (کیهان خامفروش)</b></a>"
        )

        desc_label = QLabel(desc_text)
        desc_label.setWordWrap(True)
        desc_label.setOpenExternalLinks(True)
        desc_label.setTextFormat(Qt.RichText)
        desc_label.setAlignment(Qt.AlignJustify)
        desc_label.setStyleSheet("font-size: 10pt; line-height: 1.6;")
        layout.addWidget(desc_label)

        close_btn = QPushButton("بستن")
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
