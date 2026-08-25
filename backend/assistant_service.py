try:
    from .services.assistant.service import *
    from .services.assistant.service import (
        build_global_platform_context,
        sanitize_context,
        generate_contextual_answer,
        query_groq_llm,
        handle_assistant_query,
    )
except (ImportError, ValueError):
    from services.assistant.service import *
    from services.assistant.service import (
        build_global_platform_context,
        sanitize_context,
        generate_contextual_answer,
        query_groq_llm,
        handle_assistant_query,
    )
