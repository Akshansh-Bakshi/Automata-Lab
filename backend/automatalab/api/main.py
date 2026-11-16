import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from automatalab import __version__
from automatalab.api.errors import register_exception_handlers
from automatalab.api.middleware import RequestBodyLimitMiddleware
from automatalab.api.routes.examples import router as examples_router
from automatalab.api.routes.health import router as health_router
from automatalab.api.routes.nfa import router as nfa_router
from automatalab.api.routes.simulate import router as simulate_router


def create_app() -> FastAPI:
    """Create and configure the AutomataLab API."""

    application = FastAPI(title="AutomataLab API", version=__version__)
    register_exception_handlers(application)
    application.add_middleware(RequestBodyLimitMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router, prefix="/api")
    application.include_router(examples_router, prefix="/api")
    application.include_router(nfa_router, prefix="/api")
    application.include_router(simulate_router, prefix="/api")
    return application


app = create_app()

