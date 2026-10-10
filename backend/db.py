"""Read-only access to data/yale_som.db, the Fall 2026 Yale SOM course catalog (one row per section)."""

import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "yale_som.db"

# Columns returned in search results; long text fields are trimmed so tool output stays small.
SUMMARY_COLS = "course_number, course_title, faculty_1, course_category, course_session, daytimes, room, units, section"


def _connect() -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _rows(sql: str, params: tuple = ()) -> list[dict]:
    with _connect() as con:
        return [dict(r) for r in con.execute(sql, params)]


def _clip(text: str | None, n: int) -> str:
    text = (text or "").replace("\r", "").replace("�", "-").strip()
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def display_name(db_name: str) -> str:
    """'Zaman, Tauhid' -> 'Tauhid Zaman'."""
    last, _, first = db_name.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


def slug(db_name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", display_name(db_name).lower()).strip("-")


def faculty() -> list[dict]:
    """Every instructor in the catalog with an id, display name, and the courses they teach."""
    rows = _rows(
        "select faculty_1, group_concat(distinct course_number || ' ' || course_title) as courses "
        "from courses where coalesce(faculty_1, '') <> '' group by faculty_1 order by faculty_1"
    )
    return [
        {"id": slug(r["faculty_1"]), "db_name": r["faculty_1"], "name": display_name(r["faculty_1"]), "courses": r["courses"].split(",")}
        for r in rows
    ]


def professor_profile(db_name: str) -> dict:
    """Bio plus every section this instructor teaches (with full course descriptions)."""
    rows = _rows(
        "select course_number, course_title, course_category, course_session, daytimes, room, units, section, "
        "course_description, faculty_bio, syllabus, old_syllabus from courses where faculty_1 = ? order by course_number, section",
        (db_name,),
    )
    if not rows:
        raise KeyError(db_name)
    courses: dict[str, dict] = {}
    for r in rows:
        c = courses.setdefault(
            r["course_number"],
            {
                "course_number": r["course_number"],
                "title": r["course_title"],
                "category": r["course_category"],
                "session": r["course_session"],
                "units": r["units"],
                "description": _clip(r["course_description"], 1500),
                "syllabus": r["syllabus"] or r["old_syllabus"] or "",
                "sections": [],
            },
        )
        c["sections"].append({"section": r["section"], "days_times": r["daytimes"] or "TBA", "room": r["room"] or "TBA"})
    return {"name": display_name(db_name), "bio": _clip(rows[0]["faculty_bio"], 1500), "courses": list(courses.values())}


# ---------------------------------------------------------------------------
# Lookups used as agent tools
# ---------------------------------------------------------------------------


def search_courses(query: str, limit: int = 10) -> list[dict]:
    """Courses whose number, title, instructor, category or description contain every word in `query`."""
    words = [w for w in re.split(r"\s+", query.strip()) if w][:6]
    if not words:
        return []
    # forgive plurals so "stats" finds "Statistics" and "negotiations" finds "Negotiation"
    words = [w[:-1] if len(w) > 3 and w.lower().endswith("s") else w for w in words]
    fields = "course_number || ' ' || course_title || ' ' || coalesce(faculty_1,'') || ' ' || coalesce(course_category,'') || ' ' || coalesce(course_description,'')"
    where = " and ".join(f"({fields}) like ?" for _ in words)
    rows = _rows(
        f"select {SUMMARY_COLS}, course_description from courses where {where} order by course_number, section limit ?",
        (*[f"%{w}%" for w in words], max(1, min(limit, 25))),
    )
    for r in rows:
        r["course_description"] = _clip(r["course_description"], 220)
    return rows


def course_details(course_number: str) -> list[dict]:
    """Every section of one course (e.g. 'MGT 403'), with the full description and syllabus link."""
    num = re.sub(r"\s+", " ", course_number.strip().upper())
    num = re.sub(r"^(MGT|MGMT)\s*(\d)", r"\1 \2", num)
    rows = _rows(
        f"select {SUMMARY_COLS}, course_description, faculty_bio, syllabus, old_syllabus from courses where upper(course_number) = ? order by section",
        (num,),
    )
    for r in rows:
        r["course_description"] = _clip(r["course_description"], 1500)
        r["faculty_bio"] = _clip(r["faculty_bio"], 500)
        r["syllabus"] = r.pop("syllabus") or r.pop("old_syllabus") or ""
        r.pop("old_syllabus", None)
    return rows


def courses_by_instructor(name: str) -> list[dict]:
    """Sections taught by anyone whose name matches (first or last name, any order)."""
    words = [w for w in re.split(r"[\s,]+", name.strip()) if w][:4]
    if not words:
        return []
    where = " and ".join("faculty_1 like ?" for _ in words)
    return _rows(f"select {SUMMARY_COLS} from courses where {where} order by course_number, section limit 25", tuple(f"%{w}%" for w in words))


def filter_courses(category: str = "", session: str = "", day: str = "", room: str = "", limit: int = 25) -> list[dict]:
    """Sections filtered by any of: category, session (fall / fall-1 / fall-2), meeting day (Mo..Fr), room."""
    clauses, params = [], []
    if category:
        clauses.append("course_category like ?")
        params.append(f"%{category}%")
    if session:
        clauses.append("course_session = ?")
        params.append(session.strip().lower())
    if day:
        clauses.append("timings_day like ?")
        params.append(f"%{day.strip()[:2].title()}%")
    if room:
        clauses.append("room like ?")
        params.append(f"%{room.strip()}%")
    where = " and ".join(clauses) or "1=1"
    return _rows(f"select {SUMMARY_COLS} from courses where {where} order by course_number, section limit ?", (*params, max(1, min(limit, 40))))


def categories() -> list[dict]:
    return _rows("select course_category as category, count(*) as sections from courses where course_category <> '' group by 1 order by 2 desc")
