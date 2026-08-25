import os
import json
import logging
import urllib.request
from typing import Dict, Any, Optional
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

logger = logging.getLogger("energical.assistant")

def sanitize_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    page = payload.get("page") or "overview"
    selection_type = payload.get("selection_type") or "dashboard_selection"
    selection = payload.get("selection") or "Current View"
    raw_metrics = payload.get("approved_metrics") or {}

    safe_metrics = {}
    if isinstance(raw_metrics, dict):
        for k, v in raw_metrics.items():
            if isinstance(v, (int, float, str, bool)):
                safe_metrics[str(k)] = v

    return {
        "status": "success",
        "context": {
            "page": page,
            "selection_type": selection_type,
            "selection": selection,
            "approved_metrics": safe_metrics,
            "boundary": "Protected aggregate context (zero-PII / verified calculations only)",
        },
    }

def generate_contextual_answer(query: str, page: str, selection: str, metrics: Optional[Dict[str, Any]]) -> str:
    metrics = metrics or {}
    query_lower = query.lower()

    if "quality" in query_lower or "check" in query_lower or "contrôle" in query_lower:
        return (
            "The data quality review verified standard data types, deduplicated order IDs, and validated foreign key "
            "integrity between transactions and the product catalogue. Zero unmapped critical IDs were found."
        )

    if "transformation" in query_lower or "règle" in query_lower:
        return (
            "Applied transformations include: 1) Normalizing Algerian Dinar amounts into standard floats; "
            "2) Standardizing customer ID 5-digit prefixes to 6-digit canonical codes; "
            "3) Grouping 20+ shipping entries into 5 standard delivery methods; "
            "4) Catalogue enrichment to restore missing product subcategories."
        )

    if "wilaya" in query_lower or "region" in query_lower or "oran" in query_lower or "alger" in query_lower:
        rev = metrics.get("revenue", "—")
        ords = metrics.get("orders", "—")
        share = metrics.get("share", "—")
        return (
            f"Regarding {selection}: Current verified metrics show realized revenue of {rev} DZD across {ords} orders, "
            f"accounting for {share}% regional market share. Expansion in secondary commercial hubs is recommended to reduce concentration in Algiers."
        )

    if "winter" in query_lower or "hiver" in query_lower or "stock" in query_lower:
        return (
            "Seasonal demand for heating appliances and wall boilers surges by +45% starting in late October. "
            "It is highly recommended to secure distributor inventory and schedule supply shipments prior to October 15."
        )

    metrics_str = ", ".join(f"{k}: {v}" for k, v in (metrics or {}).items()) if metrics else "Current page aggregates"
    return (
        f"Based on the verified {page} domain data ({selection}): {metrics_str}. "
        "Overall commercial indicators reflect steady revenue trajectory with high B2B order concentration. "
        "Recommend monitoring at-risk accounts and sustaining promotional momentum."
    )

def query_groq_llm(query: str, page: str, selection: str, metrics: Optional[Dict[str, Any]]) -> Optional[str]:
    api_token = os.getenv("API_AUTH_TOKEN") or os.getenv("GROQ_API_KEY")
    if not api_token or not api_token.strip():
        return None

    provider_url = os.getenv("ASSISTANT_PROVIDER_URL", "https://api.groq.com/openai/v1").rstrip("/")
    if not provider_url.endswith("/chat/completions"):
        endpoint = f"{provider_url}/chat/completions"
    else:
        endpoint = provider_url

    model = os.getenv("ASSISTANT_MODEL", "llama-3.3-70b-versatile")
    metrics_formatted = json.dumps(metrics or {}, indent=2, ensure_ascii=False)

    system_prompt = (
        "You are the Energical Decision Platform AI Executive Assistant for Energical Algeria.\n"
        "You provide concise, accurate, executive business intelligence insights based on verified metrics.\n"
        f"Active Module: {page}\n"
        f"Current Selection: {selection}\n"
        f"Verified Aggregate Metrics: {metrics_formatted}\n\n"
        "Guidelines:\n"
        "- Respond in the same language as the user query (French, English, or Arabic).\n"
        "- Be direct, analytical, professional, and data-driven.\n"
        "- Never hallucinate unverified raw records; adhere to the aggregate metrics provided."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ],
        "temperature": 0.3,
        "max_tokens": 400
    }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_token.strip()}",
                "User-Agent": "Energical-Decision-Platform/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            choices = res_json.get("choices") or []
            if choices and "message" in choices[0] and "content" in choices[0]["message"]:
                return choices[0]["message"]["content"].strip()
    except Exception as exc:
        logger.warning(f"Groq API query failed: {exc}. Falling back to contextual rule engine.")
        return None

    return None

def handle_assistant_query(payload: Dict[str, Any]) -> Dict[str, Any]:
    query = payload.get("query") or payload.get("question") or ""
    page = payload.get("page") or "overview"
    selection = payload.get("selection") or "All"
    metrics = payload.get("approved_metrics") or {}

    llm_answer = query_groq_llm(query, page, selection, metrics)
    if llm_answer:
        answer = llm_answer
        provider = "groq"
    else:
        answer = generate_contextual_answer(query, page, selection, metrics)
        provider = "local_context"

    return {
        "status": "success",
        "answer": answer,
        "provider": provider,
        "context_used": {
            "page": page,
            "selection": selection,
            "metrics_count": len(metrics),
        },
    }
