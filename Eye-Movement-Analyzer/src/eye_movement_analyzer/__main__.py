from __future__ import annotations

import asyncio
import logging

from .client import EyeMovementAnalyzerClient
from .config import EyeMovementAnalyzerConfig


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = EyeMovementAnalyzerConfig.from_env()
    client = EyeMovementAnalyzerClient(config)
    asyncio.run(client.run_forever())


if __name__ == "__main__":
    main()
