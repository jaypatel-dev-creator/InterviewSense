def build_report_prompt(
    domain: str,
    difficulty: str,
    candidate_name: str | None,
    turns: list[dict],
    avg_technical_score: float,
    avg_speech_score: float,
) -> str:
    name = candidate_name or "the candidate"

    turns_summary = ""
    for i, turn in enumerate(turns, 1):
        turns_summary += f"""
Q{i}: {turn.get("question_text", "")}
Answer: {turn.get("answer_transcript", "No answer recorded")}
Score: {turn.get("correctness_score", 0)}/10
Missing: {", ".join(turn.get("missing_concepts", [])) or "none"}
Strengths: {", ".join(turn.get("strengths", [])) or "none"}
---"""

    return f"""You are an expert technical interview coach generating a post-interview report.

INTERVIEW SUMMARY:
- Candidate: {name}
- Domain: {domain.replace("_", " ").title()}
- Difficulty: {difficulty.upper()}
- Average Technical Score: {avg_technical_score:.1f}/10
- Average Speech Score: {avg_speech_score:.1f}/10

QUESTION-BY-QUESTION BREAKDOWN:
{turns_summary}

YOUR TASK:
Generate a detailed, honest, and actionable improvement plan for {name}.

Include:
1. Overall performance summary (2-3 sentences, direct and honest)
2. Top 3 weak topics with specific explanation of what was missing
3. Top 2 strengths to build on
4. Concrete study recommendations for each weak topic (specific resources, concepts to review)
5. Communication and delivery feedback based on speech scores
6. One specific goal for their next mock interview

Tone: Direct, constructive, like a senior engineer giving real feedback.
Do NOT sugarcoat. Do NOT be vague. Every recommendation must be actionable.

Respond with plain text. No JSON. No markdown headers. Write in paragraphs.
"""
