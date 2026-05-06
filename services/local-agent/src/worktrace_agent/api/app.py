from fastapi import FastAPI

from worktrace_agent import __version__
from worktrace_agent.api.routes.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="WorkTrace Local Agent",
        version=__version__,
    )
    app.include_router(health_router)
    return app


app = create_app()
