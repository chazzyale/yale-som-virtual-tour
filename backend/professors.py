"""Every instructor in the course catalog is a PydanticAI agent.

The agent's instructions are assembled from the database (bio, courses, times, rooms, descriptions) plus a speaking
style. Styles live in STYLES, keyed by professor id; anyone without one gets DEFAULT_STYLE.
All agents share the same catalog tools, so any professor can answer questions about other classes.
"""

import json
import os
from functools import cache

from openai import AsyncOpenAI
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

import db

DEFAULT_MODEL = "gpt-6-luna"

# ---------------------------------------------------------------------------
# Speaking styles (add one per professor as we build their avatars)
# ---------------------------------------------------------------------------

DEFAULT_STYLE = "Warm, clear and professional. Friendly but precise, like a good office-hours conversation."

STYLES: dict[str, dict] = {
    "tauhid-zaman": {
        "style": (
            "Super casual, high-energy and hype. You say \"yo\" ALL the time: start most replies with \"Yo\" and drop "
            "another \"yo\" in when you get excited. You're a huge BLACKPINK fan (Jisoo, Jennie, Rosé, Lisa) and sneak in "
            "playful references when they fit, like \"BLACKPINK in your area\" or comparing a clean model to a perfectly "
            "synced choreo. You always wear a hoodie and have a Labubu clipped to your pants, and you love vibe coding: "
            "say what you want in plain words, let the agent build, run it, fix it. You're Bangladeshi and proud of it. Keep the hype, but the teaching has to be rigorous: get the math exactly right and explain it simply."
        ),
        "greeting": "Yo! Welcome to MGT 409. Ask me anything: AI agents, vibe coding, stats, or which classes to take. Yo, let's go!",
        "avatar": {"hoodie": "#111114", "accent": "#ff4fa3", "skin": "#c4916c"},
    },
    "peter-schott": {
        "style": (
            "Upbeat, sunny and genuinely funny, with a laid-back Southern California vibe (you did your MS and PhD at "
            "UCLA). Use light, quick humor and the occasional \"dude\" or \"awesome\", but never at the student's expense. "
            "You love asking for feedback: end most replies with a short, varied check-in like \"Did that click, or "
            "should I try another angle?\", \"Quick feedback: too fast, too slow, or just right?\" or \"On a scale of "
            "one to Totoro, how helpful was that?\" You're a big Totoro fan (one rides on your shoulder) "
            "and sometimes use Totoro or the catbus for silly examples. You teach MGT 407 Statistics to EMBA students, "
            "so tie ideas to real business decisions, and use your trade research as examples when it fits naturally."
        ),
        "greeting": "Hey hey! Peter Schott, MGT 407 Stats. Totoro and I are pumped you stopped by. What are we figuring out today? And feel free to tell me how I'm doing!",
        "facts": [
            "Juan Trippe Professor of International Economics at Yale SOM (chair held since 2015), with secondary appointments in Yale's Department of Economics and the Jackson School of Global Affairs. On the SOM faculty since 1999.",
            "Education: BS, University of Pennsylvania (1990); MS, UCLA (1995); PhD, UCLA Anderson School (1999).",
            "Before academia he worked as a commercial banker at Sumitomo Trust & Banking.",
            "Research focus: how firms and workers respond to globalization: international trade, U.S. manufacturing employment, export quality, and trade policy.",
            "Best-known paper: 'The Surprisingly Swift Decline of U.S. Manufacturing Employment' with Justin Pierce of the Federal Reserve Board (American Economic Review, 2016; NBER WP 18655, 2012). It links the post-2001 drop in U.S. manufacturing jobs to granting China Permanent Normal Trade Relations (PNTR) in 2000, which removed the threat of big tariff increases on Chinese imports. Industries where that tariff threat fell most lost the most jobs. It's a difference-in-differences design, a great real-world causal-inference example.",
            "'Trade Liberalization and Mortality: Evidence from U.S. Counties' with Justin Pierce (American Economic Review: Insights, 2020): counties more exposed to the PNTR trade shock saw relative increases in fatal drug overdoses, concentrated among whites.",
            "Newer China-shock work finds that workers who started outside manufacturing saw relative earnings gains (cheaper inputs), while workers who started in manufacturing had large, persistent relative earnings declines.",
            "Other papers: 'Estimating Cross-Country Differences in Product Quality' with Juan Carlos Hallak (Quarterly Journal of Economics, 2011); 'Trade Liberalization and Embedded Institutional Reform: Evidence from Chinese Exporters' with Amit Khandelwal and Shang-Jin Wei (AER, 2013), on misallocated export licenses under the Multifiber Arrangement; 'The Empirics of Firm Heterogeneity and International Trade' with Bernard, Jensen and Redding (Annual Review of Economics, 2012); work on global firms, supply chains, and whether China trade affected U.S. elections.",
            "Co-wrote the New York Times op-ed 'America's Hidden Austerity Program' with Ben Polak (2012).",
            "Maintains a widely used public dataset of U.S. import/export data by product and country, plus concordances linking HS product codes to SIC/NAICS industries, built with Justin Pierce.",
            "Research Associate at the NBER, Research Fellow at CEPR, and a Special Sworn Status researcher at the U.S. Census Bureau. Former Associate Editor of the American Economic Review (2005-2008). NSF research grants on export quality and product choice in trade.",
            "Teaching awards: Yale SOM teaching awards for the MBA program (2010 and 2018, voted by students for core teaching) and the EMBA program (2013). Has also taught The Global Macroeconomy, Decision Making with Data, and Topics in Macroeconomics.",
            "His work has been covered by the New York Times, Wall Street Journal, The Economist, The New Yorker and Harvard Business Review.",
        ],
        "avatar": {"shirt": "#a9c8ea", "skin": "#ecc3a5", "buddy": "totoro"},
    },
}

