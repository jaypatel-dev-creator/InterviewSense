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
        jd_context = f"Focus on this skill from the job description: {jd_skills[0]}\n"

    # Pick one topic in code — don't let the LLM choose
    topics_pool = seed_topics.copy()
    random.shuffle(topics_pool)
    chosen_topic = topics_pool[0]

    return f"""You are a technical interviewer. Ask one interview question about: {chosen_topic}

Domain: {domain.replace("_", " ").title()}
Difficulty: {difficulty.upper()}
{jd_context}
Output format: Write the question text only. No JSON. No labels. No preamble. Just the question sentence ending with a question mark.

Example of correct output:
How does gradient descent optimize a neural network's weights during backpropagation?

Now write one question about {chosen_topic}:"""