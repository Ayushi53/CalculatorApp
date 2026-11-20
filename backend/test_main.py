import unittest

from main import evaluate_expression


class EvaluateExpressionTests(unittest.TestCase):
    def test_arithmetic_and_precedence(self):
        self.assertEqual(evaluate_expression("2 + 3 * 4"), 14)

    def test_parentheses_and_unary_operators(self):
        self.assertEqual(evaluate_expression("-(2 + 3) * 2"), -10)

    def test_rejects_unsupported_python_expressions(self):
        with self.assertRaises(ValueError):
            evaluate_expression("__import__('os').system('whoami')")

    def test_rejects_division_by_zero(self):
        with self.assertRaises(ValueError):
            evaluate_expression("1 / 0")

    def test_limits_exponents(self):
        with self.assertRaises(ValueError):
            evaluate_expression("2 ** 101")


if __name__ == "__main__":
    unittest.main()
