"""Tree-sitter AST parser for multi-language code analysis.

Extracts symbols (classes, functions, methods, imports) from source files
and builds a symbol table for the code graph.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path

import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Parser, Node

logger = logging.getLogger(__name__)

# ─── Language Setup ──────────────────────────────────────────────────────

PYTHON_LANGUAGE = Language(tspython.language())
JAVASCRIPT_LANGUAGE = Language(tsjavascript.language())
TYPESCRIPT_LANGUAGE = Language(tstypescript.language_typescript())
TSX_LANGUAGE = Language(tstypescript.language_tsx())

LANGUAGE_MAP: dict[str, Language] = {
    ".py": PYTHON_LANGUAGE,
    ".js": JAVASCRIPT_LANGUAGE,
    ".jsx": JAVASCRIPT_LANGUAGE,
    ".ts": TYPESCRIPT_LANGUAGE,
    ".tsx": TSX_LANGUAGE,
    ".mjs": JAVASCRIPT_LANGUAGE,
    ".cjs": JAVASCRIPT_LANGUAGE,
}

LANGUAGE_NAMES: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mjs": "javascript",
    ".cjs": "javascript",
}

# File patterns to skip
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".tox", ".mypy_cache",
    ".pytest_cache", "coverage", ".eggs", "egg-info",
}

SKIP_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
}


# ─── Data Structures ────────────────────────────────────────────────────

@dataclass
class ParsedSymbol:
    """A symbol extracted from source code."""

    name: str
    qualified_name: str
    symbol_type: str  # class, function, method, import, variable, etc.
    language: str
    file_path: str
    line_start: int
    line_end: int
    docstring: str | None = None
    signature: str | None = None
    source_code: str | None = None
    parent_qualified_name: str | None = None
    children: list["ParsedSymbol"] = field(default_factory=list)

    # For relationship building
    calls: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    bases: list[str] = field(default_factory=list)  # Inheritance


@dataclass
class ParsedFile:
    """Result of parsing a single file."""

    file_path: str
    language: str
    symbols: list[ParsedSymbol]
    imports: list[str]
    errors: list[str] = field(default_factory=list)


# ─── Parser ──────────────────────────────────────────────────────────────

class CodeParser:
    """Multi-language code parser using Tree-sitter."""

    def __init__(self) -> None:
        self._parsers: dict[str, Parser] = {}
        for ext, lang in LANGUAGE_MAP.items():
            parser = Parser(lang)
            self._parsers[ext] = parser

    def parse_repository(self, repo_path: str) -> list[ParsedFile]:
        """Parse all supported files in a repository."""
        root = Path(repo_path)
        if not root.exists():
            raise FileNotFoundError(f"Repository path not found: {repo_path}")

        results: list[ParsedFile] = []
        files = self._collect_files(root)

        for file_path in files:
            try:
                parsed = self.parse_file(str(file_path), str(root))
                if parsed and parsed.symbols:
                    results.append(parsed)
            except Exception as e:
                logger.warning(f"Failed to parse {file_path}: {e}")

        logger.info(
            f"Parsed {len(results)} files, "
            f"{sum(len(f.symbols) for f in results)} symbols"
        )
        return results

    def parse_file(self, file_path: str, repo_root: str) -> ParsedFile | None:
        """Parse a single source file."""
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext not in self._parsers:
            return None

        try:
            source = path.read_bytes()
        except (OSError, UnicodeDecodeError) as e:
            logger.warning(f"Cannot read {file_path}: {e}")
            return None

        # Skip very large files (>500KB)
        if len(source) > 500_000:
            logger.info(f"Skipping large file: {file_path} ({len(source)} bytes)")
            return None

        parser = self._parsers[ext]
        tree = parser.parse(source)
        language = LANGUAGE_NAMES[ext]
        rel_path = str(Path(file_path).relative_to(repo_root)).replace("\\", "/")

        source_text = source.decode("utf-8", errors="replace")

        if language == "python":
            symbols, imports = self._extract_python(tree.root_node, source_text, rel_path)
        elif language in ("javascript", "typescript"):
            symbols, imports = self._extract_js_ts(tree.root_node, source_text, rel_path, language)
        else:
            return None

        # Add module-level symbol
        module_name = rel_path.replace("/", ".").rsplit(".", 1)[0]
        module_symbol = ParsedSymbol(
            name=path.stem,
            qualified_name=module_name,
            symbol_type="module",
            language=language,
            file_path=rel_path,
            line_start=1,
            line_end=source_text.count("\n") + 1,
        )

        return ParsedFile(
            file_path=rel_path,
            language=language,
            symbols=[module_symbol] + symbols,
            imports=imports,
        )

    # ─── Python Extraction ───────────────────────────────────────────────

    def _extract_python(
        self, root: Node, source: str, file_path: str
    ) -> tuple[list[ParsedSymbol], list[str]]:
        """Extract symbols from a Python AST."""
        symbols: list[ParsedSymbol] = []
        imports: list[str] = []
        module_name = file_path.replace("/", ".").rsplit(".", 1)[0]

        for child in root.children:
            if child.type == "import_statement":
                imp = self._node_text(child, source)
                imports.append(imp)
            elif child.type == "import_from_statement":
                imp = self._node_text(child, source)
                imports.append(imp)
            elif child.type == "class_definition":
                cls = self._extract_python_class(child, source, file_path, module_name)
                if cls:
                    symbols.append(cls)
            elif child.type == "function_definition":
                func = self._extract_python_function(child, source, file_path, module_name)
                if func:
                    symbols.append(func)
            elif child.type == "decorated_definition":
                # Handle decorated classes/functions
                for sub in child.children:
                    if sub.type == "class_definition":
                        cls = self._extract_python_class(sub, source, file_path, module_name)
                        if cls:
                            # Extract decorator info
                            decorators = [
                                self._node_text(d, source)
                                for d in child.children
                                if d.type == "decorator"
                            ]
                            if any("app." in d or "router." in d for d in decorators):
                                cls.symbol_type = "endpoint"
                            symbols.append(cls)
                    elif sub.type == "function_definition":
                        func = self._extract_python_function(
                            sub, source, file_path, module_name
                        )
                        if func:
                            decorators = [
                                self._node_text(d, source)
                                for d in child.children
                                if d.type == "decorator"
                            ]
                            # Detect API endpoints
                            if any(
                                d_keyword in d
                                for d in decorators
                                for d_keyword in [
                                    "@app.", "@router.", "@api.",
                                    ".get(", ".post(", ".put(", ".delete(", ".patch(",
                                ]
                            ):
                                func.symbol_type = "endpoint"
                            symbols.append(func)

        return symbols, imports

    def _extract_python_class(
        self, node: Node, source: str, file_path: str, module_name: str
    ) -> ParsedSymbol | None:
        """Extract a Python class definition."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{module_name}.{name}"

        # Extract base classes
        bases: list[str] = []
        args_node = node.child_by_field_name("superclasses")
        if args_node:
            for arg in args_node.children:
                if arg.type not in ("(", ")", ","):
                    bases.append(self._node_text(arg, source))

        # Extract docstring
        docstring = self._extract_python_docstring(node, source)

        # Extract methods
        methods: list[ParsedSymbol] = []
        body = node.child_by_field_name("body")
        if body:
            for child in body.children:
                if child.type == "function_definition":
                    method = self._extract_python_function(
                        child, source, file_path, qualified_name
                    )
                    if method:
                        method.symbol_type = "method"
                        methods.append(method)
                elif child.type == "decorated_definition":
                    for sub in child.children:
                        if sub.type == "function_definition":
                            method = self._extract_python_function(
                                sub, source, file_path, qualified_name
                            )
                            if method:
                                method.symbol_type = "method"
                                methods.append(method)

        # Extract function calls within the class body
        calls = self._extract_calls(node, source)

        symbol = ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type="class",
            language="python",
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            docstring=docstring,
            signature=f"class {name}({', '.join(bases)})" if bases else f"class {name}",
            source_code=self._node_text(node, source),
            parent_qualified_name=module_name,
            children=methods,
            calls=calls,
            bases=bases,
        )

        return symbol

    def _extract_python_function(
        self, node: Node, source: str, file_path: str, parent_name: str
    ) -> ParsedSymbol | None:
        """Extract a Python function/method definition."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{parent_name}.{name}"

        # Extract parameters
        params_node = node.child_by_field_name("parameters")
        signature = f"def {name}{self._node_text(params_node, source)}" if params_node else f"def {name}()"

        # Extract return type
        return_node = node.child_by_field_name("return_type")
        if return_node:
            signature += f" -> {self._node_text(return_node, source)}"

        # Extract docstring
        docstring = self._extract_python_docstring(node, source)

        # Extract calls
        calls = self._extract_calls(node, source)

        return ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type="function",
            language="python",
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            docstring=docstring,
            signature=signature,
            source_code=self._node_text(node, source),
            parent_qualified_name=parent_name,
            calls=calls,
        )

    def _extract_python_docstring(self, node: Node, source: str) -> str | None:
        """Extract docstring from a Python class or function."""
        body = node.child_by_field_name("body")
        if not body or not body.children:
            return None
        first = body.children[0]
        if first.type == "expression_statement":
            expr = first.children[0] if first.children else None
            if expr and expr.type == "string":
                text = self._node_text(expr, source)
                # Strip quotes
                for quote in ['"""', "'''", '"', "'"]:
                    if text.startswith(quote) and text.endswith(quote):
                        return text[len(quote) : -len(quote)].strip()
        return None

    # ─── JavaScript/TypeScript Extraction ────────────────────────────────

    def _extract_js_ts(
        self, root: Node, source: str, file_path: str, language: str
    ) -> tuple[list[ParsedSymbol], list[str]]:
        """Extract symbols from JavaScript/TypeScript AST."""
        symbols: list[ParsedSymbol] = []
        imports: list[str] = []
        module_name = file_path.replace("/", ".").rsplit(".", 1)[0]

        for child in root.children:
            if child.type == "import_statement":
                imports.append(self._node_text(child, source))

            elif child.type in ("class_declaration", "class"):
                cls = self._extract_js_class(child, source, file_path, module_name, language)
                if cls:
                    symbols.append(cls)

            elif child.type in ("function_declaration", "function"):
                func = self._extract_js_function(child, source, file_path, module_name, language)
                if func:
                    symbols.append(func)

            elif child.type in ("export_statement", "export_default_declaration"):
                # Unwrap exported declarations
                for sub in child.children:
                    if sub.type in ("class_declaration", "class"):
                        cls = self._extract_js_class(sub, source, file_path, module_name, language)
                        if cls:
                            symbols.append(cls)
                    elif sub.type in ("function_declaration", "function"):
                        func = self._extract_js_function(sub, source, file_path, module_name, language)
                        if func:
                            symbols.append(func)
                    elif sub.type == "lexical_declaration":
                        # Arrow functions: export const foo = () => ...
                        for decl in sub.children:
                            if decl.type == "variable_declarator":
                                vname = decl.child_by_field_name("name")
                                value = decl.child_by_field_name("value")
                                if vname and value and value.type in ("arrow_function", "function"):
                                    func = self._extract_js_arrow_function(
                                        decl, source, file_path, module_name, language
                                    )
                                    if func:
                                        symbols.append(func)

            elif child.type == "lexical_declaration":
                # const/let declarations with arrow functions
                for decl in child.children:
                    if decl.type == "variable_declarator":
                        value = decl.child_by_field_name("value")
                        if value and value.type in ("arrow_function", "function"):
                            func = self._extract_js_arrow_function(
                                decl, source, file_path, module_name, language
                            )
                            if func:
                                symbols.append(func)

            elif child.type in ("interface_declaration", "type_alias_declaration"):
                ts_type = self._extract_ts_type(child, source, file_path, module_name, language)
                if ts_type:
                    symbols.append(ts_type)

        return symbols, imports

    def _extract_js_class(
        self, node: Node, source: str, file_path: str, module_name: str, language: str
    ) -> ParsedSymbol | None:
        """Extract a JS/TS class."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{module_name}.{name}"

        # Base classes
        bases: list[str] = []
        heritage = None
        for child in node.children:
            if child.type == "class_heritage":
                heritage = child
                break
        if heritage:
            for h_child in heritage.children:
                if h_child.type not in ("extends", "implements", ",", " "):
                    text = self._node_text(h_child, source).strip()
                    if text and text not in ("extends", "implements"):
                        bases.append(text)

        # Methods
        methods: list[ParsedSymbol] = []
        body = node.child_by_field_name("body")
        if body:
            for child in body.children:
                if child.type in ("method_definition", "public_field_definition"):
                    method_name_node = child.child_by_field_name("name")
                    if method_name_node:
                        method_name = self._node_text(method_name_node, source)
                        methods.append(
                            ParsedSymbol(
                                name=method_name,
                                qualified_name=f"{qualified_name}.{method_name}",
                                symbol_type="method",
                                language=language,
                                file_path=file_path,
                                line_start=child.start_point[0] + 1,
                                line_end=child.end_point[0] + 1,
                                source_code=self._node_text(child, source),
                                parent_qualified_name=qualified_name,
                                calls=self._extract_calls(child, source),
                            )
                        )

        calls = self._extract_calls(node, source)

        return ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type="class",
            language=language,
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            signature=f"class {name}" + (f" extends {', '.join(bases)}" if bases else ""),
            source_code=self._node_text(node, source),
            parent_qualified_name=module_name,
            children=methods,
            calls=calls,
            bases=bases,
        )

    def _extract_js_function(
        self, node: Node, source: str, file_path: str, module_name: str, language: str
    ) -> ParsedSymbol | None:
        """Extract a JS/TS function declaration."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{module_name}.{name}"

        params_node = node.child_by_field_name("parameters")
        params_text = self._node_text(params_node, source) if params_node else "()"

        return_type = node.child_by_field_name("return_type")
        sig = f"function {name}{params_text}"
        if return_type:
            sig += f": {self._node_text(return_type, source)}"

        calls = self._extract_calls(node, source)

        # Extract JSDoc comment (preceding sibling)
        docstring = None
        prev = node.prev_named_sibling
        if prev and prev.type == "comment":
            doc_text = self._node_text(prev, source)
            if doc_text.startswith("/**"):
                docstring = doc_text[3:-2].strip()

        return ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type="function",
            language=language,
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            docstring=docstring,
            signature=sig,
            source_code=self._node_text(node, source),
            parent_qualified_name=module_name,
            calls=calls,
        )

    def _extract_js_arrow_function(
        self, node: Node, source: str, file_path: str, module_name: str, language: str
    ) -> ParsedSymbol | None:
        """Extract an arrow function: const foo = () => ..."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{module_name}.{name}"

        value = node.child_by_field_name("value")
        params_node = value.child_by_field_name("parameters") if value else None
        params_text = self._node_text(params_node, source) if params_node else "()"

        calls = self._extract_calls(node, source) if value else []

        return ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type="function",
            language=language,
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            signature=f"const {name} = {params_text} =>",
            source_code=self._node_text(node, source),
            parent_qualified_name=module_name,
            calls=calls,
        )

    def _extract_ts_type(
        self, node: Node, source: str, file_path: str, module_name: str, language: str
    ) -> ParsedSymbol | None:
        """Extract TypeScript interface or type alias."""
        name_node = node.child_by_field_name("name")
        if not name_node:
            return None

        name = self._node_text(name_node, source)
        qualified_name = f"{module_name}.{name}"
        sym_type = "interface" if node.type == "interface_declaration" else "type_alias"

        return ParsedSymbol(
            name=name,
            qualified_name=qualified_name,
            symbol_type=sym_type,
            language=language,
            file_path=file_path,
            line_start=node.start_point[0] + 1,
            line_end=node.end_point[0] + 1,
            signature=self._node_text(node, source).split("{")[0].strip(),
            source_code=self._node_text(node, source),
            parent_qualified_name=module_name,
        )

    # ─── Helpers ─────────────────────────────────────────────────────────

    def _extract_calls(self, node: Node, source: str) -> list[str]:
        """Extract function/method calls from a node's subtree."""
        calls: list[str] = []
        self._walk_calls(node, source, calls)
        return list(set(calls))

    def _walk_calls(self, node: Node, source: str, calls: list[str]) -> None:
        """Recursively walk the AST to find call expressions."""
        if node.type == "call" or node.type == "call_expression":
            func_node = node.child_by_field_name("function")
            if func_node:
                call_text = self._node_text(func_node, source)
                # Clean up and normalize the call text (strip newlines, extra spaces)
                call_text = "".join(call_text.split())
                if call_text and not call_text.startswith("(") and len(call_text) < 120:
                    calls.append(call_text)
        for child in node.children:
            self._walk_calls(child, source, calls)

    def _node_text(self, node: Node, source: str) -> str:
        """Get the source text for a node."""
        return source[node.start_byte : node.end_byte]

    def _collect_files(self, root: Path) -> list[Path]:
        """Collect all parseable source files from a directory."""
        files: list[Path] = []
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in LANGUAGE_MAP:
                # Skip excluded directories
                parts = set(path.relative_to(root).parts)
                if parts & SKIP_DIRS:
                    continue
                if path.name in SKIP_FILES:
                    continue
                files.append(path)
        return sorted(files)
