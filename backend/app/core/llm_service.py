"""LLM service — provider-agnostic LLM for code intelligence queries.

Supports Gemini, OpenAI, and Ollama. Handles prompt engineering
for code architecture questions, flow generation, and temporal analysis.
"""

import json
import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ─── System Prompts ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are RepoMind, an expert code intelligence assistant. You analyze codebases and answer questions about architecture, code flow, dependencies, and design decisions.

You have been given context about a repository including:
- Code symbols (classes, functions, methods) with their source code
- The code graph showing how symbols relate (calls, imports, inheritance)
- Git history showing when code was introduced and modified

When answering:
1. Be precise and reference specific files, functions, and line numbers
2. When describing a flow, list each step clearly with the component involved
3. When asked "what breaks if I change X", trace all downstream dependencies
4. When asked "why does this exist", consult the git history data provided

IMPORTANT: When the user asks about a flow or process, you MUST also generate a flow diagram.
Return the flow as a JSON object within <flow> tags:
<flow>
{
  "nodes": [
    {"id": "1", "label": "ComponentName", "type": "class|function|endpoint|database|service", "file_path": "path/to/file", "description": "What this does"}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "calls|sends|queries|returns"}
  ]
}
</flow>

Keep flow diagrams focused — include 4-10 nodes that are most relevant to the question.
"""


class LLMService:
    """LLM service for code intelligence queries."""

    def __init__(self) -> None:
        self.provider = settings.llm_provider
        self.model = settings.llm_model
        self._client = httpx.AsyncClient(timeout=120.0)

    def _resolve_provider(self) -> str:
        """Resolve LLM provider based on settings, model name, and available API keys.
        
        Priority: NVIDIA NIM > explicit provider > Gemini fallback.
        """
        # 1. Try NVIDIA NIM first if key is available
        if settings.nvidia_api_key:
            return "nvidia"

        # 2. Explicit provider settings
        if self.provider == "gemini" and settings.gemini_api_key:
            return "gemini"
        if self.provider == "openai" and settings.openai_api_key:
            return "openai"
        if self.provider == "ollama":
            return "ollama"

        # 3. Fallback: whichever key is available
        if settings.gemini_api_key:
            return "gemini"
        if settings.openai_api_key:
            return "openai"

        return self.provider

    async def query(
        self,
        question: str,
        context: str,
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        """Send a query to the LLM with code context.

        Returns:
            {
                "answer": "...",
                "flow": {"nodes": [...], "edges": [...]},  # if flow generated
            }
        """
        prompt = system_prompt or SYSTEM_PROMPT
        user_message = f"""## Context

{context}

## Question

{question}"""

        resolved_provider = self._resolve_provider()
        logger.info(f"Routing query with provider={resolved_provider}, model={self.model}")

        raw_response = ""
        try:
            if resolved_provider == "nvidia":
                nvidia_model = self.model if "/" in self.model else "nvidia/nemotron-3-ultra-550b-a55b"
                raw_response = await self._nvidia_query(prompt, user_message, model=nvidia_model)
            elif resolved_provider == "openai":
                raw_response = await self._openai_query(prompt, user_message)
            elif resolved_provider == "gemini":
                raw_response = await self._gemini_query(prompt, user_message, model="gemini-3.6-flash")
            elif resolved_provider == "ollama":
                raw_response = await self._ollama_query(prompt, user_message)
            else:
                # Default: try Gemini if key exists, otherwise NVIDIA
                if settings.gemini_api_key:
                    raw_response = await self._gemini_query(prompt, user_message, model="gemini-3.6-flash")
                else:
                    nvidia_model = self.model if "/" in self.model else "meta/llama-3.1-70b-instruct"
                    raw_response = await self._nvidia_query(prompt, user_message, model=nvidia_model)
        except Exception as e:
            logger.error(f"Provider {resolved_provider} failed: {e}")
            # Fallback chain: try Gemini if primary failed, then NVIDIA
            if resolved_provider != "gemini" and settings.gemini_api_key:
                logger.info("Attempting fallback to Google Gemini 3.6 Flash...")
                try:
                    raw_response = await self._gemini_query(prompt, user_message, model="gemini-3.6-flash")
                except Exception as e2:
                    logger.error(f"Gemini fallback also failed: {e2}")
                    raise e
            elif resolved_provider != "nvidia" and settings.nvidia_api_key:
                logger.info("Attempting fallback to NVIDIA NIM...")
                raw_response = await self._nvidia_query(prompt, user_message, model="meta/llama-3.1-70b-instruct")
            else:
                raise e

        # Parse flow diagram from response
        flow = self._extract_flow(raw_response)
        answer = self._clean_answer(raw_response)

        return {
            "answer": answer,
            "flow": flow,
        }

    async def generate_impact_analysis(
        self, symbol_name: str, context: str
    ) -> dict[str, Any]:
        """Generate impact analysis for a symbol change."""
        prompt = """You are an impact analysis engine. Given a code symbol and its dependencies, 
