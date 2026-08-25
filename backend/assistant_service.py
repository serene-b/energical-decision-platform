try:
    from .services.assistant.service import *
    from .services.assistant.service import (
        sanitize_context,
        generate_contextual_answer,
        handle_assistant_query,
    )
except (ImportError, ValueError):
    from services.assistant.service import *
    from services.assistant.service import (
        sanitize_context,
        generate_contextual_answer,
        handle_assistant_query,
    )
