import sys
import os
sys.path.insert(0, r'c:\Users\Admin\OneDrive\Desktop\fairlens\backend')
os.chdir(r'c:\Users\Admin\OneDrive\Desktop\fairlens\backend')

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
