def build_jd_extractor_prompt(jd_text: str) -> str:
    return f"""You are a technical recruiter parsing a job description.

Extract the specific technical skills, tools, frameworks, and concepts required for this role.
Focus only on technical requirements — ignore soft skills, benefits, and company culture.

JOB DESCRIPTION:
{jd_text}

Respond with ONLY a JSON array of strings. Each string is one skill or technology.
Example: ["FastAPI", "PostgreSQL", "LangChain", "vector databases", "REST API design"]

No preamble. No explanation. Just the JSON array.
"""
