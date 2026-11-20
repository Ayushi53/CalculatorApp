import ast
import math
import operator
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DATABASE_PATH = Path(
    os.environ.get("CALCULATOR_DATABASE_PATH", Path(__file__).with_name("calculator.db"))
)
MAX_EXPRESSION_LENGTH = 200
MAX_POWER = 100

OPERATORS: dict[type[ast.operator], Any] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
}
UNARY_OPERATORS: dict[type[ast.unaryop], Any] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

app = FastAPI(title="Calculator API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CalculationRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=MAX_EXPRESSION_LENGTH)


class CalculationResponse(BaseModel):
    id: int
    expression: str
    result: str
    created_at: str


def _initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expression TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def _evaluate_node(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _evaluate_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp):
        if isinstance(node.op, ast.Pow):
            left = _evaluate_node(node.left)
            right = _evaluate_node(node.right)
            if abs(right) > MAX_POWER:
                raise ValueError("Exponents must be between -100 and 100.")
            if abs(left) > 1_000_000_000:
                raise ValueError("The number is too large.")
            return operator.pow(left, right)
        operation = OPERATORS.get(type(node.op))
        if operation is None:
            raise ValueError("This operator is not supported.")
        return operation(_evaluate_node(node.left), _evaluate_node(node.right))
    if isinstance(node, ast.UnaryOp):
        operation = UNARY_OPERATORS.get(type(node.op))
        if operation is None:
            raise ValueError("This operator is not supported.")
        return operation(_evaluate_node(node.operand))
    raise ValueError("Enter a valid arithmetic expression.")


def evaluate_expression(expression: str) -> float:
    if not expression.strip():
        raise ValueError("Enter an expression.")
    if len(expression) > MAX_EXPRESSION_LENGTH:
        raise ValueError("The expression is too long.")
    try:
        parsed = ast.parse(expression, mode="eval")
        result = _evaluate_node(parsed)
    except (SyntaxError, TypeError, ZeroDivisionError, OverflowError) as error:
        raise ValueError("Enter a valid expression without dividing by zero.") from error
    if not isinstance(result, (int, float)) or not math.isfinite(result):
        raise ValueError("The result is outside the supported range.")
    return float(result)


def _format_result(result: float) -> str:
    if result.is_integer():
        return str(int(result))
    return format(result, ".12g")


@app.on_event("startup")
def initialize_database() -> None:
    _initialize_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    print("Done with health Check")
    return {"status": "ok"}


@app.post("/api/calculate", response_model=CalculationResponse)
def calculate(request: CalculationRequest) -> CalculationResponse:
    try:
        value = evaluate_expression(request.expression)
        result = _format_result(value)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    created_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DATABASE_PATH) as connection:
        cursor = connection.execute(
            "INSERT INTO calculations (expression, result, created_at) VALUES (?, ?, ?)",
            (request.expression, result, created_at),
        )
        calculation_id = cursor.lastrowid

    return CalculationResponse(
        id=calculation_id,
        expression=request.expression,
        result=result,
        created_at=created_at,
    )


@app.get("/api/history", response_model=list[CalculationResponse])
def history(limit: int = Query(default=20, ge=1, le=100)) -> list[CalculationResponse]:
    with sqlite3.connect(DATABASE_PATH) as connection:
        rows = connection.execute(
            """
            SELECT id, expression, result, created_at
            FROM calculations
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        CalculationResponse(
            id=row[0], expression=row[1], result=row[2], created_at=row[3]
        )
        for row in rows
    ]
