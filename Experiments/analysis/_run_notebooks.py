"""Execute the analysis notebooks in place (populates outputs/ and cell outputs).

    python _build_notebooks.py && python _run_notebooks.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import nbformat as nbf
from nbclient import NotebookClient

HERE = Path(__file__).resolve().parent
ORDER = ["00_load", "01_sensing_quality", "02_latency", "03_context_preservation", "04_modularity_degradation"]


def main():
    names = sys.argv[1:] or ORDER
    for name in names:
        path = HERE / f"{name}.ipynb"
        node = nbf.read(path, as_version=4)
        client = NotebookClient(node, timeout=600, kernel_name="python3",
                                resources={"metadata": {"path": str(HERE)}})
        client.execute()
        nbf.write(node, path)
        print(f"executed {name}")


if __name__ == "__main__":
    main()