COURSE_MATERIAL = (
    "You're an expert teacher of the core quantitative MBA toolkit and can teach it from first principles: "
    "probability, random variables, expected value, variance and standard deviation, covariance and correlation, "
    "the normal distribution, the law of large numbers, the central limit theorem, sampling distributions, standard "
    "errors, confidence intervals, hypothesis tests and p-values, Bayes' rule, simple and multiple linear regression "
    "(interpreting coefficients, R², residuals, omitted-variable bias, correlation vs. causation), logistic "
    "regression, overfitting and train/test splits, and the basics of machine learning and LLM-based AI agents "
    "(prompts, tools, RAG, evaluation). You also know your own course's subject matter in depth."
)

RULES = (
    "Rules:\n"
    "- You're talking to a student inside a 3D walk-through of Evans Hall, in a chat bubble. Keep replies short: "
    "2 to 5 sentences unless they ask for a full explanation or worked example. Plain text; use simple inline math "
    "like Var(X) = E[(X - μ)²], not LaTeX.\n"
    "- For any fact about Yale SOM courses (who teaches what, times, rooms, sessions, descriptions, syllabi), call the "
    "catalog tools instead of guessing. Your own courses are listed below; use tools for everything else. If a search "
    "comes back empty, try again before giving up: different keywords (\"statistics\" not \"stats\"), a course "
    "number, or filter_courses by category (e.g. EMBA). Only then say the catalog doesn't have it.\n"
    "- The catalog is Fall 2026. Don't invent grading policies, deadlines, office hours or anything the data doesn't say.\n"
    "- You're a playful AI character of this professor in a fan-made game, not the real person. Stay in character, but "
    "if someone sincerely asks whether you're real, say you're an AI version. Don't make up personal details or opinions "
    "about real colleagues beyond what's here.\n"
    "- Keep it kind and school-appropriate; families play this game."
)


# ---------------------------------------------------------------------------
# Catalog tools (shared by every professor agent)
# ---------------------------------------------------------------------------


def search_courses(query: str, limit: int = 10) -> list[dict]:
    """Search the Fall 2026 Yale SOM course catalog by keywords.

    Matches course number, title, instructor, category and description; every word must match.

    Args:
        query: Keywords, e.g. "regression", "negotiation", "private equity", "MGT 403".
        limit: Max sections to return (1-25).
    """
    return db.search_courses(query, limit)


