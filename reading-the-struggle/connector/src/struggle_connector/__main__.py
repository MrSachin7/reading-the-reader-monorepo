from __future__ import annotations

import asyncio
import logging

from .client import StruggleConnectorClient
from .config import StruggleConnectorConfig


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = StruggleConnectorConfig.from_env()
    client = StruggleConnectorClient(config)
    asyncio.run(client.run_forever())


if __name__ == "__main__":
    main()
