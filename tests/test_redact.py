import json
import unittest
from lambda_functions.redact import lambda_handler

class TestRedact(unittest.TestCase):
    def test_lambda_handler(self):
        event = {
            'body': json.dumps({'text': 'John Doe email@example.com'}),
            'headers': {'x-api-key': 'test-key'}
        }
        context = {}
        response = lambda_handler(event, context)
        self.assertEqual(response['statusCode'], 200)
        # Check redaction

if __name__ == '__main__':
    unittest.main()