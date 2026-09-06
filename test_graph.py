import ast
import sys

def check_syntax(file_path):
    with open(file_path, 'r') as f:
        source = f.read()
    try:
        ast.parse(source)
        print("Syntax OK")
    except SyntaxError as e:
        print(f"Syntax Error: {e}")
        sys.exit(1)

check_syntax("backend/app/api/graph.py")