analyze what would break if this symbol's signature or behavior changes.

Return a JSON object within <impact> tags:
<impact>
{
  "affected_files": ["path/to/file.py"],
  "affected_endpoints": ["GET /api/users"],
  "affected_queries": ["SELECT * FROM users"],
  "affected_tests": ["test_create_user"],
  "affected_workers": ["email_notification_worker"],
  "risk_level": "HIGH|MEDIUM|LOW",
  "risk_explanation": "Why this risk level"
}
</impact>

Also provide a human-readable summary of the impact."""

        question = f"What breaks if I change `{symbol_name}`?"
        result = await self.query(question, context, system_prompt=prompt)

        # Extract impact JSON
        impact = self._extract_tag_json(result["answer"], "impact")

        return {
            "answer": self._clean_tag(result["answer"], "impact"),
            "impact": impact,
        }

    # ─── Provider Implementations ────────────────────────────────────────

    async def _gemini_query(self, system_prompt: str, user_message: str, model: str | None = None) -> str:
        """Query Google Gemini API."""
        use_model = model or self.model
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{use_model}:generateContent"

        response = await self._client.post(
            url,
            params={"key": settings.gemini_api_key},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_message}]}],
                "generationConfig": {
                    "maxOutputTokens": 4096,
                    "temperature": 0.3,
                },
            },
        )
        if response.status_code != 200:
            error_body = response.text
            logger.error(f"Gemini API returned {response.status_code}: {error_body}")
            raise RuntimeError(f"Gemini API error ({response.status_code}): {error_body}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return "Unable to generate a response."

        parts = candidates[0].get("content", {}).get("parts", [])
        return parts[0].get("text", "") if parts else ""

    async def _openai_query(self, system_prompt: str, user_message: str, model: str | None = None) -> str:
        """Query OpenAI API."""
        response = await self._client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": model or self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": 4096,
                "temperature": 0.3,
            },
        )
        if response.status_code != 200:
            error_body = response.text
            logger.error(f"OpenAI API returned {response.status_code}: {error_body}")
            raise RuntimeError(f"OpenAI API error ({response.status_code}): {error_body}")

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _nvidia_query(self, system_prompt: str, user_message: str, model: str | None = None) -> str:
        """Query Nvidia NIM (OpenAI compatible). Supports reasoning models like Nemotron Ultra."""
        use_model = model or self.model
        response = await self._client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
            json={
                "model": use_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": 16384,
                "temperature": 0.3,
            },
        )
        if response.status_code != 200:
            error_body = response.text
            logger.error(f"NVIDIA NIM API returned {response.status_code}: {error_body}")
            raise RuntimeError(f"NVIDIA NIM error ({response.status_code}): {error_body}")

        data = response.json()
        message = data["choices"][0]["message"]
        # Nemotron Ultra returns reasoning_content separately from content
        content = message.get("content", "") or ""
        return content

    async def _ollama_query(self, system_prompt: str, user_message: str) -> str:
        """Query local Ollama."""
        response = await self._client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
            },
        )
        if response.status_code != 200:
            error_body = response.text
            logger.error(f"Ollama API returned {response.status_code}: {error_body}")
            raise RuntimeError(f"Ollama error ({response.status_code}): {error_body}")

        data = response.json()
        return data.get("message", {}).get("content", "")

    # ─── Response Parsing ────────────────────────────────────────────────

    def _extract_flow(self, response: str) -> dict[str, Any] | None:
        """Extract flow diagram JSON from <flow> tags in the response."""
        return self._extract_tag_json(response, "flow")

    def _extract_tag_json(self, response: str, tag: str) -> dict[str, Any] | None:
        """Extract JSON from a specific XML-like tag."""
        start_tag = f"<{tag}>"
        end_tag = f"</{tag}>"
        start = response.find(start_tag)
        end = response.find(end_tag)

        if start == -1 or end == -1:
            return None

        json_str = response[start + len(start_tag) : end].strip()
        
        # Clean up common LLM markdown artifacts inside the tags
        if json_str.startswith("```json"):
            json_str = json_str[7:]
        elif json_str.startswith("```"):
            json_str = json_str[3:]
            
        if json_str.endswith("```"):
            json_str = json_str[:-3]
            
        json_str = json_str.strip()
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse {tag} JSON from LLM response: {e}")
            logger.debug(f"Raw string was: {json_str}")
            return None

    def _clean_answer(self, response: str) -> str:
        """Remove flow tags from the answer text."""
        return self._clean_tag(response, "flow")

    def _clean_tag(self, response: str, tag: str) -> str:
        """Remove a specific tag and its content from the response."""
        start_tag = f"<{tag}>"
        end_tag = f"</{tag}>"
        start = response.find(start_tag)
        end = response.find(end_tag)

        if start != -1 and end != -1:
            return (response[:start] + response[end + len(end_tag) :]).strip()
        return response

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
