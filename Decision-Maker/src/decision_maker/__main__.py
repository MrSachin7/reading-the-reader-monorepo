from __future__ import annotations

import asyncio
import logging

from .client import DecisionMakerClient
from .config import DecisionMakerConfig


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = DecisionMakerConfig.from_env()
    client = DecisionMakerClient(config)
    asyncio.run(client.run_forever())


if __name__ == "__main__":
    main()
