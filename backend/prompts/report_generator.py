def build_report_prompt(
    domain: str,
    difficulty: str,
    candidate_name: str | None,
    turns: list[dict],
    avg_technical_score: float,
    avg_speech_score: float | None,
    questions_answered: int,
    question_count: int,
) -> str:
    name = candidate_name or "the candidate"

    # avg_speech_score is None when fewer than half the answers were spoken — do not
    # show the LLM a fake number to quote.
    if avg_speech_score is None:
        speech_line = "- Average Speech Score: not available (fewer than half the answers were spoken)"
        communication_instruction = (
            "Communication and delivery feedback. No speech score was computed because fewer than "
            "half the answers were spoken, so do not mention or invent a communication score."
        )
    else:
        speech_line = f"- Average Speech Score: {avg_speech_score:.1f}/10"
        communication_instruction = (
            f"Communication and delivery feedback. The computed communication score is "
            f"{avg_speech_score:.1f}/10 — reference this exact number, do not invent a different score."
        )

    # Skipped and unreached questions count as 0 in the technical score. Without this note the
    # model reads a low average as weak knowledge instead of an unfinished interview.
    if questions_answered < question_count:
        coverage_note = (
            f"\nIMPORTANT: The candidate answered only {questions_answered} of {question_count} questions. "
            "Skipped and unreached questions count as 0 in the technical score, so that average is lower "
            "than the quality of the answers alone. Say this plainly in the summary, and judge the answered "
            "questions on their own merits instead of calling the candidate's knowledge weak because of the average alone.\n"
        )
    else:
        coverage_note = ""

    turns_summary = ""
    for i, turn in enumerate(turns, 1):
        if turn.get("skipped"):
            turns_summary += f"""
Q{i}: {turn.get("question_text", "")}
Answer: [Skipped by the candidate. No answer given.]
Score: not scored
---"""
            continue
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
- Questions answered: {questions_answered} of {question_count}
{speech_line}
{coverage_note}
QUESTION-BY-QUESTION BREAKDOWN:
{turns_summary}

YOUR TASK:
Generate a detailed, honest, and actionable improvement plan for {name}.

Include:
1. Overall performance summary (2-3 sentences, direct and honest)
2. Top 3 weak topics with specific explanation of what was missing
3. Top 2 strengths to build on
4. Concrete study recommendations for each weak topic (specific resources, concepts to review)
5. {communication_instruction}
6. One specific goal for their next mock interview

Tone: Direct, constructive, like a senior engineer giving real feedback.
Do NOT sugarcoat. Do NOT be vague. Every recommendation must be actionable.

Respond with plain text. No JSON. No markdown headers. Write in paragraphs.
"""