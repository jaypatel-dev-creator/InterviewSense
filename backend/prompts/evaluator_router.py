import random
from domains.topics import Difficulty, DIFFICULTY_INSTRUCTIONS


def build_evaluator_router_prompt(
    domain: str,
    difficulty: str,
    question_text: str,
    answer_transcript: str,
    topics_covered: list[str],
    current_question_number: int,
    question_count: int,
    jd_skills: list[str],
) -> str:
    difficulty_instruction = DIFFICULTY_INSTRUCTIONS.get(
        difficulty, DIFFICULTY_INSTRUCTIONS[Difficulty.MEDIUM]
    )

    jd_context = ""
    if jd_skills:
        jd_context = f"""
The candidate is preparing for a specific role. Target these skills from the job description:
{", ".join(jd_skills)}
Prioritize questions that test these skills when selecting new topics.
"""

    topics_str = ", ".join(topics_covered) if topics_covered else "none yet"

    return f"""You are a strict but fair technical interviewer conducting a {domain.replace("_", " ").title()} interview.

DIFFICULTY LEVEL: {difficulty.upper()}
{difficulty_instruction}

CURRENT QUESTION ({current_question_number}/{question_count}):
{question_text}

CANDIDATE'S ANSWER:
{answer_transcript}

TOPICS COVERED SO FAR: {topics_str}
{jd_context}

YOUR TASK:
1. Evaluate the candidate's answer objectively against the question asked.
2. Assign a correctness score from 0.0 to 10.0.
3. List specific concepts the candidate missed or got wrong.
4. List what the candidate explained correctly or well.
5. Decide the next question type:
   - "follow_up" — candidate answered well, explore the same topic deeper
   - "drill_down" — candidate was vague or partially correct, probe further
   - "reframe" — candidate completely misunderstood, approach the concept differently
   - "new_topic" — candidate answered well enough, move to a new topic
6. Generate the exact next question text.
7. Decide difficulty adjustment for the next question.

Respond ONLY with the structured JSON output. No preamble, no explanation outside the JSON.
"""


def build_first_question_prompt(
    domain: str,
    difficulty: str,
    seed_topics: list[str],
    jd_skills: list[str],
) -> str:
    jd_context = ""
    if jd_skills:
        jd_context = f"""
The candidate has provided a job description. Start with a question targeting one of these skills:
{", ".join(jd_skills[:5])}
"""

    # Shuffle so the LLM doesn't always anchor on the first topic
    shuffled_topics = seed_topics.copy()
    random.shuffle(shuffled_topics)
    topics_str = "\n".join(f"- {t}" for t in shuffled_topics)

    return f"""You are a technical interviewer starting a {domain.replace("_", " ").title()} interview.

DIFFICULTY: {difficulty.upper()}
AVAILABLE TOPICS (pick one at random — do not always pick the first):
{topics_str}
{jd_context}

Generate the first interview question. It should:
- Be clear and specific
- Match the difficulty level
- Target one of the available topics (or a JD skill if provided)
- Sound natural, like a real interviewer asking it
- Do NOT ask "tell me about your experience with X" — ask a specific technical question

Respond with ONLY the question text. No labels, no preamble.
"""