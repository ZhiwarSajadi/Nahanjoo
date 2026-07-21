# -*- coding: utf-8 -*-
"""
Nahanjoo App - Main Entry Point
Author: Zhiwar Sajadi
Description: Initializes directory environments and launches the PySide6 RTL desktop GUI app.
Copyright (c) 2026 Zhiwar Sajadi. All rights reserved.
Licensed under the MIT License.
"""

import os
import sys
import site

# Prevent global user site-packages (e.g. C:\Users\<user>\AppData\Roaming\Python\...)
# from polluting sys.path and overriding local dependencies with outdated host versions.
site.ENABLE_USER_SITE = False
user_site = getattr(site, 'USER_SITE', None)
sys.path = [
    p for p in sys.path
    if (not user_site or not p.startswith(user_site))
    and 'appdata\\roaming\\python' not in p.lower()
]

# Inject script directory to sys.path to support Python Embedded environments
base_dir_script = os.path.dirname(os.path.abspath(__file__))
if base_dir_script not in sys.path:
    sys.path.insert(0, base_dir_script)

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon

from rag_engine import RAGEngine
from gui import NahanjooGUI

def get_base_dir():
    """Returns the base directory of the application.
    Handles running as a script and running as a frozen PyInstaller executable.
    """
    if getattr(sys, 'frozen', False):
        # Running as compiled .exe
        # For a one-file bundler (or relative directory packaging), we want the folder containing the .exe
        return os.path.dirname(sys.executable)
    else:
        # Running in development mode (as python main.py)
        return os.path.dirname(os.path.abspath(__file__))

def main():
    base_dir = get_base_dir()
    
    # Define and create core folders if they don't exist
    documents_dir = os.path.join(base_dir, "Documents")
    models_dir = os.path.join(base_dir, "Models")
    chats_dir = os.path.join(base_dir, "Chats")
    os.makedirs(documents_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(chats_dir, exist_ok=True)

    # Initialize RAG Engine with correct base directory
    rag_engine = RAGEngine(base_dir=base_dir)

    # Initialize Qt Application
    app = QApplication(sys.argv)
    
    # Set application icon
    logo_path = os.path.join(base_dir, "logo.jpg")
    if os.path.exists(logo_path):
        app.setWindowIcon(QIcon(logo_path))
    
    # Set layout direction globally to RTL for Persian text handling
    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

    # Create and show Main Window
    window = NahanjooGUI(rag_engine=rag_engine)
    window.show()

    # Run event loop
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