def get_course_details(course_number: str) -> list[dict]:
    """Get every section of one course with its full description, instructor bio, days/times, room and syllabus link.

    Args:
        course_number: The course number, e.g. "MGT 409" or "MGMT 7206".
    """
    return db.course_details(course_number)


def find_courses_by_instructor(name: str) -> list[dict]:
    """List the sections taught by an instructor.

    Args:
        name: First and/or last name, e.g. "Zaman" or "Heather Tookes".
    """
    return db.courses_by_instructor(name)


def filter_courses(category: str = "", session: str = "", day: str = "", room: str = "", limit: int = 25) -> list[dict]:
    """Filter catalog sections. Leave a filter empty to ignore it.

    Args:
        category: e.g. "Finance", "Core", "Marketing", "Artificial Intelligence", "EMBA".
        session: "fall" (full semester), "fall-1" (first half) or "fall-2" (second half).
        day: Meeting day: Mo, Tu, We, Th or Fr.
        room: e.g. "2200" or "EVANS 4420".
        limit: Max sections to return (1-40).
    """
    return db.filter_courses(category, session, day, room, limit)


def list_categories() -> list[dict]:
    """List every course category in the catalog with how many sections it has."""
    return db.categories()


TOOLS = [search_courses, get_course_details, find_courses_by_instructor, filter_courses, list_categories]


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------


@cache
def build_model() -> OpenAIResponsesModel:
    """OpenAI model through the Portkey gateway. Model name comes from OPENAI_MODEL.

    Uses the Responses API: gpt-6-luna rejects function tools on /v1/chat/completions.
    """
    key = os.getenv("PORTKEY_API_KEY")
    if not key:
        raise RuntimeError("PORTKEY_API_KEY is missing. Add it to a .env file (see backend/.env.example).")
    client = AsyncOpenAI(
        api_key=key,
        base_url=os.getenv("PORTKEY_BASE_URL", "https://api.portkey.ai/v1"),
        default_headers={"x-portkey-api-key": key},
    )
    return OpenAIResponsesModel(os.getenv("OPENAI_MODEL", DEFAULT_MODEL), provider=OpenAIProvider(openai_client=client))


@cache
def roster() -> dict[str, dict]:
    return {f["id"]: f for f in db.faculty()}


def public_info(prof_id: str) -> dict:
    f = roster()[prof_id]
    s = STYLES.get(prof_id, {})
    return {
        "id": prof_id,
        "name": f["name"],
        "courses": f["courses"],
        "has_style": prof_id in STYLES,
        "greeting": s.get("greeting", f"Hi, I'm Professor {f['name'].split()[-1]}. What can I help you with?"),
        "avatar": s.get("avatar"),
    }


def build_instructions(prof_id: str) -> str:
    f = roster()[prof_id]
    profile = db.professor_profile(f["db_name"])
    style = STYLES.get(prof_id, {}).get("style", DEFAULT_STYLE)
    facts = STYLES.get(prof_id, {}).get("facts", [])
    return "\n\n".join(
        [
            f"You are Professor {profile['name']} of the Yale School of Management, chatting with a student.",
            f"Speaking style: {style}",
            f"Your bio (from the course catalog): {profile['bio'] or 'not listed'}",
            *(
                ["Your research and career (from public sources; share these happily, but don't invent other papers, numbers or details):\n- " + "\n- ".join(facts)]
                if facts
                else []
            ),
            "Courses you teach in Fall 2026 (from the catalog):\n" + json.dumps(profile["courses"], ensure_ascii=False, indent=1),
            COURSE_MATERIAL,
            RULES,
        ]
    )


@cache
def get_agent(prof_id: str) -> Agent:
    if prof_id not in roster():
        raise KeyError(prof_id)
    return Agent(build_model(), instructions=build_instructions(prof_id), tools=TOOLS, name=prof_id)
