def build_jd_extractor_prompt(jd_text: str) -> str:
    return f"""You are a technical recruiter parsing a job description.

Extract the specific technical skills, tools, frameworks, and concepts required for this role.
Focus only on technical requirements — ignore soft skills, benefits, and company culture.

CRITICAL RULES:
- Maximum 12 skills total. If the JD has fewer requirements, extract fewer.
- When a requirement lists multiple options (e.g. "Pinecone, Weaviate, or Chroma"), extract ONE representative skill, not all of them. Pick the most common or most relevant one.
- When a requirement mentions a category with examples (e.g. "vector databases (Pinecone, Weaviate)"), extract the category ("vector databases"), not the individual tools.
- Never split one requirement into multiple skills.
- Each skill should be a distinct, atomic concept — no duplicates, no near-duplicates.

JOB DESCRIPTION:
{jd_text}

Respond with ONLY a JSON array of strings. Each string is one skill or technology.
Example: ["FastAPI", "PostgreSQL", "LangChain", "vector databases", "REST API design"]

No preamble. No explanation. Just the JSON array.
"""