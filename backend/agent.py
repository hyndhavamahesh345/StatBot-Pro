import os
import uuid
import asyncio
import json
import traceback
from pathlib import Path

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.outputs import LLMResult

load_dotenv()

# ─── Paths ────────────────────────────────────────────────────────────────────
WORKING_DIR = Path(os.getenv("WORKING_DIR", "./workspace")).resolve()
CHARTS_DIR  = Path(os.getenv("CHARTS_DIR",  "./workspace/charts")).resolve()
WORKING_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", 10))

# ─── Blocked patterns (sandbox) ───────────────────────────────────────────────
BLOCKED_PATTERNS = [
    "os.system", "subprocess", "shutil.rmtree",
    "__import__", "importlib",
    "socket", "requests", "urllib", "http",
    "glob.glob", "os.remove", "os.unlink",
    "os.rmdir", "os.makedirs",
    "sys.exit", "quit(", "exit(",
]


def _sanitize_code(code: str) -> tuple[bool, str]:
    lower = code.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in lower:
            return False, f"Blocked pattern detected: `{pattern}`"
    return True, ""


def _get_chart_save_prefix(chart_id: str) -> str:
    """Returns Python code prefix that patches plt.show() to auto-save PNGs."""
    safe_dir = str(CHARTS_DIR).replace("\\", "/")
    chart_path = f"{safe_dir}/{chart_id}.png"
    return (
        f"import matplotlib\nmatplotlib.use('Agg')\n"
        f"import matplotlib.pyplot as plt\n"
        f"import pandas as pd\nimport numpy as np\n"
        f"_CHART_PATH = r'{chart_path}'\n"
        f"def _patched_show(*args, **kwargs):\n"
        f"    plt.savefig(_CHART_PATH, bbox_inches='tight', dpi=150)\n"
        f"    plt.close('all')\n"
        f"plt.show = _patched_show\n\n"
    )


# ─── Streaming callback ────────────────────────────────────────────────────────
class StreamingThoughtHandler(BaseCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        super().__init__()
        self.queue = queue

    def _put(self, event: dict):
        try:
            self.queue.put_nowait(json.dumps(event))
        except Exception:
            pass

    def on_chain_start(self, serialized, inputs, **kwargs):
        self._put({"type": "chain_start", "content": "🔗 Agent chain started…"})

    def on_tool_start(self, serialized, input_str, **kwargs):
        tool_name = serialized.get("name", "tool") if serialized else "tool"
        self._put({
            "type": "tool_start",
            "tool": tool_name,
            "content": f"🛠️ Using tool: **{tool_name}**\n```python\n{input_str}\n```"
        })

    def on_tool_end(self, output, **kwargs):
        preview = str(output)[:600]
        self._put({"type": "tool_end", "content": f"📊 Tool output:\n```\n{preview}\n```"})

    def on_tool_error(self, error, **kwargs):
        self._put({"type": "error", "content": f"❌ Tool error: {str(error)}"})

    def on_llm_start(self, serialized, prompts, **kwargs):
        self._put({"type": "llm_start", "content": "🤔 Gemini is reasoning…"})

    def on_llm_end(self, response: LLMResult, **kwargs):
        text = ""
        if response.generations:
            text = str(response.generations[0][0].text)[:300]
        self._put({"type": "llm_end", "content": f"💬 Model response: {text}"})

    def on_agent_action(self, action, **kwargs):
        self._put({"type": "agent_action", "content": f"⚡ Action: **{action.tool}**"})

    def on_agent_finish(self, finish, **kwargs):
        self._put({"type": "agent_finish", "content": "✅ Agent finished."})

    def on_chain_error(self, error, **kwargs):
        self._put({"type": "error", "content": f"❌ Chain error: {str(error)}"})


# ─── Sandboxed Python REPL ────────────────────────────────────────────────────
class SandboxedPythonREPL:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self._chart_id: str | None = None
        self._namespace: dict = {}
        self._init_namespace()

    def _init_namespace(self):
        import numpy as np
        try:
            import seaborn as sns
        except ImportError:
            sns = None
        self._namespace = {
            "df": self.df.copy(),
            "pd": pd,
            "np": np,
            "plt": plt,
            "matplotlib": matplotlib,
            "print": print,
        }
        if sns:
            self._namespace["sns"] = sns

    def run(self, code: str) -> str:
        safe, reason = _sanitize_code(code)
        if not safe:
            return f"[SANDBOX BLOCKED] {reason}"

        self._chart_id = str(uuid.uuid4())
        prefix = _get_chart_save_prefix(self._chart_id)
        full_code = prefix + code

        import io, contextlib
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(full_code, self._namespace)  # noqa: S102
            output = buf.getvalue().strip() or "<code executed, no output>"
        except Exception:
            output = traceback.format_exc()
            self._chart_id = None

        return output

    @property
    def last_chart_path(self) -> Path | None:
        if not self._chart_id:
            return None
        p = CHARTS_DIR / f"{self._chart_id}.png"
        return p if p.exists() else None


# ─── Agent builder ─────────────────────────────────────────────────────────────
def build_agent(df: pd.DataFrame, repl: SandboxedPythonREPL, callback):
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        temperature=0,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        convert_system_message_to_human=True,
    )

    prefix = (
        "You are StatBot Pro, an expert data analyst AI.\n"
        "You have access to a pandas DataFrame called `df` which contains the user's data.\n"
        "Rules:\n"
        "1. Always inspect the data first with df.head(), df.dtypes, df.describe().\n"
        "2. Write clean pandas/numpy/matplotlib code to answer the question.\n"
        "3. For charts, ALWAYS call plt.show() — it auto-saves the chart.\n"
        "4. Provide a clear text summary of your findings.\n"
        "5. If code fails, self-correct and try again.\n"
        "6. NEVER use os, subprocess, open(), eval(), or any file-system operations."
    )

    agent = create_pandas_dataframe_agent(
        llm=llm,
        df=df,
        verbose=True,
        max_iterations=MAX_ITERATIONS,
        prefix=prefix,
        allow_dangerous_code=True,
        agent_executor_kwargs={"handle_parsing_errors": True},
    )

    # Monkey-patch the python_repl tool to use our sandbox
    for tool in agent.tools:
        if "python" in tool.name.lower() or "repl" in tool.name.lower():
            tool.func = repl.run
            break

    return agent


# ─── Public entrypoint ────────────────────────────────────────────────────────
async def run_analysis(
    df: pd.DataFrame,
    question: str,
    queue: asyncio.Queue,
) -> dict:
    repl = SandboxedPythonREPL(df)
    callback = StreamingThoughtHandler(queue)
    agent = build_agent(df, repl, callback)

    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(
            None,
            lambda: agent.invoke(
                {"input": question},
                config={"callbacks": [callback]},
            ),
        )
        answer = result.get("output", "No answer returned.")
    except Exception as e:
        answer = f"Agent error: {e}"
        queue.put_nowait(json.dumps({"type": "error", "content": str(e)}))

    chart_url = None
    if repl.last_chart_path:
        chart_url = f"/charts/{repl.last_chart_path.name}"

    queue.put_nowait(None)  # sentinel
    return {"answer": answer, "chart_url": chart_url}
